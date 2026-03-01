import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { SetListEntry } from '@/app/types/band';
import { RehearsalWheel } from './rehearsal-wheel';

export const metadata: Metadata = {
	title: 'Rehearsal - Admin - Echo Blvd',
	description: 'Spin the wheel to pick the next song to rehearse',
};

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

export default async function RehearsalPage() {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	const supabase = getSupabaseServiceClient();
	const { data } = await supabase
		.from('set_list')
		.select(
			'id, song, artist, length, zac_tuning, zac_pedal, zac_guitar, zac_keys, tom_tuning, tom_guitar, jeremy_tuning, jeremy_guitar',
		)
		.order('song', { ascending: true });

	const songs: SetListEntry[] = (data ?? []).map((row: DbRow) => ({
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
	}));

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8">
					<Link
						href="/admin"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Admin
					</Link>
				</div>
				<RehearsalWheel songs={songs} />
			</div>
		</div>
	);
}
