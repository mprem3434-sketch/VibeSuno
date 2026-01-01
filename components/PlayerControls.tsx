
import React from 'react';
import { Icons } from '../constants';

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
  progress: number;
  onSeek: (value: number) => void;
  duration: number;
  volume: number;
  onVolumeChange: (value: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onShuffle,
  progress,
  onSeek,
  duration,
  volume,
  onVolumeChange
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [lastVolume, setLastVolume] = React.useState(0.7);

  const toggleMute = () => {
    if (volume > 0) {
      setLastVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(lastVolume || 0.7);
    }
  };

  const volumePercentage = volume * 100;
  const seekPercentage = (progress / (duration || 1)) * 100;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl px-4 md:px-5 lg:px-8 py-4 md:py-5 lg:py-6 bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl transition-all duration-500 hover:border-blue-500/20">
      <div className="flex items-center w-full mb-4 md:mb-6">
        
        {/* Left Section: Shuffle */}
        <div className="flex-1 flex justify-start min-w-[40px]">
          <button 
            onClick={onShuffle}
            title="Shuffle Playlist"
            className="text-slate-500 hover:text-blue-400 transition-all p-2 active:scale-90"
          >
            <Icons.Shuffle className="w-5 h-5 md:w-4 lg:w-5" />
          </button>
        </div>

        {/* Center Section: Main Playback Controls - Perfectly Centered */}
        <div className="flex items-center gap-4 md:gap-3 lg:gap-8 px-2">
          <button 
            onClick={onPrev}
            className="text-slate-400 hover:text-white transition-all p-2 active:scale-90"
          >
            <Icons.Prev className="w-6 h-6 md:w-5 md:h-5 lg:w-7 lg:h-7" />
          </button>
          
          <button 
            onClick={onTogglePlay}
            className="w-14 h-14 md:w-12 md:h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center rounded-full text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/10"
          >
            {isPlaying ? <Icons.Pause className="w-6 h-6 md:w-5 md:h-5 lg:w-7 lg:h-7" /> : <Icons.Play className="w-6 h-6 md:w-5 md:h-5 lg:w-7 lg:h-7 ml-1" />}
          </button>
          
          <button 
            onClick={onNext}
            className="text-slate-400 hover:text-white transition-all p-2 active:scale-90"
          >
            <Icons.Next className="w-6 h-6 md:w-5 md:h-5 lg:w-7 lg:h-7" />
          </button>
        </div>
        
        {/* Right Section: Volume Slide - Now visible on mobile */}
        <div className="flex-1 flex justify-end min-w-[40px]">
          <div className="flex items-center gap-2 lg:gap-3 group/volume">
            <button 
              onClick={toggleMute}
              className={`transition-all p-1 active:scale-90 ${volume === 0 ? 'text-rose-500' : 'text-slate-500 hover:text-blue-400'}`}
            >
              {volume === 0 ? <Icons.VolumeMuted className="w-4 h-4 md:w-4 lg:w-5" /> : <Icons.Volume className="w-4 h-4 md:w-4 lg:w-5" />}
            </button>
            <div className="w-12 sm:w-16 md:w-20 lg:w-24 flex items-center h-6">
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${volumePercentage}%, #1e293b ${volumePercentage}%, #1e293b 100%)`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Progress Bar Section */}
      <div className="w-full space-y-2 lg:space-y-3">
        <div className="flex justify-between text-[9px] md:text-[8px] lg:text-[10px] text-slate-500 font-black uppercase tracking-widest px-1">
          <span className={isPlaying ? "text-blue-400" : ""}>{formatTime(progress)}</span>
          <span className="text-slate-600">{formatTime(duration)}</span>
        </div>
        <div className="relative group/seek h-4 lg:h-6 flex items-center px-1">
          <input 
            type="range"
            min="0"
            max={duration}
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer transition-all focus:outline-none"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${seekPercentage}%, #1e293b ${seekPercentage}%, #1e293b 100%)`
            }}
          />
        </div>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #2563eb;
          box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
        }
        
        .group\\/volume:hover input[type='range']::-webkit-slider-thumb,
        .group\\/seek:hover input[type='range']::-webkit-slider-thumb {
          opacity: 1;
        }

        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        input[type='range']::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #2563eb;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
        }

        .group\\/volume:hover input[type='range']::-moz-range-thumb,
        .group\\/seek:hover input[type='range']::-moz-range-thumb {
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default PlayerControls;
