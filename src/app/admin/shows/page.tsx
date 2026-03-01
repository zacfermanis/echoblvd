import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { ShowsManager } from '../shows-manager';

export const metadata: Metadata = {
	title: 'Manage Shows - Admin - Echo Blvd',
	description: 'Add, edit, and remove shows',
};

export default async function AdminShowsPage() {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8 flex items-center gap-4">
					<Link
						href="/admin"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Dashboard
					</Link>
				</div>
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
					<ShowsManager />
				</div>
			</div>
		</div>
	);
}
