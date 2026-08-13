
import React from 'react';
import { X } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Template } from '@/utils/templateUtils';

interface TemplateCardProps {
  template: Template;
  index: number;
  isSelected: boolean;
  onTemplateSelect: (index: number) => void;
  onTemplateDelete: (index: number, event: React.MouseEvent) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  index,
  isSelected,
  onTemplateSelect,
  onTemplateDelete,
}) => {
  return (
    <div 
      className={`relative cursor-pointer border rounded-md overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onTemplateSelect(index)}
    >
      <AspectRatio ratio={210/297}> {/* A4 aspect ratio (210mm x 297mm) */}
        <img 
          src={template.data} 
          alt={template.name || `Template ${index + 1}`} 
          className="w-full h-full object-cover"
        />
      </AspectRatio>
      
      {/* Template name badge */}
      {template.name && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-1 py-0.5 text-xs text-white text-center truncate">
          {template.name}
        </div>
      )}
      
      {/* Delete button - only show for non-default templates */}
      {index > 0 && (
        <button
          className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1 hover:bg-opacity-80 transition-colors"
          onClick={(e) => onTemplateDelete(index, e)}
          aria-label="Delete template"
        >
          <X size={16} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default TemplateCard;
