import { NextResponse } from 'next/server';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { SetListEntry } from '@/app/types/band';

export const runtime = 'nodejs';

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

function rowToEntry(row: DbRow): SetListEntry {
	return {
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
}

const SELECT_COLS =
	'id, song, artist, length, zac_tuning, zac_pedal, zac_guitar, zac_keys, tom_tuning, tom_guitar, jeremy_tuning, jeremy_guitar';

export async function GET(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const supabase = getSupabaseServiceClient();

		if (id) {
			const { data, error } = await supabase
				.from('set_list')
				.select(SELECT_COLS)
				.eq('id', id)
				.single();
			if (error) throw error;
			return NextResponse.json(rowToEntry(data as DbRow));
		}

		const { data, error } = await supabase
			.from('set_list')
			.select(SELECT_COLS)
			.order('song', { ascending: true });
		if (error) throw error;
		return NextResponse.json((data ?? []).map(row => rowToEntry(row as DbRow)));
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to load set list' }, { status });
	}
}

export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as Partial<SetListEntry>;
		const supabase = getSupabaseServiceClient();
		const { data, error } = await supabase
			.from('set_list')
			.insert({
				song: body.song ?? '',
				artist: body.artist ?? '',
				length: body.length ?? null,
				zac_tuning: body.zacTuning ?? null,
				zac_pedal: body.zacPedal ?? null,
				zac_guitar: body.zacGuitar ?? null,
				zac_keys: body.zacKeys ?? null,
				tom_tuning: body.tomTuning ?? null,
				tom_guitar: body.tomGuitar ?? null,
				jeremy_tuning: body.jeremyTuning ?? null,
				jeremy_guitar: body.jeremyGuitar ?? null,
			})
			.select(SELECT_COLS)
			.single();
		if (error) throw error;
		return NextResponse.json(rowToEntry(data as DbRow), { status: 201 });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to create set list entry' }, { status });
	}
}

export async function PUT(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as Partial<SetListEntry> & { id: string };
		if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
		const supabase = getSupabaseServiceClient();
		const { data, error } = await supabase
			.from('set_list')
			.update({
				song: body.song,
				artist: body.artist,
				length: body.length ?? null,
				zac_tuning: body.zacTuning ?? null,
				zac_pedal: body.zacPedal ?? null,
				zac_guitar: body.zacGuitar ?? null,
				zac_keys: body.zacKeys ?? null,
				tom_tuning: body.tomTuning ?? null,
				tom_guitar: body.tomGuitar ?? null,
				jeremy_tuning: body.jeremyTuning ?? null,
				jeremy_guitar: body.jeremyGuitar ?? null,
			})
			.eq('id', body.id)
			.select(SELECT_COLS)
			.single();
		if (error) throw error;
		return NextResponse.json(rowToEntry(data as DbRow));
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to update set list entry' }, { status });
	}
}

export async function DELETE(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
		const supabase = getSupabaseServiceClient();
		const { error } = await supabase.from('set_list').delete().eq('id', id);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to delete set list entry' }, { status });
	}
}
