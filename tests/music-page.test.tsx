import { render, screen } from '@testing-library/react';
import MusicPage from '@/app/music/page';

describe('MusicPage', () => {
  it('renders the page title', () => {
    render(<MusicPage />);
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('renders the video title', () => {
    render(<MusicPage />);
    expect(screen.getByText('Interstate Love Song')).toBeInTheDocument();
  });

  it('renders the video element', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    expect(video).toBeInTheDocument();
  });

  it('video has correct source', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    const source = video.querySelector('source');
    expect(source).toHaveAttribute('src', '/Interstate Love Song - Lower Banner.mp4');
    expect(source).toHaveAttribute('type', 'video/mp4');
  });

  it('video has controls', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    expect(video).toHaveAttribute('controls');
  });
}); 