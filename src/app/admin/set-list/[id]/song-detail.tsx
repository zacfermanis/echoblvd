'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SetListEntry } from '@/app/types/band';

const fieldLabel: Record<string, string> = {
	song: 'Song',
	artist: 'Artist',
	length: 'Length',
	zacTuning: 'Zac Tuning',
	zacPedal: 'Zac Pedal',
	zacGuitar: 'Zac Guitar',
	zacKeys: 'Zac Keys',
	tomTuning: 'Tom Tuning',
	tomGuitar: 'Tom Guitar',
	jeremyTuning: 'Jeremy Tuning',
	jeremyGuitar: 'Jeremy Guitar',
};

const editFields = Object.keys(fieldLabel) as (keyof SetListEntry)[];

interface Props {
	entry: SetListEntry;
}

export function SongDetail({ entry: initial }: Props) {
	const router = useRouter();
	const [mode, setMode] = useState<'view' | 'edit'>('view');
	const [editing, setEditing] = useState<SetListEntry>(initial);
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
	const [isBusy, setIsBusy] = useState(false);

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		setToast({ message, type });
		window.setTimeout(() => setToast(null), 2600);
	}

	async function saveEntry() {
		setIsBusy(true);
		try {
			const res = await fetch('/api/admin/set-list', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editing),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error((data as { error?: string }).error ?? 'Failed to save');
			}
			showToast('Saved', 'success');
			setMode('view');
		} catch (err) {
			showToast((err as Error).message, 'error');
		} finally {
			setIsBusy(false);
		}
	}

	async function deleteEntry() {
		if (!window.confirm(`Delete "${editing.song}"?`)) return;
		setIsBusy(true);
		try {
			const res = await fetch(`/api/admin/set-list?id=${encodeURIComponent(editing.id)}`, {
				method: 'DELETE',
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error((data as { error?: string }).error ?? 'Failed to delete');
			}
			router.push('/admin/set-list');
		} catch (err) {
			showToast((err as Error).message, 'error');
			setIsBusy(false);
		}
	}

	const members: { label: string; fields: (keyof SetListEntry)[] }[] = [
		{ label: 'Zac', fields: ['zacGuitar', 'zacTuning', 'zacPedal', 'zacKeys'] },
		{ label: 'Tom', fields: ['tomGuitar', 'tomTuning'] },
		{ label: 'Jeremy', fields: ['jeremyGuitar', 'jeremyTuning'] },
	];

	return (
		<div className="space-y-6">
			{toast ? (
				<div
					className={`fixed top-4 right-4 z-50 rounded-md px-4 py-2 shadow ${
						toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
					}`}
				>
					{toast.message}
				</div>
			) : null}

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-white">{editing.song}</h2>
					<p className="text-gray-400 mt-1">{editing.artist}</p>
					{editing.length ? (
						<p className="text-gray-500 text-sm mt-1">{editing.length}</p>
					) : null}
				</div>
				<div className="flex gap-2 shrink-0">
					{mode === 'view' ? (
						<>
							<button
								type="button"
								onClick={() => setMode('edit')}
								className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-3 py-2 text-sm"
							>
								Edit
							</button>
							<button
								type="button"
								onClick={() => void deleteEntry()}
								disabled={isBusy}
								className="rounded-md border border-red-500 text-red-400 hover:bg-red-500/10 px-3 py-2 text-sm disabled:opacity-50"
							>
								Delete
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => {
									setEditing(initial);
									setMode('view');
								}}
								className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-3 py-2 text-sm"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => void saveEntry()}
								disabled={isBusy}
								className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm disabled:opacity-50"
							>
								Save
							</button>
						</>
					)}
				</div>
			</div>

			{mode === 'view' ? (
				<div className="space-y-6">
					{/* General info */}
					<section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
						<h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
							General
						</h3>
						<dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
							{(['song', 'artist', 'length'] as (keyof SetListEntry)[]).map(field => (
								<div key={field}>
									<dt className="text-xs text-gray-500">{fieldLabel[field]}</dt>
									<dd className="mt-1 text-white">
										{(editing[field] as string | undefined) || '—'}
									</dd>
								</div>
							))}
						</dl>
					</section>

					{/* Per-member sections */}
					{members.map(({ label, fields }) => (
						<section key={label} className="rounded-lg border border-gray-700 bg-gray-800 p-5">
							<h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
								{label}
							</h3>
							<dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								{fields.map(field => (
									<div key={field}>
										<dt className="text-xs text-gray-500">{fieldLabel[field]}</dt>
										<dd className="mt-1 text-white">
											{(editing[field] as string | undefined) || '—'}
										</dd>
									</div>
								))}
							</dl>
						</section>
					))}
				</div>
			) : (
				/* Edit form */
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{editFields.map(field => (
							<label key={field} className="block">
								<span className="text-sm text-gray-300">{fieldLabel[field]}</span>
								<input
									type="text"
									value={(editing[field] as string | undefined) ?? ''}
									onChange={e => setEditing({ ...editing, [field]: e.target.value })}
									className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
									placeholder={fieldLabel[field]}
								/>
							</label>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
