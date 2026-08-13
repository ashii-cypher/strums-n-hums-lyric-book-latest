
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import TemplateCard from './TemplateCard';
import { Template } from '@/utils/templateUtils';

interface TemplateListProps {
  templates: Template[];
  selectedIndex: number;
  onTemplateSelect: (index: number) => void;
  onTemplateDelete: (index: number, event: React.MouseEvent) => void;
}

const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedIndex,
  onTemplateSelect,
  onTemplateDelete,
}) => {
  return (
    <ScrollArea className="max-h-60 overflow-y-auto">
      <div className="p-4 grid grid-cols-2 gap-2">
        {templates.map((template, index) => (
          <TemplateCard 
            key={template.id || index}
            template={template}
            index={index}
            isSelected={selectedIndex === index}
            onTemplateSelect={onTemplateSelect}
            onTemplateDelete={onTemplateDelete}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default TemplateList;
