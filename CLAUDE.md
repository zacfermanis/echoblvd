## Notes

- Instagram feed uses Graph API with `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_USER_ID` in `.env.local`.
- Instagram media is rendered on `/social` with scroll-snap and uses Next Image remote pattern for `**.cdninstagram.com`.
- Hero landing video: default file is `public/Landing Page Video.mp4` (URL-encoded in code). Optional override: `NEXT_PUBLIC_HERO_VIDEO_URL` for an absolute MP4 URL (e.g. R2).

