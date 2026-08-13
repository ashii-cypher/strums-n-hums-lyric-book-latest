
import { Button } from '@/components/ui/button';
import { Song } from '../data/songs';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateLyricsPDF } from '../utils/pdfUtils';

interface PDFGeneratorProps {
  selectedSongs: Song[];
}

const PDFGenerator = ({ selectedSongs }: PDFGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    if (selectedSongs.length === 0) {
      toast({
        title: "No songs selected",
        description: "Please select at least one song to generate a PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Pass the selected songs to the PDF generator
      await generateLyricsPDF(selectedSongs);
      
      toast({
        title: "PDF Generated Successfully",
        description: `Created PDF with ${selectedSongs.length} song(s)`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error Generating PDF",
        description: "An error occurred while generating the PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6">
      <Button
        onClick={generatePDF}
        className="w-full"
        disabled={selectedSongs.length === 0 || isGenerating}
      >
        {isGenerating ? "Generating PDF..." : "Generate Lyrics PDF"}
      </Button>
    </div>
  );
};

export default PDFGenerator;
