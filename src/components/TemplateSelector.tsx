
import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  addTemplate, 
  getTemplates, 
  selectTemplate, 
  getCurrentTemplateIndex, 
  deleteTemplate,
  loadDefaultTemplates,
  Template
} from '../utils/templateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import TemplateList from './templates/TemplateList';
import TemplateUploader from './templates/TemplateUploader';
import PaddingSettings from './templates/PaddingSettings';

// Define the padding settings type
interface PdfPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Default padding settings
const defaultPaddingSettings: PdfPadding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
};

// Padding settings are kept in-memory only — see "no localStorage"
// note in handlePaddingChange below. On a fresh page load we always
// start from defaultPaddingSettings.
//
// // Try to load padding settings from localStorage
// let savedPaddingSettings: PdfPadding;
// try {
//   const savedSettings = localStorage.getItem('pdfPaddingSettings');
//   if (savedSettings) {
//     savedPaddingSettings = JSON.parse(savedSettings);
//   } else {
//     savedPaddingSettings = defaultPaddingSettings;
//   }
// } catch (error) {
//   console.error('Error loading saved padding settings:', error);
//   savedPaddingSettings = defaultPaddingSettings;
// }

// Global padding settings that will be accessible by pdfUtils
let globalPaddingSettings: PdfPadding = defaultPaddingSettings;

// Export the padding settings for use in pdfUtils
export const getPaddingSettings = () => globalPaddingSettings;

const TemplateSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(getCurrentTemplateIndex());
  const [padding, setPadding] = useState<PdfPadding>(globalPaddingSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Load templates when component mounts
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        await loadDefaultTemplates();
        // Update templates after loading
        const loadedTemplates = await getTemplates();
        setTemplates(loadedTemplates);
        setSelectedIndex(getCurrentTemplateIndex());
      } catch (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Error loading templates",
          description: "Failed to load templates from the database",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTemplates();
  }, [toast]);

  const handleTemplateSelect = (index: number) => {
    setSelectedIndex(index);
    selectTemplate(index);
    toast({
      title: "Template selected",
      description: "Your template has been selected for the PDF",
    });
  };

  const handleTemplateDelete = async (index: number, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the template selection handler
    event.stopPropagation();
    
    // Don't delete the default template (index 0)
    if (index === 0) {
      toast({
        title: "Cannot delete",
        description: "The default template cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Delete the template
      await deleteTemplate(index);
      
      // Refresh the templates list
      const updatedTemplates = await getTemplates();
      setTemplates(updatedTemplates);
      
      // Update selected index if needed
      setSelectedIndex(getCurrentTemplateIndex());
      
      toast({
        title: "Template deleted",
        description: "The template has been removed",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error deleting template",
        description: "Failed to delete the template",
        variant: "destructive",
      });
    }
  };

  const handleTemplateAdd = async (templateData: string) => {
    try {
      // Add the new template
      await addTemplate(templateData);
      
      // Refresh the templates list
      const updatedTemplates = await getTemplates();
      setTemplates(updatedTemplates);
      
      // Select the newly added template
      const newIndex = updatedTemplates.length - 1;
      setSelectedIndex(newIndex);
      selectTemplate(newIndex);
      
      toast({
        title: "Template added",
        description: "Your template has been added and selected",
      });
    } catch (error) {
      console.error('Error adding template:', error);
      toast({
        title: "Error adding template",
        description: "Failed to add the new template",
        variant: "destructive",
      });
    }
  };

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    // Convert to number and ensure it's not negative
    const numValue = Math.max(0, parseInt(value) || 0);
    const newPadding = {
      ...padding,
      [side]: numValue
    };
    
    setPadding(newPadding);
    globalPaddingSettings = newPadding; // Update the global settings

    // Padding is intentionally NOT persisted across page loads — the
    // user wanted a clean slate every time.
    //
    // // Also save the padding settings to localStorage for persistence
    // try {
    //   localStorage.setItem('pdfPaddingSettings', JSON.stringify(newPadding));
    // } catch (error) {
    //   console.error('Error saving padding settings:', error);
    // }
  };

  // Determine the button text based on selection
  const getButtonText = () => {
    if (isLoading) {
      return "Loading Templates...";
    }
    
    if (selectedIndex === 0 || templates.length === 0) {
      return "Select Template";
    }
    
    const selectedTemplate = templates[selectedIndex];
    return selectedTemplate.name || `Template ${selectedIndex + 1}`;
  };

  return (
    <div className={`fixed ${isMobile ? 'bottom-4 left-4' : 'bottom-6 left-6'}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="rounded-full px-4 focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          >
            {getButtonText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0">
          <div className="p-4 border-b">
            <h4 className="font-medium">PDF Templates</h4>
            <p className="text-sm text-muted-foreground">Choose a background template for your PDF</p>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            </div>
          ) : (
            <>
              <TemplateList 
                templates={templates}
                selectedIndex={selectedIndex}
                onTemplateSelect={handleTemplateSelect}
                onTemplateDelete={handleTemplateDelete}
              />
              
              <div className="px-4 pb-4">
                <PaddingSettings 
                  padding={padding} 
                  onPaddingChange={handlePaddingChange} 
                />
              </div>
              
              <TemplateUploader onTemplateAdd={handleTemplateAdd} />
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TemplateSelector;
