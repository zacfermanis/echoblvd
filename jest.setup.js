import '@testing-library/jest-dom';

jest.mock('next/cache', () => ({
  unstable_noStore: jest.fn(),
}));