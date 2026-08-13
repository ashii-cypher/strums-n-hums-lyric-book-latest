
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface PaddingSettingsProps {
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  onPaddingChange: (side: 'top' | 'right' | 'bottom' | 'left', value: string) => void;
}

const PaddingSettings: React.FC<PaddingSettingsProps> = ({ padding, onPaddingChange }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="mt-4 border-t pt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
          <span>PDF Padding Settings</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="top-padding" className="text-xs">Top (mm)</Label>
              <Input 
                id="top-padding"
                type="number" 
                min="0"
                value={padding.top} 
                onChange={(e) => onPaddingChange('top', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="right-padding" className="text-xs">Right (mm)</Label>
              <Input 
                id="right-padding"
                type="number" 
                min="0"
                value={padding.right} 
                onChange={(e) => onPaddingChange('right', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="bottom-padding" className="text-xs">Bottom (mm)</Label>
              <Input 
                id="bottom-padding"
                type="number" 
                min="0"
                value={padding.bottom} 
                onChange={(e) => onPaddingChange('bottom', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="left-padding" className="text-xs">Left (mm)</Label>
              <Input 
                id="left-padding"
                type="number" 
                min="0"
                value={padding.left} 
                onChange={(e) => onPaddingChange('left', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PaddingSettings;
