import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactPage from '../src/app/contact/page';

// Mock the ContactForm component to isolate page tests
jest.mock('../src/app/contact/contact-form', () => ({
  ContactForm: () => <div data-testid="contact-form">Contact Form Component</div>
}));

describe('ContactPage', () => {
  it('renders contact page with correct title and description', () => {
    render(<ContactPage />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contact');
    expect(screen.getByText(/Get in touch with us for bookings/)).toBeInTheDocument();
  });

  it('renders contact form component', () => {
    render(<ContactPage />);
    
    expect(screen.getByTestId('contact-form')).toBeInTheDocument();
  });

  it('renders band contact information', () => {
    render(<ContactPage />);
    
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Band Contact Info');
    expect(screen.getByText(/echoblvdband@gmail.com/)).toBeInTheDocument();
    expect(screen.getByText(/Follow us on social media/)).toBeInTheDocument();
  });

  it('renders social media links with correct URLs', () => {
    render(<ContactPage />);
    
    const instagramLink = screen.getByLabelText('Instagram');
    const facebookLink = screen.getByLabelText('Facebook');
    const youtubeLink = screen.getByLabelText('YouTube');
    
    expect(instagramLink).toHaveAttribute('href', 'https://www.instagram.com/echoblvdband/');
    expect(facebookLink).toHaveAttribute('href', 'https://www.facebook.com/echoblvdmusic');
    expect(youtubeLink).toHaveAttribute('href', 'https://www.youtube.com/@EchoBlvdBand');
  });

  it('has accessible social media links with proper attributes', () => {
    render(<ContactPage />);
    
    const socialLinks = screen.getAllByRole('link');
    socialLinks.forEach(link => {
      if (link.getAttribute('href')?.includes('instagram') || 
          link.getAttribute('href')?.includes('facebook') || 
          link.getAttribute('href')?.includes('youtube')) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('aria-label');
      }
    });
  });
}); 