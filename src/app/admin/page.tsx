import type { Metadata } from 'next';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { LoginForm } from './login-form';
import { ShowsManager } from './shows-manager';

export const metadata: Metadata = {
	title: 'Admin - Echo Blvd',
	description: 'Admin dashboard for managing site content',
};

export default async function AdminPage() {
	const isAuthed = await isAuthenticatedFromCookies();

	return (
		<div className="min-h-screen bg-gray-900">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<h1 className="text-3xl sm:text-5xl font-bold text-white mb-8">Admin</h1>

				{!isAuthed ? (
					<div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
						<p className="text-gray-300 mb-4">
							Enter the admin password to access the dashboard.
						</p>
						<LoginForm />
					</div>
				) : (
					<div className="space-y-8">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold text-white">Dashboard</h2>
							<form
								action="/api/admin/logout"
								method="post"
								className="inline-block"
							>
								<button
									type="submit"
									className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-3 py-2"
								>
									Log out
								</button>
							</form>
						</div>
						<div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
							<ShowsManager />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}


