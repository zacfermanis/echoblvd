import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { SetListManager } from './set-list-manager';

export const metadata: Metadata = {
	title: 'Set List - Admin - Echo Blvd',
	description: 'Manage the active set list',
};

export default async function AdminSetListPage() {
	const isAuthed = await isAuthenticatedFromCookies();
	if (!isAuthed) redirect('/admin');

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="mb-8 flex items-center gap-4">
					<Link
						href="/admin"
						className="text-sm text-gray-400 hover:text-white transition-colors"
					>
						← Dashboard
					</Link>
				</div>
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
					<SetListManager />
				</div>
			</div>
		</div>
	);
}
