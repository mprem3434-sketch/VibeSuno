
import React, { useState } from 'react';
import { Icons } from '../constants';

interface VibeInputProps {
  onGenerate: (mood: string) => void;
  isLoading: boolean;
}

const VibeInput: React.FC<VibeInputProps> = ({ onGenerate, isLoading }) => {
  const [mood, setMood] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mood.trim()) {
      onGenerate(mood);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Icons.Sparkles className={`w-5 h-5 ${isLoading ? 'text-blue-400 animate-spin' : 'text-slate-500'}`} />
      </div>
      <input
        type="text"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        placeholder="How should the music feel? (e.g. Cyberpunk rain, Beach sunset...)"
        className="w-full bg-slate-800/50 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-2xl py-4 pl-12 pr-32 outline-none transition-all placeholder:text-slate-600 text-slate-200 backdrop-blur-md"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !mood.trim()}
        className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-50 text-white px-6 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
      >
        {isLoading ? 'Channelling...' : 'Vibe Flow'}
      </button>
    </form>
  );
};

export default VibeInput;
