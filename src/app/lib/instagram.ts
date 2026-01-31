import type { InstagramFeedOptions, InstagramMedia, InstagramMediaType } from '@/app/types/instagram';

const INSTAGRAM_BASE_URL = 'https://graph.facebook.com/v20.0';
const DEFAULT_FEED_LIMIT = 12;
const DEFAULT_REVALIDATE_SECONDS = 3600;

interface InstagramApiMedia {
  id: string;
  caption?: string;
  media_type: InstagramMediaType;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username?: string;
}

interface InstagramApiResponse {
  data: InstagramApiMedia[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInstagramMediaType(value: unknown): value is InstagramMediaType {
  return value === 'IMAGE' || value === 'VIDEO' || value === 'CAROUSEL_ALBUM';
}

function isInstagramApiMedia(value: unknown): value is InstagramApiMedia {
  if (!isRecord(value)) return false;

  const hasId = typeof value.id === 'string';
  const hasMediaUrl = typeof value.media_url === 'string';
  const hasPermalink = typeof value.permalink === 'string';
  const hasTimestamp = typeof value.timestamp === 'string';
  const hasMediaType = isInstagramMediaType(value.media_type);

  return hasId && hasMediaUrl && hasPermalink && hasTimestamp && hasMediaType;
}

function isInstagramApiResponse(value: unknown): value is InstagramApiResponse {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.data)) return false;

  return value.data.every(isInstagramApiMedia);
}

function buildInstagramMediaUrl(options: {
  userId: string;
  accessToken: string;
  limit: number;
}): string {
  const { userId, accessToken, limit } = options;
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
    'username',
  ].join(',');

  const params = new URLSearchParams({
    fields,
    limit: String(limit),
    access_token: accessToken,
  });

  return `${INSTAGRAM_BASE_URL}/${userId}/media?${params.toString()}`;
}

function mapInstagramMedia(item: InstagramApiMedia): InstagramMedia {
  return {
    id: item.id,
    caption: item.caption,
    mediaType: item.media_type,
    mediaUrl: item.media_url,
    permalink: item.permalink,
    thumbnailUrl: item.thumbnail_url,
    timestamp: item.timestamp,
    username: item.username,
  };
}

export async function getInstagramFeed(
  options: InstagramFeedOptions = {}
): Promise<InstagramMedia[]> {
  const {
    limit = DEFAULT_FEED_LIMIT,
    revalidateSeconds = DEFAULT_REVALIDATE_SECONDS,
  } = options;

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !userId) return [];

  const url = buildInstagramMediaUrl({ userId, accessToken, limit });

  try {
    const response = await fetch(url, {
      cache: 'force-cache',
      next: { revalidate: revalidateSeconds },
    });

    if (!response.ok) return [];

    const payload = await response.json();

    if (!isInstagramApiResponse(payload)) return [];

    return payload.data.map(mapInstagramMedia);
  } catch {
    return [];
  }
}

