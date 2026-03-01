'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SetListEntry } from '@/app/types/band';

interface EditableEntry extends SetListEntry {
	_localId: string;
	_isNew?: boolean;
}

type ManagerMode = 'table' | 'edit';

function emptyEntry(): EditableEntry {
	const localId =
		(typeof globalThis !== 'undefined' &&
			'crypto' in globalThis &&
			typeof (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID === 'function' &&
			(globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()) ||
		`new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	return {
		id: '',
		song: '',
		artist: '',
		length: '',
		zacTuning: '',
		zacPedal: '',
		zacGuitar: '',
		zacKeys: '',
		tomTuning: '',
		tomGuitar: '',
		jeremyTuning: '',
		jeremyGuitar: '',
		_localId: localId,
		_isNew: true,
	};
}

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

export function SetListManager() {
	const [entries, setEntries] = useState<EditableEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<ManagerMode>('table');
	const [editing, setEditing] = useState<EditableEntry | null>(null);
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		setToast({ message, type });
		window.setTimeout(() => setToast(null), 2600);
	}

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch('/api/admin/set-list', { cache: 'no-store' });
				if (!res.ok) throw new Error('Failed to load set list');
				const data = (await res.json()) as SetListEntry[];
				if (isMounted)
					setEntries(data.map(e => ({ ...e, _localId: e.id })));
			} catch (err) {
				if (isMounted) setError((err as Error).message);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => { isMounted = false; };
	}, []);

	async function saveEntry(entry: EditableEntry) {
		setError(null);
		const payload: Partial<SetListEntry> = {
			id: entry.id || undefined,
			song: entry.song,
			artist: entry.artist,
			length: entry.length || undefined,
			zacTuning: entry.zacTuning || undefined,
			zacPedal: entry.zacPedal || undefined,
			zacGuitar: entry.zacGuitar || undefined,
			zacKeys: entry.zacKeys || undefined,
			tomTuning: entry.tomTuning || undefined,
			tomGuitar: entry.tomGuitar || undefined,
			jeremyTuning: entry.jeremyTuning || undefined,
			jeremyGuitar: entry.jeremyGuitar || undefined,
		};
		const isCreate = !entry.id;
		const res = await fetch('/api/admin/set-list', {
			method: isCreate ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error((data as { error?: string }).error ?? 'Failed to save entry');
		}
		const saved = (await res.json()) as SetListEntry;
		setEntries(prev => {
			const updated = prev.map(e =>
				e._localId === entry._localId
					? { ...saved, _localId: entry._localId, _isNew: false }
					: e
			);
			if (!updated.some(e => e._localId === entry._localId))
				updated.push({ ...saved, _localId: entry._localId, _isNew: false });
			return updated.sort((a, b) => a.song.localeCompare(b.song));
		});
		showToast('Entry saved', 'success');
		setEditing(null);
		setMode('table');
	}

	async function deleteEntry(entry: EditableEntry) {
		setError(null);
		if (!entry.id) {
			setEntries(prev => prev.filter(e => e._localId !== entry._localId));
			showToast('Discarded new entry', 'success');
			return;
		}
		const res = await fetch(`/api/admin/set-list?id=${encodeURIComponent(entry.id)}`, {
			method: 'DELETE',
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error((data as { error?: string }).error ?? 'Failed to delete entry');
		}
		setEntries(prev => prev.filter(e => e._localId !== entry._localId));
		showToast('Entry deleted', 'success');
	}

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

			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-white">Set List</h2>
				<button
					type="button"
					className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white"
					onClick={() => {
						setEditing(emptyEntry());
						setMode('edit');
					}}
				>
					Add song
				</button>
			</div>

			{isLoading ? <p className="text-gray-300">Loading…</p> : null}
			{error ? <p className="text-red-400">{error}</p> : null}

			{mode === 'table' ? (
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="text-left text-gray-300">
								<tr className="border-b border-gray-700">
									<th className="px-3 py-2 whitespace-nowrap">Song</th>
									<th className="px-3 py-2 whitespace-nowrap">Artist</th>
									<th className="px-3 py-2 whitespace-nowrap">Length</th>
									<th className="px-3 py-2 whitespace-nowrap">Actions</th>
								</tr>
							</thead>
							<tbody className="text-gray-200">
								{entries.map(e => (
									<tr key={e._localId} className="border-b border-gray-800">
										<td className="px-3 py-2 whitespace-nowrap">
											{e.id ? (
												<Link
													href={`/admin/set-list/${e.id}`}
													className="text-indigo-400 hover:text-indigo-300 hover:underline"
												>
													{e.song}
												</Link>
											) : (
												e.song
											)}
										</td>
										<td className="px-3 py-2 whitespace-nowrap">{e.artist}</td>
										<td className="px-3 py-2 whitespace-nowrap">{e.length ?? '—'}</td>
										<td className="px-3 py-2 whitespace-nowrap">
											<div className="flex gap-2">
												<button
													type="button"
													className="rounded-md border border-gray-600 px-2 py-1 hover:bg-gray-700"
													onClick={() => {
														setEditing({ ...e });
														setMode('edit');
													}}
												>
													Edit
												</button>
												<button
													type="button"
													className="rounded-md border border-red-500 text-red-400 px-2 py-1 hover:bg-red-500/10"
													onClick={() => {
														if (window.confirm(`Delete "${e.song}"?`))
															void deleteEntry(e).catch(err => showToast((err as Error).message, 'error'));
													}}
												>
													Delete
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : null}

			{mode === 'edit' && editing ? (
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{editFields.map(field => (
							<label key={field} className="block">
								<span className="text-sm text-gray-300">{fieldLabel[field]}</span>
								<input
									type="text"
									value={(editing[field] as string | undefined) ?? ''}
									onChange={e =>
										setEditing({ ...editing, [field]: e.target.value })
									}
									className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
									placeholder={fieldLabel[field]}
								/>
							</label>
						))}
					</div>
					<div className="mt-4 flex items-center justify-end gap-3">
						<button
							type="button"
							onClick={() => {
								setEditing(null);
								setMode('table');
							}}
							className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-3 py-2"
						>
							Cancel
						</button>
						{editing.id ? (
							<button
								type="button"
								onClick={() => {
									void deleteEntry(editing).catch(err =>
										showToast((err as Error).message, 'error')
									);
								}}
								className="rounded-md border border-red-500 text-red-500 hover:bg-red-500/10 px-3 py-2"
							>
								Delete
							</button>
						) : null}
						<button
							type="button"
							onClick={() => {
								void saveEntry(editing).catch(err =>
									showToast((err as Error).message, 'error')
								);
							}}
							className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2"
						>
							Save
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
