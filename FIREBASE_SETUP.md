# Firebase Integration for Lyrics PDF Application

This project uses Firebase Firestore database to store song data. Follow these steps to set up Firebase for your environment:

## Setup Instructions

1. **Create a Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the steps to create a new project
   - Give your project a name and follow the setup wizard

2. **Register a Web App in your Firebase project**
   - In the Firebase Console, go to your project
   - Click on the web icon (</>) to add a web application
   - Give your app a nickname and click "Register app"
   - Firebase will show you configuration details

3. **Update Firebase configuration**
   - Open the file `src/lib/firebase.ts`
   - Replace the placeholder configuration with your actual Firebase configuration:

   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

4. **Set up Firestore Database**
   - In the Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in production mode" or "Start in test mode" (for development)
   - Select a region for your database
   - Click "Enable"

5. **Configure Firestore Rules**
   - In the Firestore Database section, go to the "Rules" tab
   - For development purposes, you can use these rules (replace later for production):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```

6. **Initial Data Setup**
   - When you first run the application, it will automatically seed the Firebase database with the initial song data from the local JSON file.
   - You can check in the browser console that data was properly seeded.

## Database Structure

The Firebase Firestore database has the following collections:

- **songs**: Contains documents for each song with the following fields:
  - id: string (document ID)
  - title: string
  - lyrics: string (base64 encoded)
  - categories: array of strings

- **metadata**: Contains application metadata documents:
  - categories: A document with an array field "availableCategories" that stores all category names

## Troubleshooting

If you encounter issues with Firebase:

1. Check the browser console for error messages
2. Verify your Firebase configuration is correct
3. Ensure you have the proper Firebase rules set up
4. Check your network connection
5. Verify your Firebase project billing status if applicable

## Security Notes

For production deployment:
- Never commit your actual Firebase configuration to public repositories
- Use environment variables for sensitive configuration
- Set up proper Firestore security rules to protect your data
- Consider implementing user authentication for song management features
