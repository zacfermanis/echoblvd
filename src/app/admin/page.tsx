import type { Metadata } from 'next';
import Link from 'next/link';
import { isAuthenticatedFromCookies } from '@/app/lib/admin-auth';
import { LoginForm } from './login-form';
import { LogoutButton } from './logout-button';

export const metadata: Metadata = {
	title: 'Admin - Echo Blvd',
	description: 'Admin dashboard for managing site content',
};

const dashboardItems = [
	{
		href: '/admin/shows',
		label: 'Manage Shows',
		description: 'Add, edit, or remove upcoming and past shows.',
		icon: '🎸',
	},
	{
		href: '/admin/set-list',
		label: 'Set List',
		description: 'Manage the active set list with song and gear notes.',
		icon: '🎵',
	},
	{
		href: '/admin/rehearsal',
		label: 'Rehearsal',
		description: 'Spin the wheel to randomly pick the next song to rehearse.',
		icon: '🎡',
	},
	{
		href: '/admin/practice',
		label: 'Practice',
		description: 'Multi-track stem player with per-track volume and mute controls.',
		icon: '🎛️',
	},
];

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
						<LogoutButton />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{dashboardItems.map(item => (
								<Link
									key={item.href}
									href={item.href}
									className="group flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-800 p-6 hover:border-indigo-500 hover:bg-gray-800/80 transition-colors"
								>
									<span className="text-3xl">{item.icon}</span>
									<span className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
										{item.label}
									</span>
									<span className="text-sm text-gray-400">{item.description}</span>
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}


