
import { Song } from '../data/songs';

interface SelectedSongsProps {
  songs: Song[];
  onRemove: (songId: string) => void;
  onClearAll?: () => void;
}

const SelectedSongs = ({ songs, onRemove, onClearAll }: SelectedSongsProps) => {
  if (songs.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Selected Songs:</h2>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-sm text-red-600 hover:text-red-800 hover:underline focus:outline-none"
            aria-label="Clear all selected songs"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {songs.map((song) => (
          <div
            key={song.id}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center max-w-full"
          >
            <span className="truncate max-w-[170px] block" title={song.title}>{song.title}</span>
            <button
              onClick={() => onRemove(song.id)}
              className="ml-2 flex-shrink-0 text-blue-600 hover:text-blue-800 focus:outline-none"
              aria-label={`Remove ${song.title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectedSongs;
