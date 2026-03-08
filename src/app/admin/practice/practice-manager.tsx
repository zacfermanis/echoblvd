'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { PRACTICE_TRACK_DEFS } from '@/app/types/band';
import type { PracticeSong, PracticeSongTrack, PracticeTake } from '@/app/types/band';

type View = 'list' | 'manage';

interface Toast {
	message: string;
	type: 'success' | 'error';
}

interface Props {
	initialSongs: PracticeSong[];
}

export function PracticeManager({ initialSongs }: Props) {
	const [view, setView] = useState<View>('list');
	const [songs, setSongs] = useState<PracticeSong[]>(initialSongs);

	async function refreshSongs() {
		const res = await fetch('/api/admin/practice/songs');
		if (res.ok) setSongs((await res.json()) as PracticeSong[]);
	}

	if (view === 'manage') {
		return (
			<ManageView
				songs={songs}
				setSongs={setSongs}
				onBack={async () => {
					await refreshSongs();
					setView('list');
				}}
				onTakeAdded={refreshSongs}
			/>
		);
	}

	// Song list view
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-white">Practice</h1>
					<p className="text-gray-400 text-sm mt-1">
						{songs.length} {songs.length === 1 ? 'song' : 'songs'} available
					</p>
				</div>
				<button
					type="button"
					onClick={() => setView('manage')}
					className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
				>
					Manage Songs
				</button>
			</div>

			{songs.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-700 p-16 text-center">
					<p className="text-5xl mb-4">🎛️</p>
					<p className="text-gray-300 font-medium">No songs added yet</p>
					<p className="text-gray-500 text-sm mt-2">
						Add songs and upload their stems to get started.
					</p>
					<button
						type="button"
						onClick={() => setView('manage')}
						className="mt-6 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 text-sm font-medium transition-colors"
					>
						Add First Song
					</button>
				</div>
		) : (
			<div className="rounded-lg border border-gray-700 overflow-hidden divide-y divide-gray-700">
				{songs.map((song) => (
					<div key={song.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/60 transition-colors">
					{/* Song info */}
					<div className="flex-1 min-w-0">
						<span className="font-medium text-white text-sm">{song.title}</span>
						<span className="ml-2 text-gray-500 text-sm">{song.artist}</span>
					</div>

					{/* Track count */}
					<span className="text-xs text-gray-600 shrink-0">
						{song.tracks.length} tracks
					</span>

					{/* Original + takes buttons */}
					<div className="flex items-center gap-1.5 shrink-0">
						<Link
							href={`/admin/practice/${song.id}`}
							className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-sm font-medium transition-colors"
						>
							Original
						</Link>
						{song.takes?.map((take) => (
							<Link
								key={take.id}
								href={`/admin/practice/${song.id}?takeId=${take.id}`}
								className="rounded-md border border-gray-600 text-gray-300 hover:border-indigo-500 hover:text-indigo-300 px-3 py-1.5 text-sm font-medium transition-colors"
							>
								{take.name}
							</Link>
						))}
					</div>
					</div>
				))}
			</div>
		)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// ConfirmDialog — modal replacement for window.confirm()
// ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
	title: string;
	message: string;
	confirmLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

function ConfirmDialog({
	title,
	message,
	confirmLabel = 'Delete',
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onCancel}
		>
			<div
				className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4"
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className="text-white font-semibold text-lg">{title}</h3>
				<p className="text-gray-400 text-sm leading-relaxed">{message}</p>
				<div className="flex gap-3 justify-end pt-1">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 text-sm rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

function TrackStatusBar({ tracks, disabledTracks }: { tracks: PracticeSongTrack[]; disabledTracks: string[] }) {
	const uploadedKeys = new Set(tracks.map((t) => t.trackKey));
	// Only count tracks that are not hidden (disabled + not yet uploaded)
	const activeTotal = PRACTICE_TRACK_DEFS.filter(
		(t) => !disabledTracks.includes(t.key) || uploadedKeys.has(t.key),
	).length;
	const uploaded = uploadedKeys.size;
	const pct = activeTotal > 0 ? Math.round((uploaded / activeTotal) * 100) : 0;

	return (
		<div className="space-y-1">
			<div className="flex justify-between text-xs text-gray-500">
				<span>Tracks</span>
				<span>
					{uploaded}/{activeTotal}
				</span>
			</div>
			<div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
				<div
					className="h-full bg-indigo-500 rounded-full transition-all"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// Manage view
// ─────────────────────────────────────────────────────────────

interface ManageViewProps {
	songs: PracticeSong[];
	setSongs: React.Dispatch<React.SetStateAction<PracticeSong[]>>;
	onBack: () => void;
	onTakeAdded?: () => void;
}

function ManageView({ songs, setSongs, onBack, onTakeAdded }: ManageViewProps) {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newArtist, setNewArtist] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [toast, setToast] = useState<Toast | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<PracticeSong | null>(null);

	function showToast(message: string, type: Toast['type'] = 'success') {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	}

	async function handleAddSong(e: React.FormEvent) {
		e.preventDefault();
		if (!newTitle.trim() || !newArtist.trim()) return;
		setIsSubmitting(true);
		try {
			const res = await fetch('/api/admin/practice/songs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: newTitle.trim(), artist: newArtist.trim() }),
			});
			if (!res.ok) throw new Error('Failed');
			const song = (await res.json()) as PracticeSong;
			setSongs((prev) => [...prev, song].sort((a, b) => a.title.localeCompare(b.title)));
			setNewTitle('');
			setNewArtist('');
			setIsAdding(false);
			setExpandedId(song.id);
			showToast(`"${song.title}" added`);
		} catch {
			showToast('Failed to add song', 'error');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function doDeleteSong(song: PracticeSong) {
		setDeleteConfirm(null);
		const res = await fetch(`/api/admin/practice/songs?id=${song.id}`, { method: 'DELETE' });
		if (res.ok) {
			setSongs((prev) => prev.filter((s) => s.id !== song.id));
			showToast(`"${song.title}" deleted`);
		} else {
			showToast('Failed to delete song', 'error');
		}
	}

	return (
		<div className="space-y-6">
			{/* Toast */}
			{toast && (
				<div
					className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-xl transition-all ${
						toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
					}`}
				>
					{toast.message}
				</div>
			)}

			{/* Song delete confirmation */}
			{deleteConfirm && (
				<ConfirmDialog
					title={`Delete "${deleteConfirm.title}"?`}
					message={`This will permanently delete the song and all ${deleteConfirm.tracks.length > 0 ? `${deleteConfirm.tracks.length} uploaded stem${deleteConfirm.tracks.length !== 1 ? 's' : ''}` : 'its data'}. This cannot be undone.`}
					confirmLabel="Delete Song"
					onConfirm={() => void doDeleteSong(deleteConfirm)}
					onCancel={() => setDeleteConfirm(null)}
				/>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-white">Manage Songs</h1>
					<p className="text-gray-400 text-sm mt-1">
						Add songs and upload individual stem tracks
					</p>
				</div>
				<button
					type="button"
					onClick={onBack}
					className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
				>
					← Song List
				</button>
			</div>

			{/* Add song */}
			{!isAdding ? (
				<button
					type="button"
					onClick={() => setIsAdding(true)}
					className="w-full rounded-lg border-2 border-dashed border-gray-600 hover:border-indigo-500 py-5 text-sm text-gray-400 hover:text-indigo-400 transition-colors"
				>
					+ Add New Song
				</button>
			) : (
				<form
					onSubmit={handleAddSong}
					className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4"
				>
					<h3 className="text-lg font-semibold text-white">New Song</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs text-gray-400 mb-1.5">Song Title</label>
							<input
								type="text"
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
								placeholder="e.g. Shimmer"
								required
								className="w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
							/>
						</div>
						<div>
							<label className="block text-xs text-gray-400 mb-1.5">Artist</label>
							<input
								type="text"
								value={newArtist}
								onChange={(e) => setNewArtist(e.target.value)}
								placeholder="e.g. Fuel"
								required
								className="w-full rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
							/>
						</div>
					</div>
					<div className="flex gap-3">
						<button
							type="submit"
							disabled={isSubmitting}
							className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
						>
							{isSubmitting ? 'Adding…' : 'Add Song'}
						</button>
						<button
							type="button"
							onClick={() => {
								setIsAdding(false);
								setNewTitle('');
								setNewArtist('');
							}}
							className="rounded-md border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
						>
							Cancel
						</button>
					</div>
				</form>
			)}

			{/* Song list with track managers */}
			{songs.length === 0 ? (
				<p className="text-center text-gray-600 py-10">No songs yet.</p>
			) : (
				<div className="space-y-4">
					{songs.map((song) => (
						<SongTrackManager
							key={song.id}
							song={song}
							isExpanded={expandedId === song.id}
							onToggle={() =>
								setExpandedId((prev) => (prev === song.id ? null : song.id))
							}
							onDelete={() => setDeleteConfirm(song)}
							onTrackChange={(updated) => {
								setSongs((prev) =>
									prev.map((s) => (s.id === updated.id ? updated : s)),
								);
							}}
							onTakeAdded={onTakeAdded}
							showToast={showToast}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// SongTrackManager — per-song track upload UI
// ─────────────────────────────────────────────────────────────

interface SongTrackManagerProps {
	song: PracticeSong;
	isExpanded: boolean;
	onToggle: () => void;
	onDelete: () => void;
	onTrackChange: (updated: PracticeSong) => void;
	onTakeAdded?: () => void;
	showToast: (msg: string, type?: Toast['type']) => void;
}

function SongTrackManager({
	song,
	isExpanded,
	onToggle,
	onDelete,
	onTrackChange,
	onTakeAdded,
	showToast,
}: SongTrackManagerProps) {
	const [selectedTakeId, setSelectedTakeId] = useState<string | null>(null);
	const [showHidden, setShowHidden] = useState(false);
	const [isAddingTake, setIsAddingTake] = useState(false);
	const [deleteTakeConfirm, setDeleteTakeConfirm] = useState<PracticeTake | null>(null);
	const [renamingTakeId, setRenamingTakeId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');

	const effectiveTracks =
		selectedTakeId != null && (song.takes?.length ?? 0) > 0
			? (song.takes?.find((t) => t.id === selectedTakeId)?.tracks ?? [])
			: song.tracks;
	const uploadedKeys = new Map(effectiveTracks.map((t) => [t.trackKey, t]));
	const uploadedCount = uploadedKeys.size;

	// disabled = in DB disabledTracks AND not yet uploaded (uploaded always shows)
	const disabledSet = new Set(song.disabledTracks ?? []);
	const hiddenCount = [...disabledSet].filter((k) => !uploadedKeys.has(k)).length;

	const visibleDefs = PRACTICE_TRACK_DEFS.filter((t) => {
		const isDisabled = disabledSet.has(t.key) && !uploadedKeys.has(t.key);
		return !isDisabled || showHidden;
	});

	function handleTracksChange(newTracks: PracticeSongTrack[]) {
		if (selectedTakeId == null || selectedTakeId === '') {
			onTrackChange({ ...song, tracks: newTracks });
		} else {
			onTrackChange({
				...song,
				takes: (song.takes ?? []).map((t) =>
					t.id === selectedTakeId ? { ...t, tracks: newTracks } : t,
				),
			});
		}
	}

	async function handleAddTake() {
		setIsAddingTake(true);
		try {
			const res = await fetch('/api/admin/practice/takes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ songId: song.id }),
			});
			if (!res.ok) throw new Error('Failed to create take');
			showToast('Take added — upload tracks for this take below');
			onTakeAdded?.();
			const take = (await res.json()) as { id: string; name: string };
			setSelectedTakeId(take.id);
		} catch {
			showToast('Failed to add take', 'error');
		} finally {
			setIsAddingTake(false);
		}
	}

	async function doDeleteTake(take: PracticeTake) {
		setDeleteTakeConfirm(null);
		try {
			const res = await fetch(`/api/admin/practice/takes?id=${take.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete take');
			if (selectedTakeId === take.id) setSelectedTakeId(null);
			showToast(`"${take.name}" deleted`);
			onTakeAdded?.();
		} catch {
			showToast('Failed to delete take', 'error');
		}
	}

	async function renameTake(take: PracticeTake, newName: string) {
		setRenamingTakeId(null);
		const trimmed = newName.trim();
		if (!trimmed || trimmed === take.name) return;
		try {
			const res = await fetch('/api/admin/practice/takes', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: take.id, name: trimmed }),
			});
			if (!res.ok) throw new Error('Failed to rename take');
			const updated = (await res.json()) as PracticeTake;
			onTrackChange({
				...song,
				takes: (song.takes ?? []).map((t) =>
					t.id === take.id ? { ...t, name: updated.name } : t,
				),
			});
			showToast(`Renamed to "${updated.name}"`);
		} catch {
			showToast('Failed to rename take', 'error');
		}
	}

	async function persistDisabled(newDisabled: string[]) {
		try {
			const res = await fetch(`/api/admin/practice/songs?id=${song.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ disabledTracks: newDisabled }),
			});
			if (!res.ok) throw new Error('Failed');
		} catch {
			showToast('Failed to update track visibility', 'error');
		}
	}

	function hideTrack(trackKey: string) {
		const newDisabled = [...new Set([...(song.disabledTracks ?? []), trackKey])];
		onTrackChange({ ...song, disabledTracks: newDisabled });
		void persistDisabled(newDisabled);
	}

	function restoreTrack(trackKey: string) {
		const newDisabled = (song.disabledTracks ?? []).filter((k) => k !== trackKey);
		onTrackChange({ ...song, disabledTracks: newDisabled });
		void persistDisabled(newDisabled);
	}

	return (
		<div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
			{/* Header row */}
			<div className="flex items-center gap-4 px-6 py-4">
				<button
					type="button"
					onClick={onToggle}
					className="flex-1 flex items-center gap-3 text-left group"
				>
					<span
						className={`text-gray-500 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}
					>
						▶
					</span>
					<div>
						<span className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
							{song.title}
						</span>
						<span className="ml-2 text-gray-400 text-sm">{song.artist}</span>
					</div>
					<span className="ml-auto text-xs text-gray-500">
						{uploadedCount}/{PRACTICE_TRACK_DEFS.length - hiddenCount} tracks
					</span>
				</button>
				<button
					type="button"
					onClick={onDelete}
					className="text-xs text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-800 shrink-0"
				>
					Delete
				</button>
			</div>

			{/* Collapsed takes pills — click to expand directly into that take */}
			{!isExpanded && (song.takes?.length ?? 0) > 0 && (
				<div className="px-6 pb-3 flex flex-wrap items-center gap-2">
					<span className="text-xs text-gray-600 shrink-0">Takes:</span>
					{song.takes!.map((take) => (
						<button
							key={take.id}
							type="button"
							onClick={() => {
								setSelectedTakeId(take.id);
								onToggle();
							}}
							className="text-xs px-2.5 py-1 rounded-full border border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
						>
							{take.name}
						</button>
					))}
				</div>
			)}

			{/* Track upload slots */}
			{isExpanded && (
				<div className="border-t border-gray-700 divide-y divide-gray-700/60">
					{/* Take selector + Add take */}
					<div className="px-6 py-3 flex flex-wrap items-center gap-2 bg-gray-900/40 border-b border-gray-700/60">
						<span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Source:</span>
						<button
							type="button"
							onClick={() => setSelectedTakeId(null)}
							className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
								selectedTakeId == null ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
							}`}
						>
							Original
						</button>
					{(song.takes ?? []).map((take) => (
						<span key={take.id} className="inline-flex items-center gap-0.5">
							{renamingTakeId === take.id ? (
								<RenameInput
									value={renameValue}
									onChange={setRenameValue}
									onCommit={() => void renameTake(take, renameValue)}
									onCancel={() => setRenamingTakeId(null)}
								/>
							) : (
								<>
									<button
										type="button"
										onClick={() => setSelectedTakeId(take.id)}
										className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
											selectedTakeId === take.id ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
										}`}
									>
										{take.name}
									</button>
									<button
										type="button"
										onClick={() => { setRenamingTakeId(take.id); setRenameValue(take.name); }}
										title="Rename take"
										className="text-xs p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
										aria-label={`Rename take ${take.name}`}
									>
										✎
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setDeleteTakeConfirm(take);
										}}
										title={`Delete take "${take.name}"`}
										className="text-xs p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
										aria-label={`Delete take ${take.name}`}
									>
										×
									</button>
								</>
							)}
						</span>
					))}
						<button
							type="button"
							onClick={() => void handleAddTake()}
							disabled={isAddingTake}
							className="text-xs px-3 py-1.5 rounded border border-dashed border-gray-500 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
						>
							{isAddingTake ? 'Adding…' : '+ Add take'}
						</button>
					</div>

					{deleteTakeConfirm && (
						<ConfirmDialog
							title={`Delete take "${deleteTakeConfirm.name}"?`}
							message={
								deleteTakeConfirm.tracks.length > 0
									? `This will permanently delete this take and its ${deleteTakeConfirm.tracks.length} uploaded track${deleteTakeConfirm.tracks.length !== 1 ? 's' : ''}. This cannot be undone.`
									: 'This will permanently delete this take. This cannot be undone.'
							}
							confirmLabel="Delete take"
							onConfirm={() => void doDeleteTake(deleteTakeConfirm)}
							onCancel={() => setDeleteTakeConfirm(null)}
						/>
					)}

					{visibleDefs.map((trackDef) => {
						const existing = uploadedKeys.get(trackDef.key);
						const isHiddenSlot = disabledSet.has(trackDef.key) && !existing;
						return (
							<TrackUploadSlot
								key={`${selectedTakeId ?? 'orig'}-${trackDef.key}`}
								song={song}
								takeId={selectedTakeId}
								effectiveTracks={effectiveTracks}
								trackKey={trackDef.key}
								trackLabel={trackDef.label}
								existing={existing}
								isHiddenSlot={isHiddenSlot}
								onHide={() => hideTrack(trackDef.key)}
								onRestore={() => restoreTrack(trackDef.key)}
								onTracksChange={handleTracksChange}
								showToast={showToast}
							/>
						);
					})}

					{/* Hidden tracks footer */}
					{hiddenCount > 0 && (
						<div className="px-6 py-2.5 flex items-center justify-between bg-gray-900/30">
							<span className="text-xs text-gray-600">
								{hiddenCount} track{hiddenCount !== 1 ? 's' : ''} hidden
							</span>
							<button
								type="button"
								onClick={() => setShowHidden((v) => !v)}
								className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
							>
								{showHidden ? 'Hide them' : 'Show hidden'}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// RenameInput — inline text input for renaming a take
// ─────────────────────────────────────────────────────────────

interface RenameInputProps {
	value: string;
	onChange: (v: string) => void;
	onCommit: () => void;
	onCancel: () => void;
}

function RenameInput({ value, onChange, onCommit, onCancel }: RenameInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	return (
		<input
			ref={inputRef}
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onCommit}
			onKeyDown={(e) => {
				if (e.key === 'Enter') onCommit();
				if (e.key === 'Escape') onCancel();
			}}
			aria-label="Take name"
			placeholder="Take name"
			className="text-xs px-2 py-1.5 rounded border border-indigo-500 bg-gray-900 text-white w-32 focus:outline-none"
		/>
	);
}

// ─────────────────────────────────────────────────────────────
// TrackUploadSlot — upload / replace / delete a single stem
// ─────────────────────────────────────────────────────────────

interface TrackUploadSlotProps {
	song: PracticeSong;
	takeId: string | null;
	effectiveTracks: PracticeSongTrack[];
	trackKey: string;
	trackLabel: string;
	existing: PracticeSongTrack | undefined;
	isHiddenSlot: boolean;
	onHide: () => void;
	onRestore: () => void;
	onTracksChange: (newTracks: PracticeSongTrack[]) => void;
	showToast: (msg: string, type?: Toast['type']) => void;
}

function uploadWithProgress(
	signedUrl: string,
	file: File,
	onProgress: (pct: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
		};
		xhr.onerror = () => reject(new Error('Network error during upload'));
		xhr.open('PUT', signedUrl);
		xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
		xhr.send(file);
	});
}

function TrackUploadSlot({
	song,
	takeId,
	effectiveTracks,
	trackKey,
	trackLabel,
	existing,
	isHiddenSlot,
	onHide,
	onRestore,
	onTracksChange,
	showToast,
}: TrackUploadSlotProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		// Reset input so the same file can be re-selected after an error
		e.target.value = '';

		const ext = file.name.split('.').pop() ?? 'mp3';
		setUploadProgress(0);

		try {
			// 1. Get signed upload URL
			const urlRes = await fetch('/api/admin/practice/upload-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					songId: song.id,
					trackKey,
					fileExtension: ext,
					...(takeId != null && takeId !== '' ? { takeId } : {}),
				}),
			});
			if (!urlRes.ok) throw new Error('Failed to get upload URL');
			const { signedUrl, storagePath } = (await urlRes.json()) as {
				signedUrl: string;
				storagePath: string;
			};

			// 2. Upload directly to R2
			await uploadWithProgress(signedUrl, file, setUploadProgress);

			// 3. Record the track in the database
			const trackRes = await fetch('/api/admin/practice/tracks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					songId: song.id,
					trackKey,
					storagePath,
					...(takeId != null && takeId !== '' ? { takeId } : {}),
				}),
			});
			if (!trackRes.ok) throw new Error('Failed to save track record');
			const savedTrack = (await trackRes.json()) as PracticeSongTrack;

			// 4. Update local state
			const updatedTracks = [
				...effectiveTracks.filter((t) => t.trackKey !== trackKey),
				savedTrack,
			];
			onTracksChange(updatedTracks);
			showToast(`${trackLabel} uploaded`);
		} catch (err) {
			showToast(
				err instanceof Error ? err.message : 'Upload failed',
				'error',
			);
		} finally {
			setUploadProgress(null);
		}
	}

	async function doRemoveTrack() {
		if (!existing) return;
		setShowRemoveConfirm(false);
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/admin/practice/tracks?id=${existing.id}`, {
				method: 'DELETE',
			});
			if (!res.ok) throw new Error('Delete failed');
			const updatedTracks = effectiveTracks.filter((t) => t.trackKey !== trackKey);
			onTracksChange(updatedTracks);
			showToast(`${trackLabel} removed`);
		} catch {
			showToast('Failed to remove track', 'error');
		} finally {
			setIsDeleting(false);
		}
	}

	const isUploading = uploadProgress !== null;

	// Hidden (but visible via "Show hidden") — dimmed row with only a Restore button
	if (isHiddenSlot) {
		return (
			<div className="px-6 py-3 flex items-center gap-4 opacity-40">
				<span className="text-sm text-gray-400 w-40 shrink-0 italic">{trackLabel}</span>
				<span className="flex-1 text-xs text-gray-600 italic">hidden</span>
				<button
					type="button"
					title="Restore this track slot"
					onClick={onRestore}
					className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors shrink-0"
				>
					Restore
				</button>
			</div>
		);
	}

	return (
		<div className="px-6 py-3 flex items-center gap-4">
			{/* Track name */}
			<span className="text-sm text-white w-40 shrink-0">{trackLabel}</span>

			{/* Status / progress */}
			<div className="flex-1 min-w-0">
				{isUploading ? (
					<div className="space-y-1">
						<div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
							<div
								className="h-full bg-indigo-500 rounded-full transition-all duration-100"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
						<p className="text-xs text-gray-500">{uploadProgress}% uploaded</p>
					</div>
				) : existing ? (
					<span className="inline-flex items-center gap-1.5 text-xs text-green-400">
						<span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
						Uploaded
					</span>
				) : (
					<span className="text-xs text-gray-600 italic">Not uploaded</span>
				)}
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 shrink-0">
				{!isUploading && (
					<>
						<input
							ref={fileInputRef}
							type="file"
							accept="audio/*"
							aria-label={`Upload ${trackLabel}`}
							className="hidden"
							onChange={handleFileChange}
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
						>
							{existing ? 'Replace' : 'Upload'}
						</button>
						{existing ? (
							<button
								type="button"
								onClick={() => setShowRemoveConfirm(true)}
								disabled={isDeleting}
								className="text-xs px-2 py-1.5 rounded border border-transparent text-red-500 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-50"
							>
								{isDeleting ? '…' : 'Remove'}
							</button>
						) : (
							<button
								type="button"
								title="Hide this track slot — it won't show for this song"
								onClick={onHide}
								className="text-xs px-2 py-1.5 rounded border border-transparent text-gray-600 hover:border-gray-700 hover:text-gray-400 transition-colors"
							>
								✕
							</button>
						)}
					</>
				)}
			</div>

			{showRemoveConfirm && (
				<ConfirmDialog
					title={`Remove ${trackLabel}?`}
					message="The uploaded file will be permanently deleted from storage. You can re-upload it later."
					confirmLabel="Remove"
					onConfirm={() => void doRemoveTrack()}
					onCancel={() => setShowRemoveConfirm(false)}
				/>
			)}
		</div>
	);
}
