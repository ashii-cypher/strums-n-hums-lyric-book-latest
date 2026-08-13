import { useFirebase } from '../contexts/FirebaseContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export const FirebaseStatus = () => {
  const { isLoading, isConnected, error } = useFirebase();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full py-2 text-sm text-blue-600 bg-blue-50">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        <span>Connecting to database...</span>
      </div>
    );
  }
  
  if (!isConnected) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          {error || "Failed to connect to the database. Some features may not work properly."}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null; // Don't show anything if connected successfully
};

export default FirebaseStatus;
