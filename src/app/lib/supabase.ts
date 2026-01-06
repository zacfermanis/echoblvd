import { createClient } from '@supabase/supabase-js';

export function getSupabaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
	if (!url) throw new Error('SUPABASE_URL is not configured');
	return url;
}

export function getSupabaseAnonKey(): string {
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
	if (!key) throw new Error('SUPABASE_ANON_KEY is not configured');
	return key;
}

export function getSupabaseServiceRoleKey(): string {
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
	return key;
}

export function getSupabaseServerClient() {
	return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
		auth: { persistSession: false },
	});
}

export function getSupabaseServiceClient() {
	return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
		auth: { persistSession: false },
	});
}


