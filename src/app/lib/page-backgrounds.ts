/**
 * Paths to band photos in /public. Filenames are encoded for URL safety (spaces, etc.).
 */
function publicImage(fileName: string): string {
  return `/${encodeURIComponent(fileName)}`;
}

export const pageBackgrounds = {
  home: publicImage('20260331-Echo Blvd 16.jpg'),
  book: publicImage('20260331-Echo Blvd 40.jpg'),
  music: publicImage('20260331-Echo blvd bass photo.jpg'),
  shows: publicImage('20260331-Echo Blvd 9.jpg'),
  social: publicImage('20260331-Echo Blvd 28.jpg'),
  about: publicImage('20260331-Arboretum with Rin 17.jpg'),
  contact: publicImage('20260331-Echo Blvd 26.jpg'),
} as const;
