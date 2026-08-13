import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeFirebaseService } from '../services/firebase-service';

// Define the context shape
interface FirebaseContextType {
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
}

// Create a context with default values
const FirebaseContext = createContext<FirebaseContextType>({
  isLoading: true,
  isConnected: false,
  error: null
});

// Custom hook to use the Firebase context
export const useFirebase = () => useContext(FirebaseContext);

// Provider component to wrap the app
interface FirebaseProviderProps {
  children: ReactNode;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase on mount
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        await initializeFirebaseService();
        setIsConnected(true);
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setError('Failed to connect to the database. Some features may not work properly.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={{ isLoading, isConnected, error }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseContext;
