
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SongSearch from '../components/SongSearch';
import SelectedSongs from '../components/SelectedSongs';
import PDFGenerator from '../components/PDFGenerator';
import PDFOptions from '../components/PDFOptions';
import TemplateSelector from '../components/TemplateSelector';
import FirebaseStatus from '../components/FirebaseStatus';
import DataLoader from '../components/DataLoader';
import { loadSongs, Song } from '../data/songs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const SELECTED_SONGS_STORAGE_KEY = 'selectedSongIds';

const Index = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const isMobile = useIsMobile();
  // Track selected IDs from localStorage so we can rehydrate once songs load.
  const persistedIdsRef = useRef<string[] | null>(null);

  // Load persisted selected song IDs from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_SONGS_STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          persistedIdsRef.current = ids;
        }
      }
    } catch (error) {
      console.error('Error loading selected songs from localStorage:', error);
    }
  }, []);

  // Load songs on component mount
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const loadedSongs = await loadSongs();
        setSongs(loadedSongs);

        // Rehydrate selected songs from persisted IDs, preserving the saved order.
        if (persistedIdsRef.current && persistedIdsRef.current.length > 0) {
          const idToSong = new Map(loadedSongs.map(s => [s.id, s]));
          const restored = persistedIdsRef.current
            .map(id => idToSong.get(id))
            .filter((s): s is Song => Boolean(s));
          if (restored.length > 0) {
            setSelectedSongs(restored);
          }
        }
      } catch (error) {
        console.error("Error loading songs:", error);
      }
    };

    fetchSongs();
  }, []);

  // Persist selected songs to localStorage whenever they change.
  useEffect(() => {
    try {
      const ids = selectedSongs.map(s => s.id);
      localStorage.setItem(SELECTED_SONGS_STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving selected songs to localStorage:', error);
    }
  }, [selectedSongs]);

  const handleSongSelect = (song: Song) => {
    // Check if song is already selected
    if (!selectedSongs.some(s => s.id === song.id)) {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  const handleSongRemove = (songId: string) => {
    setSelectedSongs(selectedSongs.filter(song => song.id !== songId));
  };

  const handleClearAll = () => {
    setSelectedSongs([]);
    try {
      localStorage.removeItem(SELECTED_SONGS_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing selected songs from localStorage:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative">
      <div className="max-w-md mx-auto w-full">
        <FirebaseStatus />
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            Lyrics Generator
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Search and select songs to generate a lyrics PDF
          </p>
        </div>

        <DataLoader>
          <SongSearch
            songs={songs}
            onSongSelect={handleSongSelect}
            selectedSongs={selectedSongs}
          />

          <SelectedSongs
            songs={selectedSongs}
            onRemove={handleSongRemove}
            onClearAll={handleClearAll}
          />

          <PDFOptions />

          <PDFGenerator
            selectedSongs={selectedSongs}
          />
        </DataLoader>
      </div>

      {/* Floating Add Button */}
      <Link to="/manage-songs">
        <Button
          size="icon"
          className={`fixed ${isMobile ? 'bottom-4 right-4 h-12 w-12' : 'bottom-6 right-6 h-14 w-14'} rounded-full shadow-lg`}
          aria-label="Add Songs"
        >
          <Plus size={isMobile ? 20 : 24} />
        </Button>
      </Link>

      {/* Template Selector */}
      <TemplateSelector />
    </div>
  );
};

export default Index;
