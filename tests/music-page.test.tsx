import { render, screen } from '@testing-library/react';
import MusicPage from '@/app/music/page';

describe('MusicPage', () => {
  it('renders the page title', () => {
    render(<MusicPage />);
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('renders the video section title', () => {
    render(<MusicPage />);
    const videoTitle = screen.getAllByText('Interstate Love Song')[0]; // Get the first occurrence (section title)
    expect(videoTitle).toBeInTheDocument();
    expect(videoTitle.tagName).toBe('H2');
  });

  it('renders the video iframe', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    expect(video).toBeInTheDocument();
    expect(video.tagName).toBe('IFRAME');
  });

  it('video iframe has correct src', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    expect(video).toHaveAttribute('src', 'https://www.youtube.com/embed/Lh-VdQjkhBo?rel=0');
  });

  it('video iframe has correct title', () => {
    render(<MusicPage />);
    const video = screen.getByTestId('music-video');
    expect(video).toHaveAttribute('title', 'Echo Blvd - Interstate Love Song');
  });

  it('renders the latest tracks section', () => {
    render(<MusicPage />);
    expect(screen.getByText('Latest Tracks')).toBeInTheDocument();
  });

  it('renders track cards with specific content', () => {
    render(<MusicPage />);
    // Test for specific button text to avoid conflicts
    expect(screen.getByText('Listen on Spotify')).toBeInTheDocument();
    expect(screen.getByText('View Shows')).toBeInTheDocument();
  });

  it('renders social media section', () => {
    render(<MusicPage />);
    expect(screen.getByText('Follow Echo Blvd')).toBeInTheDocument();
  });

  it('renders YouTube fallback link', () => {
    render(<MusicPage />);
    const youtubeLink = screen.getByText('Watch on YouTube');
    expect(youtubeLink).toBeInTheDocument();
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Lh-VdQjkhBo');
  });
}); 