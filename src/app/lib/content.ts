import { promises as fs } from 'fs';
import path from 'path';
import type { BandInfo, Track, Album, Show } from '@/app/types/band';

const contentDirectory = path.join(process.cwd(), 'content');

export async function getBandInfo(): Promise<BandInfo> {
  const filePath = path.join(contentDirectory, 'band-info.json');
  const fileContents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileContents) as BandInfo;
}

export async function getShows(): Promise<Show[]> {
  try {
    const filePath = path.join(contentDirectory, 'shows.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents) as Show[];
  } catch (error) {
    // Return empty array if shows file doesn't exist yet
    return [];
  }
}

export async function getMusic(): Promise<{ tracks: Track[]; albums: Album[] }> {
  try {
    const tracksPath = path.join(contentDirectory, 'tracks.json');
    const albumsPath = path.join(contentDirectory, 'albums.json');
    
    const [tracksContents, albumsContents] = await Promise.all([
      fs.readFile(tracksPath, 'utf8').catch(() => '[]'),
      fs.readFile(albumsPath, 'utf8').catch(() => '[]')
    ]);
    
    return {
      tracks: JSON.parse(tracksContents) as Track[],
      albums: JSON.parse(albumsContents) as Album[]
    };
  } catch (error) {
    return { tracks: [], albums: [] };
  }
}

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  const now = new Date();
  
  return shows
    .filter(show => {
      const showDate = new Date(show.date);
      return showDate > now && show.isUpcoming;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getFeaturedTracks(): Promise<Track[]> {
  const { tracks } = await getMusic();
  return tracks.filter(track => track.featured);
}

export function formatShowDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatTrackDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 