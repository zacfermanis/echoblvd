-- Practice "takes" — alternate track sets per song (e.g. rehearsal recordings)
-- Run after practice.sql. Original tracks have take_id NULL.

-- Takes table: one row per take (named set of stems for a song)
create table if not exists practice_song_takes (
	id uuid primary key default gen_random_uuid(),
	song_id uuid not null references practice_songs(id) on delete cascade,
	name text not null,
	created_at timestamptz not null default now()
);

alter table practice_song_takes enable row level security;

-- Allow multiple takes per song: tracks belong to song + optional take (NULL = original)
do $$
begin
	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'practice_song_tracks' and column_name = 'take_id'
	) then
		alter table practice_song_tracks
		add column take_id uuid references practice_song_takes(id) on delete cascade;
	end if;
end $$;

-- Ensure version column exists (used by client for cache busting)
do $$
begin
	if not exists (
		select 1 from information_schema.columns
		where table_schema = 'public' and table_name = 'practice_song_tracks' and column_name = 'version'
	) then
		alter table practice_song_tracks
		add column version text not null default gen_random_uuid()::text;
	end if;
end $$;

-- Replace single (song_id, track_key) unique with take-aware uniqueness
alter table practice_song_tracks drop constraint if exists uq_song_track;
create unique index if not exists uq_song_track_original
	on practice_song_tracks (song_id, track_key) where take_id is null;
create unique index if not exists uq_song_take_track
	on practice_song_tracks (song_id, take_id, track_key) where take_id is not null;
