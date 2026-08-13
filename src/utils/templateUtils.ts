
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { logFirebaseError } from './firebaseUtils';

// Store templates in memory for the session
let templates: Template[] = [];
let currentTemplateIndex: number | null = null;

// Create a type for template objects
export interface Template {
  id: string;
  data: string;
  name?: string;
  isDefault?: boolean;
  createdAt?: number;
}

// Initialize with default white template
const initializeTemplates = async (): Promise<void> => {
  if (templates.length === 0) {
    try {
      // Try to load templates from Firestore
      await loadTemplatesFromFirebase();
      
      // If we still have no templates (first run), create a default one
      if (templates.length === 0) {
        const defaultTemplate = generateWhiteTemplate();
        templates = [defaultTemplate];
        currentTemplateIndex = 0;
        
        // Save the default template to Firebase
        await saveTemplateToFirebase(defaultTemplate);
      }
    } catch (error) {
      console.error('Error initializing templates:', error);
      
      // Fallback to local default template if Firebase fails
      const defaultTemplate = generateWhiteTemplate();
      templates = [defaultTemplate];
      currentTemplateIndex = 0;
    }
  }
};

// Generate a blank white template
export const generateWhiteTemplate = (): Template => {
  // Create a canvas to generate a white A4 sized image
  const canvas = document.createElement('canvas');
  canvas.width = 210; // A4 width in mm (scaled)
  canvas.height = 297; // A4 height in mm (scaled)
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#ffffff'; // White color
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Return the template object
    return {
      id: 'default-white-template',
      data: canvas.toDataURL('image/jpeg'),
      name: 'Default White Template',
      isDefault: true,
      createdAt: Date.now()
    };
  }
  
  // Fallback with empty string if canvas fails
  return {
    id: 'default-white-template',
    data: '',
    name: 'Default White Template',
    isDefault: true,
    createdAt: Date.now()
  };
};

// Load templates from Firebase
export const loadTemplatesFromFirebase = async (): Promise<void> => {
  try {
    const templatesCollection = collection(db, 'templates');
    const templatesQuery = query(templatesCollection, orderBy('createdAt', 'asc'));
    const templatesSnapshot = await getDocs(templatesQuery);
    
    if (!templatesSnapshot.empty) {
      const loadedTemplates = templatesSnapshot.docs.map(doc => {
        const data = doc.data() as Template;
        return { ...data, id: doc.id };
      });
      
      templates = loadedTemplates;
      
      // Set default template index (the first one, which should be the default white template)
      if (templates.length > 0) {
        const defaultIndex = templates.findIndex(t => t.isDefault);
        currentTemplateIndex = defaultIndex >= 0 ? defaultIndex : 0;
      }
      
      console.log(`Loaded ${templates.length} templates from Firebase`);
    } else {
      console.log('No templates found in Firebase');
    }
  } catch (error) {
    logFirebaseError('loadTemplatesFromFirebase', error);
    throw error;
  }
};

// Save a template to Firebase
export const saveTemplateToFirebase = async (template: Template): Promise<void> => {
  try {
    const templateId = template.id || `template-${Date.now()}`;
    await setDoc(doc(db, 'templates', templateId), {
      ...template,
      id: templateId,
      createdAt: template.createdAt || Date.now()
    });
    console.log(`Template ${templateId} saved to Firebase`);
  } catch (error) {
    logFirebaseError('saveTemplateToFirebase', error);
    throw error;
  }
};

// Delete a template from Firebase
export const deleteTemplateFromFirebase = async (templateId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'templates', templateId));
    console.log(`Template ${templateId} deleted from Firebase`);
  } catch (error) {
    logFirebaseError('deleteTemplateFromFirebase', error);
    throw error;
  }
};

// Get all templates - returns Template objects now
export const getTemplates = async (): Promise<Template[]> => {
  await initializeTemplates();
  return templates;
};

// Add a new template
export const addTemplate = async (templateBase64: string, name?: string): Promise<Template> => {
  await initializeTemplates();
  
  const newTemplate: Template = {
    id: `template-${Date.now()}`,
    data: templateBase64,
    name: name || `Template ${templates.length + 1}`,
    createdAt: Date.now()
  };
  
  templates.push(newTemplate);
  
  // Save to Firebase
  try {
    await saveTemplateToFirebase(newTemplate);
  } catch (error) {
    console.error('Error saving template to Firebase:', error);
    // Continue anyway to keep UI consistent
  }
  
  return newTemplate;
};

// Delete a template
export const deleteTemplate = async (index: number): Promise<void> => {
  // Don't allow deletion of default template (index 0)
  if (index > 0 && index < templates.length) {
    const templateToDelete = templates[index];
    
    // Remove from local array first
    templates.splice(index, 1);
    
    // If the current template was deleted, reset to default
    if (currentTemplateIndex === index) {
      currentTemplateIndex = 0;
    } 
    // If current index is beyond the deleted template, shift it down
    else if (currentTemplateIndex !== null && currentTemplateIndex > index) {
      currentTemplateIndex--;
    }
    
    // Delete from Firebase
    try {
      if (templateToDelete.id) {
        await deleteTemplateFromFirebase(templateToDelete.id);
      }
    } catch (error) {
      console.error('Error deleting template from Firebase:', error);
      // Continue anyway to keep UI consistent
    }
  }
};

// Select a template
export const selectTemplate = (index: number): void => {
  if (index >= 0 && index < templates.length) {
    currentTemplateIndex = index;
    
    // Save the selected template index to localStorage for persistence
    try {
      localStorage.setItem('selectedTemplateIndex', index.toString());
    } catch (error) {
      console.error('Error saving selected template index:', error);
    }
  }
};

// Get current template
export const getCurrentTemplate = async (): Promise<Template | null> => {
  await initializeTemplates();
  if (currentTemplateIndex !== null && currentTemplateIndex >= 0 && currentTemplateIndex < templates.length) {
    return templates[currentTemplateIndex];
  }
  return templates.length > 0 ? templates[0] : null;
};

// Get the currently selected template index
export const getCurrentTemplateIndex = (): number => {
  // If we don't have a current template index set yet, try to load from localStorage
  if (currentTemplateIndex === null) {
    try {
      const savedIndex = localStorage.getItem('selectedTemplateIndex');
      if (savedIndex !== null) {
        const index = parseInt(savedIndex, 10);
        // Make sure the index is valid
        if (!isNaN(index) && index >= 0 && templates.length > 0 && index < templates.length) {
          currentTemplateIndex = index;
        } else {
          currentTemplateIndex = 0;
        }
      } else {
        currentTemplateIndex = 0;
      }
    } catch (error) {
      console.error('Error loading saved template index:', error);
      currentTemplateIndex = 0;
    }
  }
  
  return currentTemplateIndex !== null ? currentTemplateIndex : 0;
};

// Load all available template images from the /templates directory
export const loadDefaultTemplates = async (): Promise<void> => {
  // Make sure we have our templates initialized
  await initializeTemplates();
  
  // If we already have templates, skip loading default ones
  if (templates.length > 1) {
    return;
  }
  
  // Sample templates to add
  const defaultTemplateUrls = [
    '/templates/template1.jpg',
    '/templates/template2.jpg',
    '/templates/template3.jpg',
    '/templates/template4.jpg',
    '/templates/template5.jpg',
    '/templates/template6.jpg',
    '/templates/template7.jpg'
  ];
  
  // Load each template image and convert to base64
  const loadPromises = defaultTemplateUrls.map((url, index) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const base64Data = canvas.toDataURL('image/jpeg');
            await addTemplate(base64Data, `Sample Template ${index + 1}`);
          } catch (e) {
            console.error(`Error converting template to base64: ${e}`);
          }
        }
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load template: ${url}`);
        resolve(); // Resolve anyway to continue with other templates
      };
      img.src = url;
    });
  });
  
  await Promise.all(loadPromises);
};

// Get template data for PDF generation
export const getTemplateData = async (): Promise<string> => {
  const currentTemplate = await getCurrentTemplate();
  return currentTemplate?.data || '';
};

// Export function to initialize templates for external usage
export const initializeTemplatesAsync = async (): Promise<void> => {
  await initializeTemplates();
};

// Initialize templates asynchronously (to avoid blocking)
initializeTemplates().catch(error => {
  console.error('Failed to initialize templates:', error);
});
