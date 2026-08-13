import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { loadSongs, loadCategories } from '../data/songs';
import { useFirebase } from '../contexts/FirebaseContext';

interface DataLoaderProps {
  children: React.ReactNode;
}

export const DataLoader: React.FC<DataLoaderProps> = ({ children }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { isConnected } = useFirebase();
  
  useEffect(() => {
    const loadInitialData = async () => {
      if (isConnected) {
        try {
          // Load both songs and categories in parallel
          await Promise.all([
            loadSongs(),
            loadCategories()
          ]);
          setIsDataLoaded(true);
        } catch (error) {
          console.error('Error loading initial data:', error);
          // Set loaded to true even on error so the UI can show error states
          setIsDataLoaded(true);
        }
      }
    };
    
    if (isConnected && !isDataLoaded) {
      loadInitialData();
    }
  }, [isConnected]);
  
  if (!isConnected || !isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-3 text-blue-500 animate-spin" />
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default DataLoader;
