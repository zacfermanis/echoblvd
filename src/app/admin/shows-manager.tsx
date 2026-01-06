'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Show } from '@/app/types/band';

interface EditableShow extends Show {
	_localId: string;
	_isNew?: boolean;
	_isDirty?: boolean;
}

type ManagerMode = 'table' | 'edit';

function emptyShow(): EditableShow {
	const localId =
		(typeof globalThis !== 'undefined' &&
			'crypto' in globalThis &&
			typeof (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID === 'function' &&
			(globalThis as unknown as { crypto: { randomUUID: () => string } }).crypto.randomUUID()) ||
		`new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	return {
		id: '',
		date: new Date().toISOString().slice(0, 10),
		venue: '',
		city: '',
		country: 'US',
		isUpcoming: true,
		description: '',
		startTime: '',
		endTime: '',
		_localId: localId,
		_isNew: true,
		_isDirty: true,
	};
}

export function ShowsManager() {
	const [shows, setShows] = useState<EditableShow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<ManagerMode>('table');
	const [editing, setEditing] = useState<EditableShow | null>(null);
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		setToast({ message, type });
		window.setTimeout(() => setToast(null), 2600);
	}

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const res = await fetch('/api/admin/shows', { cache: 'no-store' });
				if (!res.ok) throw new Error('Failed to load shows');
				const data = (await res.json()) as Show[];
				if (isMounted) {
					setShows(
						data.map(s => ({
							...s,
							date: s.date.slice(0, 10),
							_localId: s.id,
						}))
					);
				}
			} catch (err) {
				if (isMounted) setError((err as Error).message);
			} finally {
				if (isMounted) setIsLoading(false);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	// inline editing was removed; updates handled via `editing` state

	async function saveShow(show: EditableShow) {
		setError(null);
		const payload: Partial<Show> = {
			id: show.id || undefined,
			date: new Date(show.date).toISOString(),
			venue: show.venue,
			city: show.city,
			isUpcoming: !!show.isUpcoming,
			description: show.description || undefined,
			startTime: show.startTime || undefined,
			endTime: show.endTime || undefined,
		};
		const isCreate = !show.id;
		const res = await fetch('/api/admin/shows', {
			method: isCreate ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.error ?? 'Failed to save show');
		}
		const saved = (await res.json()) as Show;
		setShows(prev => {
			const updated = prev.map(s =>
				s._localId === show._localId
					? { ...saved, date: saved.date.slice(0, 10), _localId: show._localId, _isNew: false, _isDirty: false }
					: s
			);
			const exists = updated.some(s => s._localId === show._localId);
			if (!exists) {
				updated.push({ ...saved, date: saved.date.slice(0, 10), _localId: show._localId, _isNew: false, _isDirty: false });
			}
			return updated;
		});
		showToast('Show saved', 'success');
		setEditing(null);
		setMode('table');
	}

	async function deleteShow(show: EditableShow) {
		setError(null);
		if (!show.id) {
			setShows(prev => prev.filter(s => s._localId !== show._localId));
			showToast('Discarded new show', 'success');
			return;
		}
		const res = await fetch(`/api/admin/shows?id=${encodeURIComponent(show.id)}`, {
			method: 'DELETE',
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(data.error ?? 'Failed to delete show');
		}
		setShows(prev => prev.filter(s => s._localId !== show._localId));
		showToast('Show deleted', 'success');
	}

	const sortedShows = useMemo(
		() =>
			[...shows].sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
			),
		[shows]
	);

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
				<h2 className="text-2xl font-semibold text-white">Manage Shows</h2>
				<button
					type="button"
					className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-white"
					onClick={() => {
						setEditing(emptyShow());
						setMode('edit');
					}}
				>
					Add show
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
									<th className="px-3 py-2">Date</th>
									<th className="px-3 py-2">Venue</th>
									<th className="px-3 py-2">City</th>
									<th className="px-3 py-2">Time</th>
									<th className="px-3 py-2">Upcoming</th>
									<th className="px-3 py-2">Actions</th>
								</tr>
							</thead>
							<tbody className="text-gray-200">
								{sortedShows.map(s => (
									<tr key={s._localId} className="border-b border-gray-800">
										<td className="px-3 py-2">{s.date}</td>
										<td className="px-3 py-2">{s.venue}</td>
										<td className="px-3 py-2">{s.city}</td>
										<td className="px-3 py-2">
											{s.startTime
												? `${s.startTime}${s.endTime ? ` – ${s.endTime}` : ''}`
												: 'TBD'}
										</td>
										<td className="px-3 py-2">{s.isUpcoming ? 'Yes' : 'No'}</td>
										<td className="px-3 py-2">
											<div className="flex gap-2">
												<button
													type="button"
													className="rounded-md border border-gray-600 px-2 py-1 hover:bg-gray-700"
													onClick={() => {
														setEditing({ ...s });
														setMode('edit');
													}}
												>
													Edit
												</button>
												<button
													type="button"
													className="rounded-md border border-red-500 text-red-400 px-2 py-1 hover:bg-red-500/10"
													onClick={() => {
														if (window.confirm('Delete this show?')) {
															void deleteShow(s).catch(err => showToast((err as Error).message, 'error'));
														}
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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label className="block">
							<span className="text-sm text-gray-300">Date</span>
							<input
								type="date"
								value={editing.date}
								onChange={e => setEditing({ ...editing, date: e.target.value, _isDirty: true })}
								className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
							/>
						</label>
						<label className="block">
							<span className="text-sm text-gray-300">Venue</span>
							<input
								type="text"
								value={editing.venue}
								onChange={e => setEditing({ ...editing, venue: e.target.value, _isDirty: true })}
								className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
								placeholder="Venue name"
							/>
						</label>
						<label className="block">
							<span className="text-sm text-gray-300">City</span>
							<input
								type="text"
								value={editing.city}
								onChange={e => setEditing({ ...editing, city: e.target.value, _isDirty: true })}
								className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
								placeholder="City"
							/>
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
							<label className="block">
								<span className="text-sm text-gray-300">Start time</span>
								<input
									type="time"
									value={editing.startTime ?? ''}
									onChange={e => setEditing({ ...editing, startTime: e.target.value, _isDirty: true })}
									className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
								/>
							</label>
							<label className="block">
								<span className="text-sm text-gray-300">End time</span>
								<input
									type="time"
									value={editing.endTime ?? ''}
									onChange={e => setEditing({ ...editing, endTime: e.target.value, _isDirty: true })}
									className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
								/>
							</label>
						</div>
						<label className="block md:col-span-2">
							<span className="text-sm text-gray-300">Description</span>
							<textarea
								value={editing.description ?? ''}
								onChange={e => setEditing({ ...editing, description: e.target.value, _isDirty: true })}
								className="mt-1 w-full rounded-md bg-gray-900 border border-gray-700 text-white px-3 py-2"
								rows={2}
								placeholder="Optional details"
							/>
						</label>
						<div className="flex items-center gap-6">
							<label className="inline-flex items-center gap-2">
								<input
									type="checkbox"
									checked={!!editing.isUpcoming}
									onChange={e => setEditing({ ...editing, isUpcoming: e.target.checked, _isDirty: true })}
									className="h-4 w-4"
								/>
								<span className="text-sm text-gray-300">Upcoming</span>
							</label>
						</div>
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
									void deleteShow(editing).catch(err => showToast((err as Error).message, 'error'));
								}}
								className="rounded-md border border-red-500 text-red-500 hover:bg-red-500/10 px-3 py-2"
							>
								Delete
							</button>
						) : null}
						<button
							type="button"
							onClick={() => {
								void saveShow(editing).catch(err => showToast((err as Error).message, 'error'));
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


