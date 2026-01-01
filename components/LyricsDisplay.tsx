
import React from 'react';

interface LyricsDisplayProps {
  lyrics: string;
  isLoading: boolean;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ lyrics, isLoading }) => {
  return (
    <div className="w-full max-w-2xl mt-4 mb-2 h-48 overflow-y-auto bg-slate-900/30 backdrop-blur-md rounded-2xl border border-white/5 p-6 flex flex-col items-center custom-scrollbar scroll-smooth">
      {isLoading ? (
        <div className="flex flex-col gap-3 w-full animate-pulse">
          <div className="h-4 bg-slate-700/50 rounded w-3/4 self-center"></div>
          <div className="h-4 bg-slate-700/50 rounded w-1/2 self-center"></div>
          <div className="h-4 bg-slate-700/50 rounded w-2/3 self-center mt-4"></div>
          <div className="h-4 bg-slate-700/50 rounded w-1/2 self-center"></div>
        </div>
      ) : lyrics ? (
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {lyrics.split('\n').map((line, i) => (
            <p key={i} className={`text-slate-300 font-medium tracking-wide ${line.trim() === '' ? 'h-4' : 'opacity-90'}`}>
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-slate-600 italic text-sm mt-12">Lyrics are manifesting...</p>
      )}
    </div>
  );
};

export default LyricsDisplay;
