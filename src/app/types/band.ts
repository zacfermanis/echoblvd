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