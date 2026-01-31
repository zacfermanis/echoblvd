export type InstagramMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: InstagramMediaType;
  mediaUrl: string;
  permalink: string;
  thumbnailUrl?: string;
  timestamp: string;
  username?: string;
}

export interface InstagramFeedOptions {
  limit?: number;
  revalidateSeconds?: number;
}

