import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Song,
  saveSong,
  loadSongs,
  loadCategories,
  cleanupUnusedCategories,
  seedDatabase,
  deleteSong
} from '../data/songs';
import { utf8ToBase64, base64ToUtf8 } from '../lib/utils';
import FirebaseStatus from '../components/FirebaseStatus';
import DataLoader from '../components/DataLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Helper function to validate form data
const validateFormInput = (data: SongFormValues): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.title || !data.title.trim()) {
    errors.push("Title cannot be empty.");
  }

  if (!data.lyrics || !data.lyrics.trim()) {
    errors.push("Lyrics cannot be empty.");
  }

  if (!data.categories || data.categories.length === 0) {
    errors.push("At least one category is required.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const songFormSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .refine(val => val.trim().length > 0, "Title cannot be empty"),
  lyrics: z.string()
    .min(1, "Lyrics are required")
    .refine(val => val.trim().length > 0, "Lyrics cannot be empty"),
  categories: z.array(z.string()).min(1, "At least one category is required")
});

type SongFormValues = z.infer<typeof songFormSchema>;

const ManageSongs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [tempSong, setTempSong] = useState<Song | null>(null); // New state for temporary song
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Setup form with validation
  const form = useForm<SongFormValues>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      title: "",
      lyrics: "",
      categories: []
    },
  });

  // State for tracking refresh status
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Function to fetch data
  const fetchData = async (showToast = false) => {
    try {
      setIsRefreshing(true);

      const loadedSongs = await loadSongs();
      // Sort songs alphabetically by title
      const sortedSongs = [...loadedSongs].sort((a, b) => a.title.localeCompare(b.title));
      setSongs(sortedSongs);
      setFilteredSongs(sortedSongs);

      const loadedCategories = await loadCategories();
      // Sort categories alphabetically
      const sortedCategories = [...loadedCategories].sort((a, b) => a.localeCompare(b));
      setAvailableCategories(sortedCategories);

      setLastRefreshed(new Date());

      if (showToast) {
        toast({
          title: "Database refreshed",
          description: "Song list has been updated from the database."
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error loading data",
        description: "There was a problem connecting to the database.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    // Filter songs based on search term and category
    let filtered = [...songs];

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        song.categories.some(category => category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(song =>
        song.categories.includes(filterCategory)
      );
    }

    // Sort songs alphabetically by title
    filtered.sort((a, b) => a.title.localeCompare(b.title));

    setFilteredSongs(filtered);
  }, [songs, searchTerm, filterCategory]);

  const handleSongSelect = (song: Song) => {
    // If we are switching away from a temporary song, ask for confirmation
    if (tempSong && tempSong.id !== song.id) {
      if (form.formState.isDirty) {
        const confirmSwitch = window.confirm(
          "You have unsaved changes in your new song. Are you sure you want to switch to another song?"
        );
        if (!confirmSwitch) {
          return;
        }
        else {
          // Discard the temporary song if user confirms
          setTempSong(null);
          form.reset({ title: "", lyrics: "", categories: [] });
        }
      }
    }

    setSelectedSong(song);

    // Use the utility function to decode the lyrics
    const decodedLyrics = base64ToUtf8(song.lyrics);

    form.reset({
      title: song.title,
      lyrics: decodedLyrics,
      categories: [...song.categories]
    });
  };
  
  const handleCreateNewSong = () => {
    // If there's already a temporary song, show a toast and select it
    if (tempSong) {
      toast({
        title: "Editing in progress",
        description: "Please save or cancel your current song before creating a new one.",
        variant: "destructive"
      });
      
      // Select the existing temporary song
      setSelectedSong(tempSong);
      return;
    }
    
    // Create a temporary song in memory with a unique ID
    // This song will be kept separately from the songs list until saved
    const newSong: Song = {
      id: `temp_${Date.now().toString()}`, // Temporary ID with timestamp
      title: "", // Empty title to be filled in
      lyrics: "", // Empty lyrics to be filled in
      categories: [] // Empty categories to be filled in
    };

    // Store the temporary song in its own state
    setTempSong(newSong);
    setSelectedSong(newSong);
    
    // Reset the form with empty values
    form.reset({
      title: "",
      lyrics: "",
      categories: []
    });

    // Show a toast to the user
    toast({
      title: "New song created",
      description: "Please fill in the details and save to add this song to your collection."
    });

    // Focus on title field to encourage immediate editing
    setTimeout(() => {
      const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
      if (titleInput) titleInput.focus();
    }, 100);
  };

  const onSubmit = async (data: SongFormValues) => {
    if (!selectedSong) return;

    // Additional validation for empty data
    // Run our custom validation
    const validation = validateFormInput(data);

    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    // Set loading state
    setIsSaving(true);

    // Encode lyrics to base64 with UTF-8 support
    const encodedLyrics = utf8ToBase64(data.lyrics);

    // Check if this is a new song (has a temporary ID)
    const isNewSong = tempSong !== null && selectedSong.id === tempSong.id;

    // Create a proper ID for new songs
    const songId = isNewSong ? Date.now().toString() : selectedSong.id;

    const updatedSong: Song = {
      ...selectedSong,
      id: songId,
      title: data.title.trim(), // Ensure we trim any whitespace
      lyrics: encodedLyrics,
      categories: data.categories
    };

    // Handle differently based on whether this is a new song or an existing one
    let updatedSongs: Song[];

    if (isNewSong) {
      // For new songs, add to the songs array
      updatedSongs = [...songs, updatedSong];
    } else {
      // For existing songs, update in the songs array
      updatedSongs = songs.map(song =>
        song.id === selectedSong.id ? updatedSong : song
      );
    }

    // Hold off on updating UI until we successfully save to Firebase

    try {
      // Only the edited song is written - one round-trip regardless of collection size
      await saveSong(updatedSong);

      // Now that saving to Firebase was successful, update the UI
      setSongs(updatedSongs);

      // Clean up categories that are no longer used; this writes only when the set changed
      const updatedCategories = await cleanupUnusedCategories();
      const sortedCategories = [...updatedCategories].sort((a, b) => a.localeCompare(b));
      setAvailableCategories(sortedCategories);
      
      // If it was a temporary song, clear the tempSong state
      if (isNewSong) {
        setTempSong(null);
      }
      
      setSelectedSong(updatedSong);

      // Show appropriate success message based on whether it's a new or updated song
      toast({
        title: "Song saved successfully",
        description: isNewSong
          ? `"${updatedSong.title}" has been added to your collection.`
          : `"${updatedSong.title}" has been updated.`
      });
    } catch (error) {
      console.error("Error saving song:", error);
      toast({
        title: "Error saving song",
        description: "There was a problem saving your changes.",
        variant: "destructive"
      });
    } finally {
      // Reset loading state regardless of outcome
      setIsSaving(false);
    }
  };

  const handleDeleteSong = async () => {
    if (!selectedSong) return;

    // Store title for toast message
    const songTitle = selectedSong.title;

    // Store the ID for deletion
    const songId = selectedSong.id;

    // Update UI immediately
    const updatedSongs = songs.filter(song => song.id !== songId);
    setSongs(updatedSongs);
    setSelectedSong(null);
    form.reset({ title: "", lyrics: "", categories: [] });

    try {
      // Delete the song directly from Firestore
      await deleteSong(songId);
      console.log(`Deleted song ${songId} from Firestore`);

      // Clean up categories that are no longer used
      const updatedCategories = await cleanupUnusedCategories();

      // Sort categories alphabetically
      const sortedCategories = [...updatedCategories].sort((a, b) => a.localeCompare(b));
      setAvailableCategories(sortedCategories);

      // If the current filter category was removed, reset it
      if (filterCategory && !updatedCategories.includes(filterCategory)) {
        setFilterCategory('');
      }

      toast({
        title: "Song deleted",
        description: `"${songTitle}" has been removed.`
      });
    } catch (error) {
      console.error("Error deleting song:", error);
      toast({
        title: "Error deleting song",
        description: "There was a problem deleting the song.",
      });
    }
  };

  const addCategory = (category: string) => {
    if (!category.trim()) return;

    const currentCategories = form.getValues("categories");
    if (!currentCategories.includes(category)) {
      form.setValue("categories", [...currentCategories, category]);
      setNewCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    const currentCategories = form.getValues("categories");
    form.setValue(
      "categories",
      currentCategories.filter(c => c !== category)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of the system.",
    });
    navigate('/');
  };

  // Periodic data refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const fetchData = async () => {
        try {
          const loadedSongs = await loadSongs();
          // Sort songs alphabetically by title
          const sortedSongs = [...loadedSongs].sort((a, b) => a.title.localeCompare(b.title));
          setSongs(sortedSongs);
          setFilteredSongs(sortedSongs);

          const loadedCategories = await loadCategories();
          // Sort categories alphabetically
          const sortedCategories = [...loadedCategories].sort((a, b) => a.localeCompare(b));
          setAvailableCategories(sortedCategories);
          
          // Don't lose the temp song if it exists
          if (tempSong) {
            setSelectedSong((current) => 
              current?.id === tempSong.id ? tempSong : current
            );
          }
        } catch (error) {
          console.error("Error loading data:", error);
          toast({
            title: "Error loading data",
            description: "There was a problem connecting to the database.",
          });
        }
      };

      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [toast, tempSong]);

  // Track form changes and update tempSong if needed
  useEffect(() => {
    if (tempSong && selectedSong?.id === tempSong.id) {
      // Only update the temporary song if the form has been modified
      const formValues = form.getValues();
      if (form.formState.isDirty) {
        setTempSong({
          ...tempSong,
          title: formValues.title || "",
          // Don't encode lyrics until saving
          categories: formValues.categories || []
        });
      }
    }
  }, [form.watch("title"), form.watch("categories"), selectedSong?.id, tempSong]);

  const discardTempSong = () => {
    if (form.formState.isDirty) {
      const confirm = window.confirm("Are you sure you want to discard your unsaved changes?");
      if (!confirm) return;
    }
    
    setTempSong(null);
    setSelectedSong(null);
    form.reset({ title: "", lyrics: "", categories: [] });
    
    toast({
      title: "Changes discarded",
      description: "Your new song draft has been discarded."
    });
  };

  // Warn users if they try to navigate away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((tempSong && form.formState.isDirty) || 
          (selectedSong && form.formState.isDirty)) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return ''; // This text is usually ignored by browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tempSong, selectedSong, form.formState.isDirty]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <FirebaseStatus />
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Link to="/generate-lyric-book">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back to Generator</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <h1 className="text-xl sm:text-3xl font-bold text-center">Manage Songs</h1>
          <Button
            variant="outline"
            className="flex items-center gap-1"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

        <DataLoader>
          <div className={`flex flex-col ${!isMobile ? 'sm:flex-row' : ''} gap-4 sm:gap-6`}>
            {/* Left column - Song list - Only this section has scroll */}
            <div className={`${isMobile ? 'w-full' : 'w-full sm:w-3/12'} bg-white p-4 rounded-lg shadow`}>
              <div className="mb-4">
                <div className="flex gap-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Search songs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    title="Refresh song list"
                    className="flex-shrink-0"
                  >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  </Button>
                </div>


                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Filter by Category
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {filterCategory && (
                      <Badge
                        className="cursor-pointer"
                        variant="secondary"
                        onClick={() => setFilterCategory('')}
                      >
                        {filterCategory} ×
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {availableCategories.map(category => (
                      <Badge
                        key={category}
                        className="cursor-pointer"
                        variant="outline"
                        onClick={() => setFilterCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                className="w-full mb-4"
                onClick={handleCreateNewSong}
                disabled={tempSong !== null}
                title={tempSong ? "Please save or discard the current new song first" : "Create a new song"}
              >
                Create New Song
              </Button>

              <ScrollArea className="h-[300px] sm:h-[calc(100vh-280px)]">
                <div className="space-y-2 pr-2">
                  {/* Show temporary song at the top if it exists */}
                  {tempSong && (
                    <div
                      key={tempSong.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors border-2 border-green-400 ${
                        selectedSong?.id === tempSong.id
                          ? 'bg-green-100'
                          : 'bg-green-50 hover:bg-green-100'
                      }`}
                      onClick={() => handleSongSelect(tempSong)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{tempSong.title || "<New Song>"}</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                          New
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2 -ml-1">
                        {tempSong.categories.map(category => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* List of saved songs */}
                  {filteredSongs.map(song => (
                    <div
                      key={song.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedSong?.id === song.id && selectedSong?.id !== tempSong?.id
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleSongSelect(song)}
                    >
                      <p className="font-medium">{song.title}</p>
                      <div className="flex flex-wrap gap-1 mt-2 -ml-1">
                        {song.categories.map(category => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right column - Editor - No scroll here */}
            <div className={`${isMobile ? 'w-full' : 'w-full sm:w-9/12'} bg-white p-4 sm:p-6 rounded-lg shadow`}>
              {selectedSong ? (
                <Form {...form}>
                  {tempSong !== null && selectedSong.id === tempSong.id && (
                    <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                      <h3 className="font-medium">Creating New Song</h3>
                      <p className="text-sm">This song will appear in your collection after you save it.</p>
                    </div>
                  )}
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Song Title<span className="text-destructive ml-1">*</span></FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                // Clear error when user types content
                                if (e.target.value.trim()) {
                                  form.clearErrors("title");
                                }
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                if (!e.target.value.trim()) {
                                  form.setError("title", {
                                    type: "manual",
                                    message: "Title cannot be empty"
                                  });
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                        Categories
                      </FormLabel>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {form.watch("categories").map(category => (
                          <Badge
                            key={category}
                            className="cursor-pointer"
                            onClick={() => removeCategory(category)}
                          >
                            {category} ×
                          </Badge>
                        ))}
                      </div>
                      {form.formState.errors.categories && (
                        <p className="text-sm font-medium text-destructive mt-1">
                          {form.formState.errors.categories.message}
                        </p>
                      )}

                      <div className="flex gap-2 mt-2">
                        <Input
                          type="text"
                          placeholder="Add category..."
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCategory(newCategoryInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => addCategory(newCategoryInput)}
                          disabled={!newCategoryInput}
                        >
                          Add
                        </Button>
                      </div>

                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-1">Suggested categories:</p>
                        <div className="flex flex-wrap gap-1">
                          {availableCategories
                            .filter(category => !form.watch("categories").includes(category))
                            .map(category => (
                              <Badge
                                key={category}
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => addCategory(category)}
                              >
                                {category}
                              </Badge>
                            ))
                          }
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="lyrics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lyrics<span className="text-destructive ml-1">*</span></FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                              placeholder="Enter lyrics here..."
                              onChange={(e) => {
                                field.onChange(e);
                                // Clear any errors when user types
                                if (e.target.value.trim()) {
                                  form.clearErrors("lyrics");
                                }
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                if (!e.target.value.trim()) {
                                  form.setError("lyrics", {
                                    type: "manual",
                                    message: "Lyrics cannot be empty"
                                  });
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      {/* Only show delete button for songs that have been saved */}
                      {!(tempSong !== null && selectedSong.id === tempSong.id) && (
                        <Button
                          type="button"
                          onClick={handleDeleteSong}
                          variant="destructive"
                          disabled={isSaving}
                        >
                          Delete Song
                        </Button>
                      )}
                      {/* For unsaved songs, show a cancel button */}
                      {tempSong !== null && selectedSong.id === tempSong.id && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={discardTempSong}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={
                          isSaving ||
                          !form.formState.isValid ||
                          !(form.watch("title")?.trim()) ||
                          !(form.watch("lyrics")?.trim()) ||
                          form.watch("categories").length === 0
                        }
                        className={tempSong !== null && selectedSong.id === tempSong.id ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : tempSong !== null && selectedSong.id === tempSong.id ? (
                          'Add to Collection'
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-500">
                  <p>Select a song from the list or create a new song</p>
                </div>
              )}
            </div>
          </div>
        </DataLoader>
      </div>
    </div>
  );
};

export default ManageSongs;
