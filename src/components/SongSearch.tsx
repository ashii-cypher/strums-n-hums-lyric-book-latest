
import { useState, useRef, useEffect } from 'react';
import { Song } from '../data/songs';

interface SongSearchProps {
  songs: Song[];
  onSongSelect: (song: Song) => void;
  selectedSongs: Song[];
}

const SongSearch = ({ songs, onSongSelect, selectedSongs }: SongSearchProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<Song[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Sort songs alphabetically
  const sortedSongs = [...songs].sort((a, b) => a.title.localeCompare(b.title));

  useEffect(() => {
    // Add event listener to detect clicks outside the search component
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) && 
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsInputFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      // Show all songs in alphabetical order when empty
      setResults(sortedSongs);
      return;
    }

    // Search by both title and category
    const filteredSongs = songs.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) || 
      song.categories.some(category => 
        category.toLowerCase().includes(query.toLowerCase())
      )
    );
    setResults(filteredSongs);
  };

  const handleFocus = () => {
    setIsInputFocused(true);
    // Show all songs in alphabetical order when focused
    setResults(sortedSongs);
  };

  const isAlreadySelected = (songId: string) => {
    return selectedSongs.some(s => s.id === songId);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          ref={inputRef}
          placeholder="Search by song name or category..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
        />
      </div>

      {isInputFocused && results.length > 0 && (
        <div 
          ref={resultsRef}
          className="mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto"
        >
          <ul className="py-1">
            {results.map((song) => (
              <li 
                key={song.id}
                className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${isAlreadySelected(song.id) ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  if (!isAlreadySelected(song.id)) {
                    onSongSelect(song);
                    setSearchQuery('');
                    setIsInputFocused(false);
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{song.title}</span>
                    {song.categories.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Categories: {song.categories.join(", ")}
                      </div>
                    )}
                  </div>
                  {isAlreadySelected(song.id) && (
                    <span className="text-sm text-blue-600">Added</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SongSearch;
