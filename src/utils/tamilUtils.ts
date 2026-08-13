// =====================================================================
// Tamil rendering for jsPDF — image-snapshot strategy.
//
// jsPDF has no OpenType shaper, so any attempt to draw Tamil with
// doc.text() either mis-renders combining marks or forces us into a
// legacy 8-bit font (Bamini etc.) with brittle hand-built mappings.
// Instead, we render each Tamil line into an offscreen <canvas> using
// the bundled Noto Sans Tamil web font (which goes through the
// browser's real text shaper) and embed the resulting bitmap in the
// PDF via doc.addImage(). The output is pixel-perfect Tamil at the
// cost of a tiny bit of file size.
//
// Public surface:
//   • ensureTamilWebFont()      — load Noto Sans Tamil into the page
//   • wrapTamilLine()           — width-aware line wrapping in mm
//   • renderTamilImage()        — text → { dataUrl, widthMm, heightMm }
// =====================================================================

const TAMIL_WEBFONT_URL = '/fonts/NotoSansTamil-Regular.ttf';
const TAMIL_WEBFONT_FAMILY = 'NotoSansTamilEmbedded';

// Conversion constants. Canvas pixels are CSS pixels at 96 DPI.
// jsPDF font sizes are in points (1 pt = 1/72 in). 1 in = 25.4 mm.
const PT_TO_PX = 96 / 72;        // ≈ 1.3333
const MM_PER_PX = 25.4 / 96;     // ≈ 0.2646

// Supersample factor — render the canvas at 3× the target resolution
// so the embedded PNG looks crisp when jsPDF scales it down.
const RENDER_SCALE = 3;

let webFontPromise: Promise<void> | null = null;

/**
 * Load Noto Sans Tamil into the document's font set so canvas can use
 * it for shaping. Idempotent — subsequent calls share the same promise.
 *
 * Resolves silently on success; rejects on fetch / decode failure so
 * callers can fall back to drawing English in the Tamil block.
 */
export const ensureTamilWebFont = async (): Promise<void> => {
  if (webFontPromise) return webFontPromise;
  webFontPromise = (async () => {
    // Skip if the page already has a face with this family registered.
    for (const f of (document.fonts as unknown as Iterable<FontFace>)) {
      if (f.family === TAMIL_WEBFONT_FAMILY) return;
    }
    const face = new FontFace(
      TAMIL_WEBFONT_FAMILY,
      `url(${TAMIL_WEBFONT_URL})`,
    );
    await face.load();
    document.fonts.add(face);
    console.log('[Tamil] Noto Sans Tamil web font loaded for canvas rendering');
  })();
  return webFontPromise;
};

/** Internal canvas reused across calls — cheaper than allocating one per line. */
let measureCanvas: HTMLCanvasElement | null = null;
const getMeasureContext = (): CanvasRenderingContext2D => {
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  return measureCanvas.getContext('2d')!;
};

/**
 * Build the canvas font shorthand for a given PDF font size (in pt),
 * already multiplied by the supersample factor.
 */
const buildCanvasFont = (fontSizePt: number, bold: boolean): string => {
  const fontPx = fontSizePt * PT_TO_PX * RENDER_SCALE;
  return `${bold ? 'bold ' : ''}${fontPx}px "${TAMIL_WEBFONT_FAMILY}", sans-serif`;
};

/**
 * Width-aware line wrapping. Splits `text` on whitespace and packs as
 * many words as fit within `maxWidthMm` per line, returning the wrapped
 * lines in order. Words longer than the max width are emitted on their
 * own line and allowed to overflow rather than getting hard-broken.
 */
export const wrapTamilLine = (
  text: string,
  maxWidthMm: number,
  fontSizePt: number,
  bold = false,
): string[] => {
  if (!text) return [];
  const ctx = getMeasureContext();
  ctx.font = buildCanvasFont(fontSizePt, bold);

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const widthOf = (s: string): number => {
    const px = ctx.measureText(s).width;
    return (px / RENDER_SCALE) * MM_PER_PX;
  };

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate) > maxWidthMm && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
};

export interface TamilImage {
  /** PNG data URL ready for jsPDF.addImage(). */
  dataUrl: string;
  /** Natural width in millimetres (use as the `w` arg to addImage). */
  widthMm: number;
  /** Natural height in millimetres (use as the `h` arg to addImage). */
  heightMm: number;
}

/**
 * Render a single Tamil line into an offscreen canvas using the loaded
 * web font, and return a PNG data URL plus its mm dimensions ready to
 * pass to jsPDF.addImage().
 *
 * The canvas is supersampled at RENDER_SCALE for crisp PDF output. The
 * caller is responsible for line wrapping (use wrapTamilLine) and for
 * tracking vertical position in the PDF.
 *
 * @param text         Tamil Unicode text — should be a single visual line
 * @param fontSizePt   Target PDF font size in points
 * @param colorRgb     Stroke / fill colour as { r, g, b }, 0–255
 * @param bold         Whether to render in bold weight
 */
export const renderTamilImage = (
  text: string,
  fontSizePt: number,
  colorRgb: { r: number; g: number; b: number },
  bold = false,
): TamilImage => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = buildCanvasFont(fontSizePt, bold);

  // First pass: measure on a throw-away context (we have to set the
  // font on the actual draw context AFTER sizing the canvas, since
  // resizing wipes context state).
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const fontPx = fontSizePt * PT_TO_PX * RENDER_SCALE;
  const ascent =
    (metrics as TextMetrics).actualBoundingBoxAscent || fontPx * 0.85;
  const descent =
    (metrics as TextMetrics).actualBoundingBoxDescent || fontPx * 0.35;
  const padding = Math.ceil(RENDER_SCALE * 4);

  canvas.width = Math.max(1, Math.ceil(metrics.width) + padding * 2);
  canvas.height = Math.max(1, Math.ceil(ascent + descent) + padding * 2);

  // Re-apply font + colour after the resize.
  ctx.font = font;
  ctx.fillStyle = `rgb(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b})`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, padding, padding + ascent);

  const dataUrl = canvas.toDataURL('image/png');
  const widthMm = (canvas.width / RENDER_SCALE) * MM_PER_PX;
  const heightMm = (canvas.height / RENDER_SCALE) * MM_PER_PX;

  return { dataUrl, widthMm, heightMm };
};

// =====================================================================
// English -> Tamil transliteration via Google Input Tools.
//
// We send each non-empty line as ONE request so the engine has full
// line context — that produces dramatically better lyric quality than
// word-by-word lookups. Lines are deduplicated and cached, and fetched
// in parallel with a small concurrency cap.
// =====================================================================

const GOOGLE_INPUT_TOOLS_URL = 'https://inputtools.google.com/request';

const lineCache = new Map<string, string>();

const fetchLineTransliteration = async (chunk: string): Promise<string | null> => {
  try {
    const url =
      `${GOOGLE_INPUT_TOOLS_URL}?text=${encodeURIComponent(chunk)}` +
      `&itc=ta-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Expected shape: ["SUCCESS", [[ "input", ["தமிழ் வரி"], ... ]]]
    if (
      Array.isArray(data) &&
      data[0] === 'SUCCESS' &&
      Array.isArray(data[1]) &&
      data[1][0] &&
      Array.isArray(data[1][0][1]) &&
      typeof data[1][0][1][0] === 'string'
    ) {
      return data[1][0][1][0];
    }
    return null;
  } catch (error) {
    console.error(`[Tamil] Transliteration HTTP failed for "${chunk}":`, error);
    return null;
  }
};

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await task(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
};

/**
 * Transliterate English-script text to Tamil Unicode using Google Input
 * Tools, line by line. Empty lines / lines with no Latin letters are
 * passed through unchanged. On failure for any individual line we keep
 * the original English so the block still renders something.
 */
export const transliterateToTamil = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return text;

  const lines = text.split('\n');

  // Collect unique non-empty lines that need a network fetch.
  const linesToFetch = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !/[A-Za-z]/.test(trimmed)) continue;
    if (!lineCache.has(trimmed.toLowerCase())) {
      linesToFetch.add(trimmed);
    }
  }

  if (linesToFetch.size > 0) {
    const list = Array.from(linesToFetch);
    const results = await runWithConcurrency(list, 4, fetchLineTransliteration);
    list.forEach((line, idx) => {
      const tamil = results[idx];
      if (tamil) {
        lineCache.set(line.toLowerCase(), tamil);
      }
    });
  }

  // Rebuild the text, preserving each line's leading whitespace.
  return lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || !/[A-Za-z]/.test(trimmed)) return line;
      const tamil = lineCache.get(trimmed.toLowerCase());
      if (!tamil) return line;
      const leading = line.match(/^\s*/)?.[0] ?? '';
      return leading + tamil;
    })
    .join('\n');
};
