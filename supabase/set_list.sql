-- Table: set_list
-- Represents the active set list for Echo Blvd.
-- Song lengths are stored as text in "M:SS" format (e.g. "4:26").
create table if not exists public.set_list (
  id             uuid    primary key default gen_random_uuid(),
  song           text    not null,
  artist         text    not null,
  length         text,
  zac_tuning     text,
  zac_pedal      text,
  zac_guitar     text,
  zac_keys       text,
  tom_tuning     text,
  tom_guitar     text,
  jeremy_tuning  text,
  jeremy_guitar  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Reuse the shared set_updated_at function (created by shows.sql).
-- If it doesn't exist yet, create it here.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_list_updated_at on public.set_list;
create trigger trg_set_list_updated_at
before update on public.set_list
for each row execute procedure public.set_updated_at();

-- Indexes
create index if not exists idx_set_list_song   on public.set_list (song);
create index if not exists idx_set_list_artist on public.set_list (artist);

-- Enable RLS and policies
alter table public.set_list enable row level security;

drop policy if exists "Allow read to all" on public.set_list;
create policy "Allow read to all"
on public.set_list
for select
to anon, authenticated
using (true);

-- No insert/update/delete for anon/authenticated by default.
-- Our server uses the service role key which bypasses RLS for writes.

-- Seed data (active set list)
insert into public.set_list (song, artist, length, zac_tuning, zac_pedal, zac_guitar, zac_keys, tom_tuning, tom_guitar, jeremy_tuning, jeremy_guitar)
values
  ('1979',                                                  'The Smashing Pumpkins',     '4:26', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('3AM',                                                   'Matchbox Twenty',           '3:45', 'Capo 1',       null, 'Ibanez',   null,       null, null, null, null),
  ('Alive',                                                 'Pearl Jam',                 '5:40', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Are You Gonna Go My Way',                               'Lenny Kravitz',             '3:31', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Bittersweet',                                           'Big Head Todd and The Monsters', '6:16', null,      null, 'Ibanez',   null,       null, null, null, null),
  ('Blurry',                                                'Puddle Of Mudd',            '5:04', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Cherub Rock',                                           'The Smashing Pumpkins',     '4:58', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('China Grove',                                           'Doobie Brothers',           '3:15', null,           null, 'Ibanez',   'Piano 1',  null, null, null, null),
  ('Dani California',                                       'RHCP',                      '4:42', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Don''t You Evah',                                       'Spoon',                     '3:36', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Drive',                                                 'Incubus',                   '3:52', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Elderly Woman Behind The Counter In a Small Town',      'Pearl Jam',                 '3:16', null,           null, 'Acoustic', null,       null, null, null, null),
  ('Eminence Front',                                        'The Who',                   '5:39', null,           null, null,       'E. Piano', null, null, null, null),
  ('Even Flow',                                             'Pearl Jam',                 '4:52', 'D A D F♯ A D', null, 'Epiphone', null,       null, null, null, null),
  ('Every1''s a Winnner',                                   'Ty Segall',                 '4:18', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Everything She Does Is Magic',                          'Ra',                        '3:46', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Float On',                                              'Modest Mouse',              '3:28', 'Capo 6',       null, 'Ibanez',   null,       null, null, null, null),
  ('Fly',                                                   'Sugar Ray',                 '4:04', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Good Love is On the Way',                               'John Mayer',                '4:18', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Good Times Bad Times',                                  'Led Zeppelin',              '2:46', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Interstate Love Song',                                  'STP',                       '3:14', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Just What I Needed',                                    'The Cars',                  '3:45', null,           null, null,       'Synth 1',  null, null, null, null),
  ('Low Rider',                                             'War',                       '3:10', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Machinehead',                                           'Bush',                      '4:16', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Mr Brightside',                                         'The Killers',               '3:42', null,           null, null,       'Synth 1',  null, null, null, null),
  ('Mr. Jones',                                             'Counting Crows',            '4:32', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('My Own Worst Enemy',                                    'Lit',                       '2:49', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('New Years Day',                                         'U2',                        '5:35', null,           null, null,       'Piano 1',  null, null, null, null),
  ('No Excuses',                                            'Alice in Chains',           '4:15', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Plush',                                                 'STP',                       '5:13', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Pressure and Time',                                     'Rival Sons',                '3:16', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Remedy',                                                'Black Crowes',              '5:52', null,           null, null,       'Piano 1',  null, null, null, null),
  ('Rockin in the Free World',                              'Neil Young',                '4:41', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Santa Monica',                                          'Everclear',                 '3:11', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Santeria',                                              'Sublime',                   '3:02', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Selling The Drama',                                     'Live',                      '3:25', '1/2 Down',     null, 'Ibanez',   null,       null, null, null, null),
  ('Semi-Charmed Life',                                     'Third Eye Blind',           '4:28', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Sex On Fire',                                           'Kings Of Leon',             '3:23', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Sharp Dressed Man',                                     'Nickelback/ZZ Top',         '4:18', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Shimmer',                                               'Fuel',                      '3:34', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Smells Like Billie Jean',                               'Nirvana / Michael Jackson', '5:01', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Soul Meets Body',                                       'Death Cab For Cutie',       '3:49', 'Capo 5',       null, 'Ibanez',   null,       null, null, null, null),
  ('Spoonman',                                              'Soundgarden',               '4:06', 'Dropped D',    null, 'Ibanez',   null,       null, null, null, null),
  ('The Ocean',                                             'Led Zeppelin',              '3:31', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Times Like These',                                      'Foo Fighters',              '4:25', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Tomorrow',                                              'Silverchair',               '4:26', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Two Princes',                                           'Spin Doctors',              '4:16', null,           null, 'Ibanez',   null,       null, null, null, null),
  ('Wish You Were Here',                                    'Incubus',                   '3:32', null,           null, 'Ibanez',   null,       null, null, null, null)
on conflict do nothing;
