import { db } from '../lib/firebase';
import { seedDatabase } from '../data/songs';
import { loadTemplatesFromFirebase } from '../utils/templateUtils';

// Initialize Firebase service
export const initializeFirebaseService = async (): Promise<void> => {
  try {
    // Check the connection to Firestore
    console.log('Initializing Firebase service...');
    
    // Seed the database with initial songs if needed
    await seedDatabase();
    
    // Load templates from Firestore
    try {
      await loadTemplatesFromFirebase();
    } catch (templateError) {
      console.error('Error loading templates during initialization:', templateError);
      // Continue with initialization even if templates fail to load
    }
    
    console.log('Firebase service initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase service:', error);
  }
};
