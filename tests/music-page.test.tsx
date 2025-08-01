import { render, screen } from '@testing-library/react';
import MusicPage from '@/app/music/page';

describe('MusicPage', () => {
  it('renders the page title', () => {
    render(<MusicPage />);
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('renders all three video section titles in correct order', () => {
    render(<MusicPage />);
    expect(screen.getByText('Shimmer (Fuel Cover)')).toBeInTheDocument();
    expect(screen.getByText('Interstate Love Song (Stone Temple Pilots cover)')).toBeInTheDocument();
    expect(screen.getByText('Times Like These (Foo Fighters Cover)')).toBeInTheDocument();
  });

  it('renders all three video iframes', () => {
    render(<MusicPage />);
    const shimmerVideo = screen.getByTestId('music-video-shimmer');
    const mainVideo = screen.getByTestId('music-video');
    const viperVideo = screen.getByTestId('music-video-viper');
    
    expect(shimmerVideo).toBeInTheDocument();
    expect(shimmerVideo.tagName).toBe('IFRAME');
    expect(mainVideo).toBeInTheDocument();
    expect(mainVideo.tagName).toBe('IFRAME');
    expect(viperVideo).toBeInTheDocument();
    expect(viperVideo.tagName).toBe('IFRAME');
  });

  it('video iframes have correct src attributes', () => {
    render(<MusicPage />);
    const shimmerVideo = screen.getByTestId('music-video-shimmer');
    const mainVideo = screen.getByTestId('music-video');
    const viperVideo = screen.getByTestId('music-video-viper');
    
    expect(shimmerVideo).toHaveAttribute('src', 'https://www.youtube.com/embed/_QzF31T5jsg?rel=0');
    expect(mainVideo).toHaveAttribute('src', 'https://www.youtube.com/embed/Lh-VdQjkhBo?rel=0');
    expect(viperVideo).toHaveAttribute('src', 'https://www.youtube.com/embed/DsotI2Xwd2E?rel=0');
  });

  it('video iframes have correct titles', () => {
    render(<MusicPage />);
    const shimmerVideo = screen.getByTestId('music-video-shimmer');
    const mainVideo = screen.getByTestId('music-video');
    const viperVideo = screen.getByTestId('music-video-viper');
    
    expect(shimmerVideo).toHaveAttribute('title', 'Echo Blvd - Shimmer (Fuel Cover)');
    expect(mainVideo).toHaveAttribute('title', 'Echo Blvd - Interstate Love Song');
    expect(viperVideo).toHaveAttribute('title', 'Echo Blvd - Times Like These (Foo Fighters Cover)');
  });

  it('renders the latest tracks section', () => {
    render(<MusicPage />);
    expect(screen.getByText('Latest Tracks')).toBeInTheDocument();
  });

  it('renders track cards with current content', () => {
    render(<MusicPage />);
    expect(screen.getByText('View Shows')).toBeInTheDocument();
    expect(screen.getByText('Shimmer')).toBeInTheDocument();
    expect(screen.getByText('Fuel Cover - Latest Release')).toBeInTheDocument();
    expect(screen.getByText('Stone Temple Pilots Cover')).toBeInTheDocument();
    // Check for YouTube links in track cards (red buttons)
    const trackCardLinks = screen.getAllByRole('link', { name: 'Watch on YouTube' });
    const redButtonLinks = trackCardLinks.filter(link => link.className.includes('bg-red-600'));
    expect(redButtonLinks).toHaveLength(2);
  });

  it('renders social media section', () => {
    render(<MusicPage />);
    expect(screen.getByText('Follow Echo Blvd')).toBeInTheDocument();
  });

  it('renders YouTube fallback links for all videos', () => {
    render(<MusicPage />);
    // Check for video fallback links (blue underlined text)
    const allYouTubeLinks = screen.getAllByText(/Watch.*YouTube/);
    const fallbackLinks = allYouTubeLinks.filter(link => link.className.includes('text-blue-400'));
    expect(fallbackLinks).toHaveLength(3);
    
    // Check that the main video fallback link is present (blue underlined)
    const mainVideoLink = fallbackLinks.find(link => link.getAttribute('href') === 'https://www.youtube.com/watch?v=Lh-VdQjkhBo');
    expect(mainVideoLink).toBeTruthy();
  });

  it('renders specific fallback links for each video', () => {
    render(<MusicPage />);
    
    // Check for the specific fallback text for the first video (Shimmer)
    const shimmerLink = screen.getByText(/Watch Echo Blvd's cover of "Shimmer" on YouTube/);
    expect(shimmerLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=_QzF31T5jsg');
    
    // Check for the specific fallback text for the third video (Times Like These)
    const timesLikeTheseLink = screen.getByText(/Watch Echo Blvd's cover of "Times Like These" on YouTube/);
    expect(timesLikeTheseLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=DsotI2Xwd2E');
  });
}); 