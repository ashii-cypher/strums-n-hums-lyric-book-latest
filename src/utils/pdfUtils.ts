
import jsPDF from 'jspdf';
import { Song } from '../data/songs';
import { getTemplateData } from './templateUtils';
import { base64ToUtf8 } from '../lib/utils';
import {
  getPdfOptions,
  PdfOptions,
  DEFAULT_HEADING_FONT_SIZE,
  DEFAULT_BODY_FONT_SIZE,
} from '../components/PDFOptions';
import {
  ensureTamilWebFont,
  renderTamilImage,
  transliterateToTamil,
  wrapTamilLine,
  type TamilImage,
} from './tamilUtils';

// Helper function to decode base64 to string
const decodeFromBase64 = (base64: string): string => {
  return base64ToUtf8(base64);
};

export interface PdfPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Logo path for the first page of the PDF
const LOGO_PATH = "/uploads/1c578e45-7eb7-48b7-91bf-237ccf296b4a.png";

// Default padding if not provided
const defaultPadding: PdfPadding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
};

// Get padding settings from template selector
let getPaddingSettings: () => PdfPadding;
try {
  // Dynamic import to avoid circular dependency
  import('../components/TemplateSelector').then(module => {
    getPaddingSettings = module.getPaddingSettings;
  });
} catch (error) {
  // Fallback to default padding if there's an error
  getPaddingSettings = () => defaultPadding;
}

// Convert "#rrggbb" to {r,g,b}. Falls back to black on bad input.
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

export const generateLyricsPDF = async (songs: Song[], customPadding?: PdfPadding): Promise<void> => {
  if (songs.length === 0) return;

  // Use custom padding if provided, otherwise use global settings or default
  const padding = customPadding || (getPaddingSettings ? getPaddingSettings() : defaultPadding);

  // Read user-selected PDF options (Tamil toggle, heading/body colors,
  // heading/body font sizes).
  const options: PdfOptions = getPdfOptions();
  const headingRgb = hexToRgb(options.headingColor);
  const bodyRgb = hexToRgb(options.bodyColor);

  // Font sizes (in PDF points) come from the user's slider settings,
  // falling back to the historical defaults if either is missing.
  const headingFontSize = options.headingFontSize ?? DEFAULT_HEADING_FONT_SIZE;
  const bodyFontSize = options.bodyFontSize ?? DEFAULT_BODY_FONT_SIZE;

  // Derived line-heights in mm. The ratios below preserve the current
  // defaults exactly: at 20 pt heading the line height stays 10 mm,
  // at 12 pt body it stays 7 mm. As the user drags the slider these
  // scale linearly so headings/lyrics stay readable without overlap.
  const titleLineHeight = (headingFontSize / DEFAULT_HEADING_FONT_SIZE) * 10;
  const titleTrailingGap = titleLineHeight;
  const bodyLineHeight = (bodyFontSize / DEFAULT_BODY_FONT_SIZE) * 7;
  const bodySoftLineHeight = (bodyFontSize / DEFAULT_BODY_FONT_SIZE) * 5;

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // If Tamil mode is on, load Noto Sans Tamil into the page (so the
  // canvas snapshot has a real Tamil shaper to work with) and
  // transliterate every song's title + lyrics into Tamil Unicode. The
  // Tamil strings are kept as-is — the actual rendering happens at
  // draw time via renderTamilImage() → doc.addImage().
  let tamilFontReady = false;
  const tamilLyricsBySongId: Record<string, string> = {};
  const tamilTitleBySongId: Record<string, string> = {};
  if (options.tamilEnabled) {
    console.log('[PDF] Tamil mode enabled — loading web font and transliterating…');
    try {
      await ensureTamilWebFont();
      tamilFontReady = true;
    } catch (error) {
      console.error('[PDF] Tamil web font failed to load:', error);
      tamilFontReady = false;
    }
    console.log('[PDF] Tamil web font ready:', tamilFontReady);

    if (tamilFontReady) {
      for (const song of songs) {
        const decoded = decodeFromBase64(song.lyrics);
        // Transliterate title and lyrics independently so a failure on
        // one doesn't kill the other. Each helper already has its own
        // try/catch and returns the original English on failure.
        try {
          tamilLyricsBySongId[song.id] = await transliterateToTamil(decoded);
        } catch (error) {
          console.error(`[PDF] Failed to transliterate lyrics for "${song.title}":`, error);
          tamilLyricsBySongId[song.id] = decoded; // raw English fallback
        }
        try {
          tamilTitleBySongId[song.id] = await transliterateToTamil(song.title);
        } catch (error) {
          console.error(`[PDF] Failed to transliterate title for "${song.title}":`, error);
          tamilTitleBySongId[song.id] = song.title;
        }
        console.log(
          `[PDF] Transliterated "${song.title}" — lyrics len:`,
          tamilLyricsBySongId[song.id]?.length ?? 0,
        );
      }
    }
  }

  // Get page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Apply the selected template as background to the first page
  const templateBase64 = await getTemplateData();
  if (templateBase64) {
    try {
      // Add the background to the first page
      doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error("Error adding template background to first page:", error);
    }
  }

  // Add the logo to the first page (on top of template)
  addLogoToFirstPage(doc, pageWidth, pageHeight);

  // Calculate usable area based on padding
  const usableWidth = pageWidth - padding.left - padding.right;

  // If a Table of Contents is requested, reserve enough blank pages
  // between the cover and the song body to fit one entry per song. We
  // render the actual TOC content in a second pass after the song body
  // is laid out, so each entry can link to its real page number.
  const tocLineHeight = (bodyFontSize / DEFAULT_BODY_FONT_SIZE) * 7;
  const tocHeaderBlock = titleLineHeight + titleTrailingGap;
  const tocFirstPageCapacity = Math.max(
    1,
    Math.floor(
      (pageHeight - padding.top - padding.bottom - tocHeaderBlock) / tocLineHeight,
    ),
  );
  const tocContPageCapacity = Math.max(
    1,
    Math.floor((pageHeight - padding.top - padding.bottom) / tocLineHeight),
  );
  let tocPageCount = 0;
  if (options.tocEnabled) {
    if (songs.length <= tocFirstPageCapacity) {
      tocPageCount = 1;
    } else {
      tocPageCount =
        1 + Math.ceil((songs.length - tocFirstPageCapacity) / tocContPageCapacity);
    }
  }

  // Reserve the TOC pages now, with the same template background as
  // every other page. The first reserved TOC page becomes page 2.
  for (let i = 0; i < tocPageCount; i++) {
    doc.addPage();
    if (templateBase64) {
      try {
        doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
      } catch (error) {
        console.error('Error adding template background to TOC page:', error);
      }
    }
  }

  // Start the next page for song content (page 2 if no TOC, or
  // page 2 + tocPageCount if a TOC was reserved above).
  doc.addPage();

  // Apply the selected template as background to the first song page
  if (templateBase64) {
    try {
      doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error("Error adding template background:", error);
    }
  }

  // Tracks the absolute PDF page number where each song begins, so the
  // TOC second pass can build clickable links pointing at the right page.
  const songStartPages = new Map<string, number>();

  // Starting position respecting top padding
  let yPosition = padding.top;

  // Helper: ensure there's room for the next line, otherwise add a new page.
  const ensureRoom = (lineHeight: number) => {
    if (yPosition + lineHeight > pageHeight - padding.bottom) {
      doc.addPage();
      yPosition = padding.top;
      if (templateBase64) {
        try {
          doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
        } catch (error) {
          console.error("Error adding template background to new page:", error);
        }
      }
    }
  };

  // Helper: render an English song title (Helvetica bold) at the
  // current yPosition. The Tamil counterpart goes through the
  // image-snapshot path — see renderTamilTitleImage below.
  const renderTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(headingFontSize);
    doc.setTextColor(headingRgb.r, headingRgb.g, headingRgb.b);

    const titleLines = doc.splitTextToSize(title, usableWidth);
    titleLines.forEach((line: string) => {
      ensureRoom(titleLineHeight);
      const titleLineWidth =
        (doc.getStringUnitWidth(line) * headingFontSize) / doc.internal.scaleFactor;
      const titleX = padding.left + (usableWidth - titleLineWidth) / 2;
      doc.text(line, titleX, yPosition);
      yPosition += titleLineHeight;
    });
    yPosition += titleTrailingGap;
  };

  // Helper: render an English lyrics block (Helvetica) at the current
  // yPosition. The Tamil counterpart is rendered via image snapshots —
  // see renderTamilLyricsImages below.
  const renderLyrics = (lyrics: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(bodyRgb.r, bodyRgb.g, bodyRgb.b);

    const lyricsLines = lyrics.split('\n');

    lyricsLines.forEach(line => {
      if (line.trim().length > 0) {
        const wrappedLines = doc.splitTextToSize(line, usableWidth);

        wrappedLines.forEach((wrappedLine: string, wIdx: number) => {
          ensureRoom(bodyLineHeight);
          const lineWidth =
            (doc.getStringUnitWidth(wrappedLine) * bodyFontSize) /
            doc.internal.scaleFactor;
          const lineX = padding.left + (usableWidth - lineWidth) / 2;
          doc.text(wrappedLine, lineX, yPosition);

          if (wIdx < wrappedLines.length - 1) {
            yPosition += bodySoftLineHeight;
          }
        });

        yPosition += bodyLineHeight;
      } else {
        yPosition += bodyLineHeight;
      }
    });
  };

  // Helper: paint a single Tamil snapshot image, centred horizontally
  // on the page, advancing yPosition by `lineHeightMm` (the leading we
  // want for this kind of text — title vs lyrics).
  const drawTamilImage = (img: TamilImage, lineHeightMm: number) => {
    ensureRoom(Math.max(img.heightMm, lineHeightMm));
    const x = padding.left + (usableWidth - img.widthMm) / 2;
    try {
      doc.addImage(img.dataUrl, 'PNG', x, yPosition, img.widthMm, img.heightMm);
    } catch (error) {
      console.error('[PDF] Failed to embed Tamil snapshot:', error);
    }
    yPosition += Math.max(img.heightMm, lineHeightMm);
  };

  // Helper: render a Tamil title via canvas snapshot. Wraps to fit the
  // usable PDF width, centres each wrapped line, and updates yPosition.
  const renderTamilTitleImage = (tamilTitle: string) => {
    const trimmed = tamilTitle.trim();
    if (!trimmed) return;
    const lines = wrapTamilLine(trimmed, usableWidth, headingFontSize, false);
    for (const line of lines) {
      const img = renderTamilImage(line, headingFontSize, headingRgb, false);
      drawTamilImage(img, titleLineHeight);
    }
    yPosition += titleTrailingGap; // trailing gap matches renderTitle
  };

  // Helper: render a Tamil lyrics block via canvas snapshots, line by
  // line. Empty lines preserve the same vertical gap as the English
  // path, so the two blocks line up visually.
  const renderTamilLyricsImages = (tamilLyrics: string) => {
    const sourceLines = tamilLyrics.split('\n');
    for (const line of sourceLines) {
      if (line.trim().length === 0) {
        yPosition += bodyLineHeight;
        continue;
      }
      const wrapped = wrapTamilLine(line.trim(), usableWidth, bodyFontSize, false);
      for (const wrappedLine of wrapped) {
        const img = renderTamilImage(wrappedLine, bodyFontSize, bodyRgb, false);
        drawTamilImage(img, bodyLineHeight);
      }
    }
  };

  // Helper: draw the divider between consecutive song sections.
  const renderDivider = () => {
    yPosition += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(padding.left, yPosition, pageWidth - padding.right, yPosition);
    yPosition += 25;
    ensureRoom(10);
  };

  // Process each song
  for (let index = 0; index < songs.length; index++) {
    const song = songs[index];

    // Record the page this song starts on so the TOC can link to it.
    songStartPages.set(song.id, doc.getCurrentPageInfo().pageNumber);

    // English title + lyrics (Helvetica)
    renderTitle(song.title);
    const decodedLyrics = decodeFromBase64(song.lyrics);
    renderLyrics(decodedLyrics);

    // Tamil block — rendered as canvas image snapshots so the
    // browser's text shaper handles all the combining marks correctly.
    if (options.tamilEnabled && tamilFontReady) {
      const tamilLyrics = tamilLyricsBySongId[song.id];
      const tamilTitle = tamilTitleBySongId[song.id] || song.title;
      if (tamilLyrics && tamilLyrics.trim().length > 0) {
        console.log(`[PDF] Rendering Tamil snapshot block for "${song.title}"`);
        renderDivider();
        renderTamilTitleImage(tamilTitle);
        renderTamilLyricsImages(tamilLyrics);
      } else {
        console.warn(
          `[PDF] No Tamil lyrics to render for "${song.title}" — skipping Tamil block`,
        );
      }
    }

    // Divider before the next song
    if (index < songs.length - 1) {
      renderDivider();
    } else {
      yPosition += 15;
    }
  }

  // Second pass: fill the reserved TOC pages with one clickable entry
  // per song. We jump to the first reserved TOC page (always page 2)
  // and walk forward, breaking onto the next reserved page when the
  // current one is full.
  if (options.tocEnabled && tocPageCount > 0) {
    let currentTocPage = 2;
    doc.setPage(currentTocPage);
    let tocY = padding.top;

    // "Table of Contents" header on the first TOC page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(headingFontSize);
    doc.setTextColor(headingRgb.r, headingRgb.g, headingRgb.b);
    const headerText = 'Table of Contents';
    const headerWidth =
      (doc.getStringUnitWidth(headerText) * headingFontSize) /
      doc.internal.scaleFactor;
    tocY += titleLineHeight;
    doc.text(headerText, padding.left + (usableWidth - headerWidth) / 2, tocY);
    tocY += titleTrailingGap;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(bodyRgb.r, bodyRgb.g, bodyRgb.b);

    let entriesOnPage = 0;
    const dotChar = '.';
    const dotWidth =
      (doc.getStringUnitWidth(dotChar) * bodyFontSize) / doc.internal.scaleFactor;

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      const pageNum = songStartPages.get(song.id) ?? 0;
      const pageNumStr = String(pageNum);
      const pageNumWidth =
        (doc.getStringUnitWidth(pageNumStr) * bodyFontSize) /
        doc.internal.scaleFactor;

      // Build the entry label and truncate with an ellipsis if it
      // would otherwise collide with the page-number column.
      const dotGap = 4; // mm reserved for the leader + gap
      const maxLabelWidth = usableWidth - pageNumWidth - dotGap;
      let label = `${i + 1}. ${song.title}`;
      let labelWidth =
        (doc.getStringUnitWidth(label) * bodyFontSize) / doc.internal.scaleFactor;
      if (labelWidth > maxLabelWidth) {
        const ellipsis = '…';
        const ellipsisWidth =
          (doc.getStringUnitWidth(ellipsis) * bodyFontSize) /
          doc.internal.scaleFactor;
        while (label.length > 1 && labelWidth + ellipsisWidth > maxLabelWidth) {
          label = label.slice(0, -1);
          labelWidth =
            (doc.getStringUnitWidth(label) * bodyFontSize) /
            doc.internal.scaleFactor;
        }
        label = label + ellipsis;
        labelWidth =
          (doc.getStringUnitWidth(label) * bodyFontSize) /
          doc.internal.scaleFactor;
      }

      // Move to the next reserved TOC page if this one is full. The
      // first TOC page has less room because of the header.
      const capacityHere =
        currentTocPage === 2 ? tocFirstPageCapacity : tocContPageCapacity;
      if (entriesOnPage >= capacityHere) {
        currentTocPage += 1;
        doc.setPage(currentTocPage);
        tocY = padding.top;
        entriesOnPage = 0;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(bodyRgb.r, bodyRgb.g, bodyRgb.b);
      }

      // Advance to the baseline for this entry, then draw the title on
      // the left, the page number on the right, and a dotted leader
      // between them.
      tocY += tocLineHeight;
      doc.text(label, padding.left, tocY);
      doc.text(pageNumStr, pageWidth - padding.right - pageNumWidth, tocY);

      const leaderStart = padding.left + labelWidth + 1;
      const leaderEnd = pageWidth - padding.right - pageNumWidth - 1;
      if (leaderEnd > leaderStart && dotWidth > 0) {
        const numDots = Math.floor((leaderEnd - leaderStart) / dotWidth);
        if (numDots > 0) {
          doc.text(dotChar.repeat(numDots), leaderStart, tocY);
        }
      }

      // Whole-row click target that jumps to the song's first page.
      doc.link(padding.left, tocY - tocLineHeight, usableWidth, tocLineHeight, {
        pageNumber: pageNum,
      });

      entriesOnPage += 1;
    }
  }

  // Save the PDF
  doc.save('song-lyrics.pdf');
};

// Function to add the logo to the first page
const addLogoToFirstPage = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  // Create a temporary image to get dimensions
  const img = new Image();
  img.src = LOGO_PATH;

  // Set square dimensions for the logo (1:1 aspect ratio)
  const logoSize = 52; // in mm
  const logoWidth = logoSize;
  const logoHeight = logoSize;

  // Calculate position to center the logo
  const x = (pageWidth - logoWidth) / 2;
  const y = (pageHeight - logoHeight) / 2 - 10; // Slightly above center to make room for title

  // Add the logo with square dimensions
  try {
    doc.addImage(LOGO_PATH, 'PNG', x, y, logoWidth, logoHeight);

    // Add title below the logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    // const title = "Strums 'n Hums";
    // const titleWidth = doc.getStringUnitWidth(title) * 24 / doc.internal.scaleFactor;
    // const titleX = (pageWidth - titleWidth) / 2;
    // doc.text(title, titleX, y + logoSize + 20);
  } catch (error) {
    console.error("Error adding logo to PDF:", error);
  }
};
