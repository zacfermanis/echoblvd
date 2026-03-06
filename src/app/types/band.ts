// Band member information
export type BandMember = {
  name: string;
  role: string;
  bio: string;
  image: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
};

// Music track information
export type Track = {
  id: string;
  title: string;
  duration: string;
  album: string;
  releaseDate: string;
  streamingLinks: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
    bandcamp?: string;
  };
  featured?: boolean;
};

// Album information
export type Album = {
  id: string;
  title: string;
  releaseDate: string;
  coverImage: string;
  tracks: Track[];
  description: string;
  streamingLinks: {
    spotify?: string;
    appleMusic?: string;
    bandcamp?: string;
  };
};

// Show/concert information
export type Show = {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  isUpcoming: boolean;
  description?: string;
  startTime?: string; // 'HH:MM' in UI; DB may store 'HH:MM:SS'
  endTime?: string;   // 'HH:MM' in UI; DB may store 'HH:MM:SS'
};

// Set list entry
export interface SetListEntry {
  id: string;
  song: string;
  artist: string;
  length?: string;
  zacTuning?: string;
  zacPedal?: string;
  zacGuitar?: string;
  zacKeys?: string;
  tomTuning?: string;
  tomGuitar?: string;
  jeremyTuning?: string;
  jeremyGuitar?: string;
}

// Practice feature — stem-based multi-track player

export interface PracticeSong {
	id: string;
	title: string;
	artist: string;
	createdAt: string;
	tracks: PracticeSongTrack[];
	disabledTracks: string[];
}

export interface PracticeSongTrack {
	id: string;
	songId: string;
	trackKey: string;
	storagePath: string;
}

export const PRACTICE_TRACK_DEFS = [
	{ key: 'zac_vocals', label: 'Zac Vocals', group: 'Vocals' },
	{ key: 'jeremy_vocals', label: 'Jeremy Vocals', group: 'Vocals' },
	{ key: 'tom_vocals', label: 'Tom Vocals', group: 'Vocals' },
	{ key: 'scott_vocals', label: 'Scott Vocals', group: 'Vocals' },
	{ key: 'zac_guitar', label: 'Zac Guitar', group: 'Guitars & Keys' },
	{ key: 'zac_keys_r', label: 'Zac Keys (R)', group: 'Guitars & Keys' },
	{ key: 'zac_keys_l', label: 'Zac Keys (L)', group: 'Guitars & Keys' },
	{ key: 'tom_guitar', label: 'Tom Guitar', group: 'Guitars & Keys' },
	{ key: 'jeremy_bass', label: 'Jeremy Bass', group: 'Guitars & Keys' },
	{ key: 'kick_drum', label: 'Kick Drum', group: 'Drums' },
	{ key: 'snare_drum', label: 'Snare Drum', group: 'Drums' },
	{ key: 'overhead_drums', label: 'Overhead Drums', group: 'Drums' },
] as const;

export type PracticeTrackKey = (typeof PRACTICE_TRACK_DEFS)[number]['key'];

// Contact information
export type ContactInfo = {
  email: string;
  bookingEmail?: string;
  pressEmail?: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    spotify?: string;
    bandcamp?: string;
  };
};

// Band information
export type BandInfo = {
  name: string;
  description: string;
  genre: string;
  location: string;
  members: BandMember[];
  contact: ContactInfo;
  pressKit?: {
    bio: string;
    photos: string[];
    logo: string;
  };
};

// Newsletter signup
export type NewsletterSignup = {
  email: string;
  name?: string;
  preferences?: {
    showUpdates: boolean;
    newMusic: boolean;
    behindTheScenes: boolean;
  };
};

// Content for different pages
export type HomePageContent = {
  hero: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    callToAction: string;
  };
  featuredMusic: Track[];
  upcomingShows: Show[];
  latestNews?: string;
};

export type MusicPageContent = {
  albums: Album[];
  featuredTracks: Track[];
  description: string;
};

export type ShowsPageContent = {
  upcomingShows: Show[];
  pastShows: Show[];
  description: string;
};

export type AboutPageContent = {
  bandInfo: BandInfo;
  story: string;
  photos: string[];
};

export type ContactPageContent = {
  contactInfo: ContactInfo;
  bookingInfo?: string;
  pressInfo?: string;
}; 