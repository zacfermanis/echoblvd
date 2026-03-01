import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { SetListEntry } from '@/app/types/band';
import { SongDetail } from './song-detail';

type DbRow = {
	id: string;
	song: string;
	artist: string;
	length: string | null;
	zac_tuning: string | null;
	zac_pedal: string | null;
	zac_guitar: string | null;
	zac_keys: string | null;
	tom_tuning: string | null;
	tom_guitar: string | null;
	jeremy_tuning: string | null;
	jeremy_guitar: string | null;
};

const SELECT_COLS =
	'id, song, artist, length, zac_tuning, zac_pedal, zac_guitar, zac_keys, tom_tuning, tom_guitar, jeremy_tuning, jeremy_guitar';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const supabase = getSupabaseServiceClient();
	const { data } = await supabase
		.from('set_list')
		.select('song, artist')
		.eq('id', id)
		.single();
	const title = data ? `${data.song as string} – ${data.artist as string}` : 'Song Detail';
	return { title: `${title} - Admin - Echo Blvd` };
}

export default async function SongDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	const { id } = await params;
	const supabase = getSupabaseServiceClient();
	const { data, error } = await supabase
		.from('set_list')
		.select(SELECT_COLS)
		.eq('id', id)
		.single();

	if (error || !data) notFound();

	const row = data as DbRow;
	const entry: SetListEntry = {
		id: row.id,
		song: row.song,
		artist: row.artist,
		length: row.length ?? undefined,
		zacTuning: row.zac_tuning ?? undefined,
		zacPedal: row.zac_pedal ?? undefined,
		zacGuitar: row.zac_guitar ?? undefined,
		zacKeys: row.zac_keys ?? undefined,
		tomTuning: row.tom_tuning ?? undefined,
		tomGuitar: row.tom_guitar ?? undefined,
		jeremyTuning: row.jeremy_tuning ?? undefined,
		jeremyGuitar: row.jeremy_guitar ?? undefined,
	};

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8 flex items-center gap-4">
					<Link
						href="/admin/set-list"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Set List
					</Link>
				</div>
				<SongDetail entry={entry} />
			</div>
		</div>
	);
}
