
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Song, PlaybackStatus } from './types';
import { DEFAULT_SONGS, Icons } from './constants';
import PlayerControls from './components/PlayerControls';
import AudioVisualizer from './components/AudioVisualizer';

// Import Capacitor for native functionality
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>(DEFAULT_SONGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>(PlaybackStatus.STOPPED);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playlistArt, setPlaylistArt] = useState<string>('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation State
  const [mainMenuTab, setMainMenuTab] = useState<'all' | 'playlist' | 'artist' | 'favorite'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const currentSong = songs[currentIndex];

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongs(prev => prev.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s));
  };

  const handleTogglePlay = async () => {
    if (!audioRef.current) return;
    
    setAudioError(null);
    if (playbackStatus === PlaybackStatus.PLAYING) {
      audioRef.current.pause();
      setPlaybackStatus(PlaybackStatus.PAUSED);
    } else {
      try {
        await audioRef.current.play();
        setPlaybackStatus(PlaybackStatus.PLAYING);
      } catch (error) {
        console.error("Playback failed:", error);
        setAudioError("Unable to play audio. This may be due to browser restrictions.");
        setPlaybackStatus(PlaybackStatus.PAUSED);
      }
    }
  };

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % songs.length);
    setProgress(0);
    setAudioError(null);
  }, [songs.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setProgress(0);
    setAudioError(null);
  }, [songs.length]);

  const handleShuffle = () => {
    if (songs.length <= 1) return;
    const currentId = songs[currentIndex].id;
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[j], shuffled[i]] = [shuffled[i], shuffled[j]];
    }
    const newIndex = shuffled.findIndex(s => s.id === currentId);
    setSongs(shuffled);
    setCurrentIndex(newIndex);
  };

  const handleSeek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setProgress(value);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsScanning(true);
    const newSongs: Song[] = [];
    
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) return;
      
      const url = URL.createObjectURL(file);
      newSongs.push({
        id: `local-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Internal Storage',
        album: (file as any).webkitRelativePath ? (file as any).webkitRelativePath.split('/')[0] : 'Local Music',
        coverUrl: `https://picsum.photos/seed/${file.name}/400/400`,
        audioUrl: url,
        duration: 0,
        favorite: false
      });
    });

    if (newSongs.length > 0) {
      setSongs(prev => [...newSongs, ...prev]);
      setCurrentIndex(0);
      setAudioError(null);
      setMainMenuTab('playlist');
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play()
            .then(() => setPlaybackStatus(PlaybackStatus.PLAYING))
            .catch(console.error);
        }
      }, 300);
    }
    setIsScanning(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
  };

  // Improved native permission handling for Android
  const handleScanLibrary = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Filesystem.checkPermissions();
        if (status.publicStorage !== 'granted') {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== 'granted') {
            setAudioError("Storage permission is required to access your music.");
            return;
          }
        }
      } catch (err) {
        console.error("Permission check failed", err);
      }
    }

    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.load();
      audioRef.current.volume = volume;
      if (playbackStatus === PlaybackStatus.PLAYING) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentSong?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const onEnded = () => handleNext();
    const onLoadedMetadata = () => {
      if (currentSong && currentSong.duration === 0 && audio.duration) {
        setSongs(prev => prev.map(s => s.id === currentSong.id ? { ...s, duration: audio.duration } : s));
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [handleNext, currentSong?.id]);

  // Filtering Logic
  const filteredSongs: Song[] = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q) || 
      s.album.toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  const addedSongs: Song[] = useMemo(() => filteredSongs.filter(s => s.id.startsWith('local-')), [filteredSongs]);
  
  const upcomingSongs: Song[] = useMemo(() => {
    const afterCurrent = songs.slice(currentIndex + 1);
    if (!searchQuery.trim()) return afterCurrent;
    const q = searchQuery.toLowerCase();
    return afterCurrent.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.artist.toLowerCase().includes(q)
    );
  }, [songs, currentIndex, searchQuery]);

  const artistGroups: Record<string, Song[]> = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    filteredSongs.forEach(s => {
      if (!groups[s.artist]) groups[s.artist] = [];
      groups[s.artist].push(s);
    });
    return groups;
  }, [filteredSongs]);

  const navItems = [
    { id: 'all', label: 'All Songs', icon: Icons.Music },
    { id: 'playlist', label: 'Playlist', icon: Icons.List },
    { id: 'artist', label: 'Artist', icon: Icons.Users },
    { id: 'favorite', label: 'Favorite', icon: Icons.Heart },
  ];

  const sectionHeader = useMemo(() => {
    switch (mainMenuTab) {
      case 'all': return 'Music Library';
      case 'playlist': return 'Playlist & Queue';
      case 'artist': return 'Artists';
      case 'favorite': return 'Your Favorites';
      default: return '';
    }
  }, [mainMenuTab]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center p-4 md:p-6 lg:p-8 font-sans transition-all duration-1000">
      
      <div className="w-full max-w-7xl space-y-6 md:space-y-6 lg:space-y-8 mb-8 md:mb-6 lg:mb-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-2xl shadow-xl shadow-blue-500/20 rotate-3">
                <Icons.Music className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter">VIBE<span className="text-blue-500">SUN</span></h1>
            </div>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-3 bg-slate-900/60 border border-white/10 rounded-2xl text-slate-300 active:scale-90 transition-all"
            >
              {isMenuOpen ? <Icons.X className="w-6 h-6" /> : <Icons.Menu className="w-6 h-6" />}
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleScanLibrary}
              disabled={isScanning}
              className="relative flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 rounded-2xl transition-all text-sm font-bold border border-blue-500/20 active:scale-95 shadow-lg group overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/10 animate-pulse group-hover:bg-blue-500/20"></div>
              <Icons.Shield className="w-4 h-4 text-blue-400 relative z-10" />
              <span className="relative z-10">{isScanning ? 'Syncing...' : 'Sync Local Storage'}</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-sm font-bold border border-white/5 active:scale-95 shadow-sm"
            >
              <Icons.Upload className="w-4 h-4 text-slate-400" />
              Import
            </button>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="audio/*" className="hidden" />
            <input 
              type="file" 
              ref={folderInputRef} 
              onChange={handleFileUpload} 
              multiple 
              {...({ webkitdirectory: "", directory: "" } as any)} 
              className="hidden" 
            />
          </div>
        </header>

        {/* Main Menu Navigation with Search */}
        <nav className={`${isMenuOpen ? 'flex flex-col w-full' : 'hidden'} md:flex md:flex-row items-center justify-between gap-4 p-2 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95`}>
          <div className="flex flex-col md:flex-row gap-2 md:gap-1 lg:gap-4 w-full md:w-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setMainMenuTab(item.id as any);
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-3 md:gap-2 px-6 py-4 md:px-4 md:py-2.5 lg:px-6 lg:py-3 rounded-2xl text-sm font-bold transition-all duration-500 ${
                  mainMenuTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 md:scale-[1.02] lg:scale-[1.05]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <item.icon className={`w-5 h-5 md:w-4 lg:w-4 ${mainMenuTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                <span className="md:inline text-xs lg:text-sm whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-44 lg:w-80 group mt-2 md:mt-0 px-2 md:px-0 md:mr-2">
            <div className="absolute inset-y-0 left-5 md:left-3 flex items-center pointer-events-none">
              <Icons.Search className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-slate-800/40 border border-white/5 focus:border-blue-500/50 focus:bg-slate-800/60 rounded-xl py-3 md:py-2 lg:py-3 pl-12 md:pl-10 pr-10 outline-none transition-all text-sm placeholder:text-slate-600 text-slate-200"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-5 md:right-3 flex items-center text-slate-500 hover:text-white transition-colors"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            )}
          </div>
        </nav>
      </div>

      <main className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-start flex-1">
        
        {/* LEFT SIDE: PLAYER */}
        <div className="md:col-span-5 lg:col-span-6 xl:col-span-5 flex flex-col items-center space-y-6 md:space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000">
          
          <div className="relative w-48 sm:w-64 md:w-full aspect-square max-w-xs md:max-w-[280px] lg:max-w-md group">
            <div className="absolute inset-0 bg-blue-500/10 blur-[60px] md:blur-[80px] lg:blur-[120px] group-hover:bg-blue-500/20 transition-all duration-1000 rounded-full scale-90"></div>
            
            <img 
              src={playlistArt || currentSong?.coverUrl} 
              alt="Current Artwork" 
              className="relative w-full h-full object-cover rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl border-4 border-white/5 ring-1 ring-white/10 transition-transform duration-700 group-hover:scale-[1.02]"
            />
            
            {(isScanning) && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3.5rem] flex items-center justify-center z-20 border-4 border-blue-500/30">
                <div className="flex flex-col items-center gap-4 md:gap-4 lg:gap-6">
                  <div className="relative">
                    <Icons.Music className="w-10 h-10 md:w-12 lg:w-16 text-blue-500 animate-bounce" />
                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-40 animate-pulse"></div>
                  </div>
                  <p className="text-blue-400 font-black text-[10px] md:text-xs lg:text-xl animate-pulse tracking-widest uppercase text-center px-4">
                    Syncing...
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-6 md:bottom-8 lg:bottom-12 left-4 md:left-6 lg:left-8 right-4 md:right-6 lg:right-8 pointer-events-none">
               <AudioVisualizer 
                audioElement={audioRef.current} 
                isPlaying={playbackStatus === PlaybackStatus.PLAYING} 
              />
            </div>
          </div>

          <div className="text-center space-y-2 md:space-y-2 lg:space-y-4 w-full px-4">
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-slate-500 leading-[1.1]">{currentSong?.title}</h2>
            <div className="flex items-center justify-center gap-3 md:gap-2 lg:gap-4">
              <p className="text-slate-400 text-sm md:text-lg lg:text-2xl font-semibold tracking-tight">{currentSong?.artist}</p>
              <button 
                onClick={(e) => toggleFavorite(currentSong.id, e)}
                className={`p-1.5 md:p-1 lg:p-2 rounded-full transition-all hover:bg-white/5 ${currentSong?.favorite ? 'text-rose-500 scale-110' : 'text-slate-700 hover:text-rose-400'}`}
              >
                <Icons.Heart className="w-5 h-5 md:w-5 md:h-5 lg:w-7 lg:h-7" fill={currentSong?.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="w-full flex flex-col items-center gap-4 md:gap-4 lg:gap-8">
            <PlayerControls 
              isPlaying={playbackStatus === PlaybackStatus.PLAYING}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onShuffle={handleShuffle}
              progress={progress}
              onSeek={handleSeek}
              duration={currentSong?.duration || 0}
              volume={volume}
              onVolumeChange={handleVolumeChange}
            />
          </div>
          
          {audioError && (
            <div className="text-rose-400 text-[10px] md:text-[8px] lg:text-xs font-black bg-rose-500/10 px-6 py-4 rounded-3xl border border-rose-500/20 uppercase tracking-[0.2em] text-center mx-4">
              Error: {audioError}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: CONTENT / PLAYLIST */}
        <div className="md:col-span-7 lg:col-span-6 xl:col-span-7 flex flex-col gap-6 md:gap-6 lg:gap-8 animate-in fade-in slide-in-from-right-8 duration-1000">
          
          <div className="flex-1 flex flex-col bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] md:rounded-[2.5rem] lg:rounded-[3.5rem] overflow-hidden min-h-[500px] md:min-h-[500px] lg:min-h-[600px] shadow-2xl">
            <div className="p-6 md:p-6 lg:p-8 pb-4 flex items-center justify-between">
               <div>
                  <h3 className="text-[10px] md:text-[9px] lg:text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{sectionHeader}</h3>
                  <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
               </div>
               {mainMenuTab === 'all' && (
                 <button 
                  onClick={handleShuffle}
                  className="flex items-center gap-2 px-3 md:px-2 lg:px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl text-blue-400 text-[10px] md:text-[8px] lg:text-xs font-black tracking-widest transition-all uppercase"
                >
                  <Icons.Shuffle className="w-3.5 h-3.5 md:w-3 lg:w-4" />
                  Shuffle
                </button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-4 lg:p-8 custom-scrollbar pt-2">
              {mainMenuTab === 'playlist' ? (
                <div className="space-y-12 md:space-y-8 lg:space-y-12">
                   {addedSongs.length > 0 && (
                     <div className="space-y-6 md:space-y-4 animate-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center justify-between px-2">
                          <h4 className="text-[10px] md:text-[8px] lg:text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                            Internal Tracks
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-3 lg:gap-4">
                          {addedSongs.map(song => (
                            <div 
                              key={song.id} 
                              onClick={() => {
                                const idx = songs.findIndex(s => s.id === song.id);
                                setCurrentIndex(idx);
                                setPlaybackStatus(PlaybackStatus.PLAYING);
                              }}
                              className={`group cursor-pointer bg-white/5 rounded-2xl md:rounded-2xl lg:rounded-3xl p-2 md:p-2 lg:p-3 border border-white/5 transition-all hover:bg-white/10 hover:border-blue-500/30 ${currentSong?.id === song.id ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : ''}`}
                            >
                               <div className="relative aspect-square mb-2 md:mb-2 lg:mb-3 overflow-hidden rounded-xl md:rounded-xl lg:rounded-2xl shadow-lg">
                                 <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Icons.Play className="w-8 h-8 md:w-6 md:h-6 lg:w-10 lg:h-10 text-white" />
                                 </div>
                               </div>
                               <p className="text-[10px] md:text-[9px] lg:text-xs font-black truncate text-slate-200">{song.title}</p>
                            </div>
                          ))}
                        </div>
                     </div>
                   )}

                   <div className="space-y-6 md:space-y-4">
                      <h4 className="text-[10px] md:text-[8px] lg:text-sm font-black text-slate-500 uppercase tracking-widest px-2">Upcoming Queue</h4>
                      <div className="space-y-2">
                         {upcomingSongs.length > 0 ? upcomingSongs.map((song, i) => (
                           <SongItem 
                              key={song.id} 
                              song={song} 
                              isActive={false}
                              isPlaying={false}
                              onPlay={() => {
                                const idx = songs.findIndex(s => s.id === song.id);
                                setCurrentIndex(idx);
                                setPlaybackStatus(PlaybackStatus.PLAYING);
                              }}
                              onFavorite={(e) => toggleFavorite(song.id, e)}
                           />
                         )) : (
                           <div className="py-12 md:py-16 lg:py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] lg:rounded-[2.5rem]">
                              <p className="text-slate-600 text-[10px] md:text-[8px] lg:text-sm font-bold uppercase tracking-widest">
                                {searchQuery ? 'No matching songs found' : 'End of the line'}
                              </p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              ) : mainMenuTab === 'artist' ? (
                <div className="space-y-12 md:space-y-8 lg:space-y-12">
                  {Object.entries(artistGroups).map(([artist, artistSongs]) => (
                    <div key={artist} className="space-y-6 md:space-y-4">
                       <div className="flex items-center gap-4 md:gap-3 px-2">
                          <div className="w-10 h-10 md:w-8 md:h-8 lg:w-12 lg:h-12 rounded-2xl md:rounded-xl lg:rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-sm md:text-xs lg:text-lg font-black text-blue-500 shadow-xl">
                             {artist[0]}
                          </div>
                          <h4 className="text-lg md:text-base lg:text-xl font-black text-white tracking-tight">{artist}</h4>
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                          {artistSongs.map(song => (
                            <SongItem 
                              key={song.id} 
                              song={song} 
                              isActive={currentSong?.id === song.id}
                              isPlaying={playbackStatus === PlaybackStatus.PLAYING}
                              onPlay={() => {
                                const idx = songs.findIndex(s => s.id === song.id);
                                setCurrentIndex(idx);
                                setPlaybackStatus(PlaybackStatus.PLAYING);
                              }}
                              onFavorite={(e) => toggleFavorite(song.id, e)}
                            />
                          ))}
                       </div>
                    </div>
                  ))}
                  {Object.keys(artistGroups).length === 0 && (
                    <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest">
                      No matching artists
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSongs.filter(s => mainMenuTab === 'all' ? true : !!s.favorite).map((song) => (
                    <SongItem 
                      key={song.id} 
                      song={song} 
                      isActive={currentSong?.id === song.id}
                      isPlaying={playbackStatus === PlaybackStatus.PLAYING}
                      onPlay={() => {
                        const idx = songs.findIndex(s => s.id === song.id);
                        setCurrentIndex(idx);
                        setPlaybackStatus(PlaybackStatus.PLAYING);
                      }}
                      onFavorite={(e) => toggleFavorite(song.id, e)}
                    />
                  ))}
                  {filteredSongs.filter(s => mainMenuTab === 'all' ? true : !!s.favorite).length === 0 && (
                    <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest">
                      {searchQuery ? 'No results found' : (mainMenuTab === 'favorite' ? 'No favorites yet' : 'Library is empty')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <audio 
        ref={audioRef} 
        src={currentSong?.audioUrl} 
        onPlay={() => setPlaybackStatus(PlaybackStatus.PLAYING)}
        onPause={() => setPlaybackStatus(PlaybackStatus.PAUSED)}
      />

      <footer className="mt-8 md:mt-6 lg:mt-12 text-slate-700 text-[8px] md:text-[7px] lg:text-[10px] font-black uppercase tracking-[0.5em] pb-8 text-center px-4">
        VibeSun Local Audio Engine v2.5.0
      </footer>
    </div>
  );
};

interface SongItemProps {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onFavorite: (e: React.MouseEvent) => void;
}

const SongItem: React.FC<SongItemProps> = ({ song, isActive, isPlaying, onPlay, onFavorite }) => (
  <button
    onClick={onPlay}
    className={`w-full group flex items-center gap-3 md:gap-3 lg:gap-5 p-2.5 md:p-2 lg:p-4 rounded-[1.25rem] md:rounded-[1.25rem] lg:rounded-[1.75rem] transition-all border ${
      isActive ? 'bg-blue-600 shadow-xl shadow-blue-500/20 border-blue-400' : 'bg-white/[0.03] border-transparent hover:bg-white/5 hover:border-white/10'
    }`}
  >
    <div className="relative w-10 h-10 md:w-10 md:h-10 lg:w-14 lg:h-14 flex-shrink-0">
      <img src={song.coverUrl} className="w-full h-full rounded-xl md:rounded-xl lg:rounded-2xl object-cover shadow-lg" alt={song.title} />
      {isActive && isPlaying && (
        <div className="absolute inset-0 bg-blue-900/40 rounded-xl md:rounded-xl lg:rounded-2xl flex items-center justify-center backdrop-blur-sm">
           <div className="flex gap-0.5 md:gap-0.5 lg:gap-1 items-end h-3 md:h-3 lg:h-4">
              <div className="w-0.5 md:w-0.5 lg:w-1 bg-white animate-pulse"></div>
              <div className="w-0.5 md:w-0.5 lg:w-1 bg-white animate-pulse delay-75 h-1.5 md:h-1.5 lg:h-2"></div>
              <div className="w-0.5 md:w-0.5 lg:w-1 bg-white animate-pulse delay-150 h-2 md:h-2 lg:h-3"></div>
            </div>
        </div>
      )}
    </div>
    <div className="flex-1 text-left overflow-hidden">
      <div className="flex items-center gap-2">
        <p className={`font-black text-[11px] md:text-[10px] lg:text-sm truncate ${isActive ? 'text-white' : 'text-slate-100 group-hover:text-blue-400 transition-colors'}`}>{song.title}</p>
        {song.id.startsWith('local-') && (
           <span className={`text-[7px] md:text-[6px] lg:text-[8px] px-1.5 md:px-1 lg:px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'}`}>User</span>
        )}
      </div>
      <p className={`text-[8px] md:text-[7px] lg:text-[10px] uppercase font-black tracking-widest truncate ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>{song.artist}</p>
    </div>
    <div className="flex items-center gap-2 md:gap-2 lg:gap-4">
       <span className={`text-[9px] md:text-[8px] lg:text-[10px] font-mono font-bold hidden sm:inline ${isActive ? 'text-blue-100' : 'text-slate-600'}`}>
         {song.duration > 0 ? `${Math.floor(song.duration / 60)}:${(Math.floor(song.duration % 60)).toString().padStart(2, '0')}` : '0:00'}
       </span>
       <button 
        onClick={onFavorite}
        className={`p-1.5 md:p-1 lg:p-2 transition-all transform active:scale-150 ${song.favorite ? (isActive ? 'text-white' : 'text-rose-500') : (isActive ? 'text-blue-300' : 'text-slate-800 opacity-0 group-hover:opacity-100 hover:text-rose-400')}`}
      >
        <Icons.Heart className="w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5" fill={song.favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  </button>
);

export default App;
