import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AboutPage from '../src/app/about/page';

describe('AboutPage', () => {
  it('renders the About heading', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About');
  });

  it('renders the hero image for Echo Blvd', () => {
    render(<AboutPage />);
    // Alt text should clearly identify the band image
    const heroImg = screen.getByRole('img', { name: /echo blvd/i });
    expect(heroImg).toBeInTheDocument();
  });

  it('provides accessible hotspots for each visible member', () => {
    render(<AboutPage />);
    // Accessible labels per requirements
    expect(
      screen.queryByRole('button', { name: 'Open bio for Jeremy, Bass' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open bio for Tom, Lead Guitar' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open bio for Zac, Vocals, Rhythm Guitar, Keyboard' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open bio for Scott, Drums' })
    ).toBeInTheDocument();
  });

  it('does not mention Joe anywhere on the page while on hiatus', () => {
    render(<AboutPage />);
    expect(screen.queryByText(/joe/i)).not.toBeInTheDocument();
  });
});


