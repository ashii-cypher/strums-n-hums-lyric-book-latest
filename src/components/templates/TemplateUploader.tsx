
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface TemplateUploaderProps {
  onTemplateAdd: (templateData: string) => void;
}

const TemplateUploader: React.FC<TemplateUploaderProps> = ({ onTemplateAdd }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or PDF file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Show preview image
        const templateData = event.target.result.toString();
        setPreviewImage(templateData);
        
        // We'll wait for the user to confirm before adding the template
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleConfirmTemplate = () => {
    if (previewImage) {
      // Add the new template
      onTemplateAdd(previewImage);
      
      // Reset preview
      setPreviewImage(null);
    }
  };
  
  const handleCancelUpload = () => {
    setPreviewImage(null);
  };

  return (
    <div className="p-4 border-t">
      {!previewImage ? (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          <Upload size={16} className="mr-2" />
          {isUploading ? "Uploading..." : "Upload Template"}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium mb-1">Template Preview</div>
          <div className="relative border rounded-md overflow-hidden">
            <AspectRatio ratio={210/297}> {/* A4 aspect ratio */}
              <img 
                src={previewImage} 
                alt="Template Preview" 
                className="w-full h-full object-cover" 
              />
            </AspectRatio>
            <button
              className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1 hover:bg-opacity-80 transition-colors"
              onClick={handleCancelUpload}
              aria-label="Cancel upload"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
          <Button 
            className="w-full" 
            onClick={handleConfirmTemplate}
          >
            Confirm Template
          </Button>
        </div>
      )}
      <input 
        ref={fileInputRef}
        id="template-upload" 
        type="file" 
        accept=".jpg,.jpeg,.png,.pdf" 
        className="hidden" 
        onChange={handleFileUpload}
        onClick={(e) => {
          // Reset the input value to allow reselecting the same file
          (e.target as HTMLInputElement).value = '';
        }}
      />
    </div>
  );
};

export default TemplateUploader;
