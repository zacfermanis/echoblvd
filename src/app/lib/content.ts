import { promises as fs } from 'fs';
import path from 'path';
import type { BandInfo, Track, Album, Show } from '@/app/types/band';
import { getSupabaseServerClient } from '@/app/lib/supabase';

const contentDirectory = path.join(process.cwd(), 'content');

export async function getBandInfo(): Promise<BandInfo> {
  const filePath = path.join(contentDirectory, 'band-info.json');
  const fileContents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileContents) as BandInfo;
}

export async function getShows(): Promise<Show[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('shows')
      .select('id, date, venue, city, country, is_upcoming, description, start_time, end_time')
      .order('date', { ascending: true });

    if (error) {
      console.error('Supabase getShows error:', error.message);
      return [];
    }

    return (data ?? []).map(row => ({
      id: row.id as string,
      date: row.date as string,
      venue: row.venue as string,
      city: row.city as string,
      country: row.country as string,
      isUpcoming: Boolean((row as { is_upcoming?: unknown }).is_upcoming),
      description: (row as { description?: string }).description,
      startTime: (row as { start_time?: string }).start_time ? (row as { start_time?: string }).start_time!.slice(0,5) : undefined,
      endTime: (row as { end_time?: string }).end_time ? (row as { end_time?: string }).end_time!.slice(0,5) : undefined,
    }));
  } catch {
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
  try {
    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('shows')
      .select('id, date, venue, city, country, is_upcoming, description, start_time, end_time')
      .gte('date', nowIso)
      .eq('is_upcoming', true)
      .order('date', { ascending: true });

    if (error) {
      console.error('Supabase getUpcomingShows error:', error.message);
      return [];
    }

    return (data ?? []).map(row => ({
      id: row.id as string,
      date: row.date as string,
      venue: row.venue as string,
      city: row.city as string,
      country: row.country as string,
      isUpcoming: Boolean((row as { is_upcoming?: unknown }).is_upcoming),
      description: (row as { description?: string }).description,
      startTime: (row as { start_time?: string }).start_time ? (row as { start_time?: string }).start_time!.slice(0,5) : undefined,
      endTime: (row as { end_time?: string }).end_time ? (row as { end_time?: string }).end_time!.slice(0,5) : undefined,
    }));
  } catch {
    return [];
  }
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