
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import GenerateLyricBook from "./pages/GenerateLyricBook";
import ManageSongs from "./pages/ManageSongs";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";
import { loadDefaultTemplates } from "./utils/templateUtils";

// Create a new QueryClient
const queryClient = new QueryClient();

// Import Firebase Context
import { FirebaseProvider } from "./contexts/FirebaseContext";

const App = () => {
  useEffect(() => {
    // Add font links dynamically to the head
    const josefinSansLink = document.createElement('link');
    josefinSansLink.rel = 'stylesheet';
    josefinSansLink.href = 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;700&display=swap';
    document.head.appendChild(josefinSansLink);

    const shareTechLink = document.createElement('link');
    shareTechLink.rel = 'stylesheet';
    shareTechLink.href = 'https://fonts.googleapis.com/css2?family=Share+Tech&display=swap';
    document.head.appendChild(shareTechLink);

    // Preload all available templates
    loadDefaultTemplates();

    // Clean up function to remove links when component unmounts
    return () => {
      document.head.removeChild(josefinSansLink);
      document.head.removeChild(shareTechLink);
    };
  }, []);

  return (
    <FirebaseProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public route - Login page */}
              <Route path="/" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/generate-lyric-book" element={
                <ProtectedRoute>
                  <GenerateLyricBook />
                </ProtectedRoute>
              } />
              <Route path="/manage-songs" element={
                <ProtectedRoute>
                  <ManageSongs />
                </ProtectedRoute>
              } />
              
              {/* Redirect to login for unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </FirebaseProvider>
  );
};

export default App;
