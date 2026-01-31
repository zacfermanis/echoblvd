import { render, screen } from '@testing-library/react';
import SocialPage from '@/app/social/page';
import { getInstagramFeed } from '@/app/lib/instagram';

jest.mock('@/app/lib/instagram', () => ({
  getInstagramFeed: jest.fn(),
}));

const getInstagramFeedMock = jest.mocked(getInstagramFeed);

describe('SocialPage', () => {
  it('renders the social page header', async () => {
    getInstagramFeedMock.mockResolvedValue([]);

    render(await SocialPage());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Social');
    expect(
      screen.getByText(/Latest posts from Instagram/i)
    ).toBeInTheDocument();
  });

  it('renders the Instagram feed items', async () => {
    getInstagramFeedMock.mockResolvedValue([
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

    render(await SocialPage());

    expect(screen.getAllByTestId('instagram-feed-item')).toHaveLength(2);
    expect(screen.getByText('First post')).toBeInTheDocument();
    expect(screen.getByText('Second post')).toBeInTheDocument();
  });
});

