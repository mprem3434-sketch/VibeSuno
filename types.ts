
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  genre?: string;
  favorite?: boolean;
}

export interface PlaylistRequest {
  mood: string;
  count: number;
}

export interface AIRating {
  vibeScore: number;
  reason: string;
}

export enum PlaybackStatus {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED'
}
