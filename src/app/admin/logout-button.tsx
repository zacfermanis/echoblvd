'use client';

import { clearRehearsalState } from './rehearsal/rehearsal-wheel';

export function LogoutButton() {
	function handleSubmit() {
		clearRehearsalState();
	}

	return (
		<form action="/api/admin/logout" method="post" onSubmit={handleSubmit}>
			<button
				type="submit"
				className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-3 py-2"
			>
				Log out
			</button>
		</form>
	);
}
