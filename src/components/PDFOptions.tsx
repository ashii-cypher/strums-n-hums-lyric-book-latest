import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface PdfOptions {
  tamilEnabled: boolean;
  tocEnabled: boolean;
  headingColor: string;
  bodyColor: string;
  headingFontSize: number;
  bodyFontSize: number;
}

// const STORAGE_KEY = 'pdfOptions';

// These two pt values are the historical defaults of the PDF generator
// — keeping them as the slider defaults means existing users see the
// same output until they explicitly drag the slider.
export const DEFAULT_HEADING_FONT_SIZE = 20;
export const DEFAULT_BODY_FONT_SIZE = 12;

// Slider bounds. The headings have a wider upper range so very short
// titles can be made into big covers; the body is constrained tighter
// to keep lyrics legible without consuming the page.
const HEADING_FONT_MIN = 10;
const HEADING_FONT_MAX = 40;
const BODY_FONT_MIN = 8;
const BODY_FONT_MAX = 24;

export const defaultPdfOptions: PdfOptions = {
  tamilEnabled: false,
  tocEnabled: false,
  headingColor: '#000000',
  bodyColor: '#000000',
  headingFontSize: DEFAULT_HEADING_FONT_SIZE,
  bodyFontSize: DEFAULT_BODY_FONT_SIZE,
};

// In-memory store for the options. The PDF generator runs outside
// React (see pdfUtils.ts → generateLyricsPDF) and needs a way to read
// the current colours / font sizes / Tamil toggle without re-mounting
// the component, so we keep the live values in this module-scoped
// variable and expose getPdfOptions() / savePdfOptions() around it.
//
// Persistence to localStorage was removed by request — every page
// load starts from defaultPdfOptions (which has tamilEnabled: false),
// matching the new "fresh slate on reload" behaviour for padding.
let currentPdfOptions: PdfOptions = { ...defaultPdfOptions };

/**
 * Read the current PDF options. Used by the PDF generator.
 *
 * // Previously read from localStorage:
 * // try {
 * //   const stored = localStorage.getItem(STORAGE_KEY);
 * //   if (stored) {
 * //     const parsed = JSON.parse(stored);
 * //     return { ...defaultPdfOptions, ...parsed, tamilEnabled: false };
 * //   }
 * // } catch (error) {
 * //   console.error('Error reading PDF options from localStorage:', error);
 * // }
 */
export const getPdfOptions = (): PdfOptions => currentPdfOptions;

const savePdfOptions = (options: PdfOptions) => {
  currentPdfOptions = options;
  // Persistence intentionally disabled — see note above.
  //
  // try {
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  // } catch (error) {
  //   console.error('Error saving PDF options to localStorage:', error);
  // }
};

const PDFOptions = () => {
  // Seed straight from the in-memory store so the component picks up
  // any changes the user made before this instance mounted (e.g. when
  // the panel re-opens after being collapsed).
  const [options, setOptions] = useState<PdfOptions>(() => getPdfOptions());
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<PdfOptions>) => {
    setOptions(prev => {
      const next = { ...prev, ...patch };
      savePdfOptions(next);
      return next;
    });
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-6 border border-gray-200 rounded-lg bg-white"
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between p-4 text-left"
        aria-label="Toggle PDF options"
      >
        <h3 className="text-sm font-semibold text-gray-800">PDF Options</h3>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="tamil-toggle"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Add Tamil transliteration
          </Label>
          <Switch
            id="tamil-toggle"
            checked={options.tamilEnabled}
            onCheckedChange={(checked) => update({ tamilEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label
            htmlFor="toc-toggle"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Add table of contents
          </Label>
          <Switch
            id="toc-toggle"
            checked={options.tocEnabled}
            onCheckedChange={(checked) => update({ tocEnabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label
            htmlFor="heading-color"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Heading color
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="heading-color"
              type="color"
              value={options.headingColor}
              onChange={(e) => update({ headingColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-transparent"
              aria-label="Heading color"
            />
            <span className="text-xs text-gray-500 uppercase">
              {options.headingColor}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label
            htmlFor="body-color"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Body text color
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="body-color"
              type="color"
              value={options.bodyColor}
              onChange={(e) => update({ bodyColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-gray-300 bg-transparent"
              aria-label="Body text color"
            />
            <span className="text-xs text-gray-500 uppercase">
              {options.bodyColor}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="heading-font-size"
              className="text-sm text-gray-700"
            >
              Heading font size
            </Label>
            <span className="text-xs text-gray-500 tabular-nums">
              {options.headingFontSize} pt
            </span>
          </div>
          <Slider
            id="heading-font-size"
            min={HEADING_FONT_MIN}
            max={HEADING_FONT_MAX}
            step={1}
            value={[options.headingFontSize]}
            onValueChange={(v) => update({ headingFontSize: v[0] })}
            aria-label="Heading font size in points"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body-font-size" className="text-sm text-gray-700">
              Body font size
            </Label>
            <span className="text-xs text-gray-500 tabular-nums">
              {options.bodyFontSize} pt
            </span>
          </div>
          <Slider
            id="body-font-size"
            min={BODY_FONT_MIN}
            max={BODY_FONT_MAX}
            step={1}
            value={[options.bodyFontSize]}
            onValueChange={(v) => update({ bodyFontSize: v[0] })}
            aria-label="Body font size in points"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PDFOptions;
