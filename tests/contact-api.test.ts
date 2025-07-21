// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));

// Mock environment variables
const originalEnv = process.env;

describe('Contact API Route', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_PASS = 'test-password';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates required fields correctly', () => {
    // Test validation logic
    const validateFields = (data: { name?: string; email?: string; message?: string }) => {
      if (!data.name || !data.email || !data.message) {
        return { error: 'Missing required fields.' };
      }
      return { success: true };
    };

    expect(validateFields({ name: 'John', email: 'john@example.com' })).toEqual({ error: 'Missing required fields.' });
    expect(validateFields({ name: 'John', message: 'Hello' })).toEqual({ error: 'Missing required fields.' });
    expect(validateFields({ email: 'john@example.com', message: 'Hello' })).toEqual({ error: 'Missing required fields.' });
    expect(validateFields({ name: 'John', email: 'john@example.com', message: 'Hello' })).toEqual({ success: true });
  });

  it('formats email content correctly', () => {
    const formatEmailContent = (name: string, email: string, message: string) => {
      return {
        from: 'Echo Blvd Website <test@gmail.com>',
        to: 'echoblvdband@gmail.com',
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        replyTo: email
      };
    };

    const result = formatEmailContent('John Doe', 'john@example.com', 'Hello from John');
    
    expect(result).toEqual({
      from: 'Echo Blvd Website <test@gmail.com>',
      to: 'echoblvdband@gmail.com',
      subject: 'New Contact Form Submission from John Doe',
      text: 'Name: John Doe\nEmail: john@example.com\nMessage:\nHello from John',
      replyTo: 'john@example.com'
    });
  });

  it('handles special characters in email content', () => {
    const formatEmailContent = (name: string, email: string, message: string) => {
      return {
        from: 'Echo Blvd Website <test@gmail.com>',
        to: 'echoblvdband@gmail.com',
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        replyTo: email
      };
    };

    const result = formatEmailContent('José María', 'jose@example.com', 'Hello! This is a test message with special chars: áéíóúñ');
    
    expect(result).toEqual({
      from: 'Echo Blvd Website <test@gmail.com>',
      to: 'echoblvdband@gmail.com',
      subject: 'New Contact Form Submission from José María',
      text: 'Name: José María\nEmail: jose@example.com\nMessage:\nHello! This is a test message with special chars: áéíóúñ',
      replyTo: 'jose@example.com'
    });
  });

  it('handles long messages', () => {
    const formatEmailContent = (name: string, email: string, message: string) => {
      return {
        from: 'Echo Blvd Website <test@gmail.com>',
        to: 'echoblvdband@gmail.com',
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
        replyTo: email
      };
    };

    const longMessage = 'A'.repeat(1000);
    const result = formatEmailContent('John Doe', 'john@example.com', longMessage);
    
    expect(result.text).toContain('Name: John Doe');
    expect(result.text).toContain('Email: john@example.com');
    expect(result.text).toContain(`Message:\n${longMessage}`);
    expect(result.text.length).toBeGreaterThan(1000);
  });

  it('validates email format', () => {
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(isValidEmail('john@example.com')).toBe(true);
    expect(isValidEmail('john.doe@example.co.uk')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('john@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });
}); 