import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/app/components/sections/hero-section';

describe('HeroSection', () => {
  it('renders the band logo', () => {
    render(<HeroSection />);
    expect(screen.getByAltText('Echo Blvd Logo')).toBeInTheDocument();
  });

  it('renders the event-focused band description', () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        /Echo Blvd is a high-energy live rock band based in the Raleigh-Durham area, available for private parties, corporate events, breweries, festivals, and community events./
      )
    ).toBeInTheDocument();
  });

  it('renders call-to-action buttons', () => {
    render(<HeroSection />);
    expect(screen.getByText('Book Echo Blvd')).toBeInTheDocument();
    expect(screen.getByText('Watch Live')).toBeInTheDocument();
  });

  it('renders social media links with correct URLs', () => {
    render(<HeroSection />);
    
    const instagramLink = screen.getByLabelText('Instagram');
    const facebookLink = screen.getByLabelText('Facebook');
    const youtubeLink = screen.getByLabelText('YouTube');
    
    expect(instagramLink).toHaveAttribute('href', 'https://www.instagram.com/echoblvdband/');
    expect(facebookLink).toHaveAttribute('href', 'https://www.facebook.com/echoblvdmusic');
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/@EchoBlvdBand');
  });
}); 