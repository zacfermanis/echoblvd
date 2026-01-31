import { getInstagramFeed } from '@/app/lib/instagram';

describe('getInstagramFeed', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns an empty array when Instagram credentials are missing', async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_USER_ID;

    const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;

    const result = await getInstagramFeed();

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps Instagram API responses into feed items', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
    process.env.INSTAGRAM_USER_ID = 'user-123';

    const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;

    const apiResponse = {
      data: [
        {
          id: 'media-1',
          caption: 'First post',
          media_type: 'IMAGE',
          media_url: 'https://example.com/image.jpg',
          permalink: 'https://instagram.com/p/one',
          timestamp: '2024-01-01T12:00:00+0000',
          username: 'echoblvdband',
        },
        {
          id: 'media-2',
          caption: 'Second post',
          media_type: 'VIDEO',
          media_url: 'https://example.com/video.mp4',
          thumbnail_url: 'https://example.com/video.jpg',
          permalink: 'https://instagram.com/p/two',
          timestamp: '2024-01-02T12:00:00+0000',
          username: 'echoblvdband',
        },
      ],
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(apiResponse), { status: 200 })
    );

    const result = await getInstagramFeed({ limit: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://graph.facebook.com/v20.0/user-123/media'),
      expect.objectContaining({
        cache: 'force-cache',
        next: { revalidate: 3600 },
      })
    );

    expect(result).toEqual([
      {
        id: 'media-1',
        caption: 'First post',
        mediaType: 'IMAGE',
        mediaUrl: 'https://example.com/image.jpg',
        permalink: 'https://instagram.com/p/one',
        timestamp: '2024-01-01T12:00:00+0000',
        username: 'echoblvdband',
      },
      {
        id: 'media-2',
        caption: 'Second post',
        mediaType: 'VIDEO',
        mediaUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/video.jpg',
        permalink: 'https://instagram.com/p/two',
        timestamp: '2024-01-02T12:00:00+0000',
        username: 'echoblvdband',
      },
    ]);
  });

  it('returns an empty array when the API response is not ok', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
    process.env.INSTAGRAM_USER_ID = 'user-123';

    const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;

    fetchMock.mockResolvedValue(new Response('Server error', { status: 500 }));

    const result = await getInstagramFeed();

    expect(result).toEqual([]);
  });
});

