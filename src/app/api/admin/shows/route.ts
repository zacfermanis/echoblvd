import { NextResponse } from 'next/server';
import { assertAuthenticated } from '@/app/lib/admin-auth';
import { getSupabaseServiceClient } from '@/app/lib/supabase';
import type { Show } from '@/app/types/band';

export const runtime = 'nodejs';

export async function GET() {
	try {
		await assertAuthenticated();
		const supabase = getSupabaseServiceClient();
		const { data, error } = await supabase
			.from('shows')
			.select('id, date, venue, city, country, is_upcoming, description, start_time, end_time')
			.order('date', { ascending: true });
		if (error) throw error;
		const shows: Show[] = (data ?? []).map(row => ({
			id: row.id as string,
			date: row.date as string,
			venue: row.venue as string,
			city: row.city as string,
			country: row.country as string,
			isUpcoming: Boolean((row as { is_upcoming?: unknown }).is_upcoming),
			description: (row as { description?: string }).description,
			startTime: (row as { start_time?: string }).start_time ? (row as { start_time?: string }).start_time!.slice(0,5) : undefined,
			endTime: (row as { end_time?: string }).end_time ? (row as { end_time?: string }).end_time!.slice(0,5) : undefined,
		}));
		return NextResponse.json(shows);
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to load shows' }, { status });
	}
}

export async function POST(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as Partial<Show>;
		const supabase = getSupabaseServiceClient();
		const insertPayload = {
			// let DB default handle id if not provided
			id: body.id,
			date: body.date ?? new Date().toISOString(),
			venue: body.venue ?? '',
			city: body.city ?? '',
			country: body.country ?? 'US',
			is_upcoming: body.isUpcoming ?? true,
			description: body.description ?? null,
			start_time: body.startTime ? `${body.startTime}:00` : null,
			end_time: body.endTime ? `${body.endTime}:00` : null,
		};
		const { data, error } = await supabase
			.from('shows')
			.insert(insertPayload)
			.select('id, date, venue, city, country, is_upcoming, description, start_time, end_time')
			.single();
		if (error) throw error;
		const created: Show = {
			id: data.id as string,
			date: data.date as string,
			venue: data.venue as string,
			city: data.city as string,
			country: data.country as string,
			isUpcoming: Boolean((data as { is_upcoming?: unknown }).is_upcoming),
			description: (data as { description?: string }).description,
			startTime: (data as { start_time?: string }).start_time ? (data as { start_time?: string }).start_time!.slice(0,5) : undefined,
			endTime: (data as { end_time?: string }).end_time ? (data as { end_time?: string }).end_time!.slice(0,5) : undefined,
		};
		return NextResponse.json(created, { status: 201 });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to create show' }, { status });
	}
}

export async function PUT(request: Request) {
	try {
		await assertAuthenticated();
		const body = (await request.json()) as Partial<Show> & { id: string };
		if (!body.id) {
			return NextResponse.json({ error: 'id is required' }, { status: 400 });
		}
		const supabase = getSupabaseServiceClient();
		const updatePayload = {
			date: body.date,
			venue: body.venue,
			city: body.city,
			// keep country unchanged unless provided
			country: body.country,
			is_upcoming: body.isUpcoming,
			description: body.description ?? null,
			start_time: body.startTime ? `${body.startTime}:00` : null,
			end_time: body.endTime ? `${body.endTime}:00` : null,
		};
		const { data, error } = await supabase
			.from('shows')
			.update(updatePayload)
			.eq('id', body.id)
			.select('id, date, venue, city, country, is_upcoming, description, start_time, end_time')
			.single();
		if (error) throw error;
		const updated: Show = {
			id: data.id as string,
			date: data.date as string,
			venue: data.venue as string,
			city: data.city as string,
			country: data.country as string,
			isUpcoming: Boolean((data as { is_upcoming?: unknown }).is_upcoming),
			description: (data as { description?: string }).description,
			startTime: (data as { start_time?: string }).start_time ? (data as { start_time?: string }).start_time!.slice(0,5) : undefined,
			endTime: (data as { end_time?: string }).end_time ? (data as { end_time?: string }).end_time!.slice(0,5) : undefined,
		};
		return NextResponse.json(updated);
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to update show' }, { status });
	}
}

export async function DELETE(request: Request) {
	try {
		await assertAuthenticated();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		if (!id) {
			return NextResponse.json({ error: 'id is required' }, { status: 400 });
		}
		const supabase = getSupabaseServiceClient();
		const { error } = await supabase.from('shows').delete().eq('id', id);
		if (error) throw error;
		return NextResponse.json({ ok: true });
	} catch (error: unknown) {
		const status = (error as { status?: number }).status ?? 500;
		return NextResponse.json({ error: 'Failed to delete show' }, { status });
	}
}


