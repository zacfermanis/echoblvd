-- Practice feature schema
-- Stores songs with individual stem tracks for the admin practice player

-- Songs table
create table if not exists practice_songs (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	artist text not null,
	created_at timestamptz not null default now()
);

-- Tracks table (one row per uploaded stem per song)
create table if not exists practice_song_tracks (
	id uuid primary key default gen_random_uuid(),
	song_id uuid not null references practice_songs(id) on delete cascade,
	track_key text not null, -- e.g. 'zac_vocals', 'kick_drum'
	storage_path text not null, -- e.g. 'songs/{song_id}/zac_vocals.mp3'
	created_at timestamptz not null default now(),
	constraint uq_song_track unique (song_id, track_key)
);

-- RLS: no public access — all reads/writes go through the service role key
alter table practice_songs enable row level security;
alter table practice_song_tracks enable row level security;

-- ============================================================
-- Cloudflare R2 bucket setup (see Cloudflare dashboard)
-- ============================================================
-- Audio stems are stored in Cloudflare R2 (S3-compatible).
-- Required environment variables:
--   R2_ACCOUNT_ID        — Cloudflare account ID
--   R2_ACCESS_KEY_ID     — R2 API token access key
--   R2_SECRET_ACCESS_KEY — R2 API token secret key
--   R2_BUCKET_NAME       — bucket name (default: song-stems)
--
-- File layout inside the bucket:
--   songs/{song_uuid}/{track_key}.mp3
-- ============================================================
