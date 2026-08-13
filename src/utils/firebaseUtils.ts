import { FirebaseError } from 'firebase/app';

/**
 * A utility function to get human-readable Firebase error messages
 * @param error The Firebase error object
 * @returns A user-friendly error message
 */
export const getFirebaseErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    // Handle common Firebase error codes
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to access this data.';
      case 'unavailable':
        return 'The service is currently unavailable. Please try again later.';
      case 'not-found':
        return 'The requested document was not found.';
      case 'already-exists':
        return 'This record already exists.';
      default:
        return error.message || 'An unknown error occurred with Firebase.';
    }
  }
  
  // For non-Firebase errors, return a generic message
  return error instanceof Error 
    ? error.message 
    : 'An unknown error occurred.';
};

/**
 * Logs Firebase errors in a consistent way
 * @param context The context in which the error occurred
 * @param error The error object
 */
export const logFirebaseError = (context: string, error: unknown): void => {
  const message = getFirebaseErrorMessage(error);
  console.error(`Firebase Error [${context}]:`, message, error);
};
