'use client';

import { useRef, useState } from 'react';
import { PRACTICE_TRACK_DEFS } from '@/app/types/band';
import type { PracticeSong, PracticeSongTrack } from '@/app/types/band';
import { PracticePlayer } from './practice-player';

type View = 'list' | 'player' | 'manage';

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
	const [activeSong, setActiveSong] = useState<PracticeSong | null>(null);
	const [streamUrls, setStreamUrls] = useState<Record<string, string>>({});
	const [isLoadingUrls, setIsLoadingUrls] = useState(false);
	const [loadingForId, setLoadingForId] = useState<string | null>(null);

	async function refreshSongs() {
		const res = await fetch('/api/admin/practice/songs');
		if (res.ok) setSongs((await res.json()) as PracticeSong[]);
	}

	async function handleLoadSong(song: PracticeSong) {
		setIsLoadingUrls(true);
		setLoadingForId(song.id);
		try {
			const res = await fetch(`/api/admin/practice/stream-urls?songId=${song.id}`);
			const data = (await res.json()) as { urls: Record<string, string> };
			setStreamUrls(data.urls ?? {});
			setActiveSong(song);
			setView('player');
		} catch {
			setStreamUrls({});
		} finally {
			setIsLoadingUrls(false);
			setLoadingForId(null);
		}
	}

	if (view === 'player' && activeSong) {
		return (
			<PracticePlayer
				song={activeSong}
				streamUrls={streamUrls}
				onBack={() => setView('list')}
			/>
		);
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
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{songs.map((song) => (
						<div
							key={song.id}
							className="group rounded-lg border border-gray-700 bg-gray-800 p-6 flex flex-col gap-3"
						>
							<div>
								<h3 className="text-lg font-semibold text-white leading-tight">
									{song.title}
								</h3>
								<p className="text-gray-400 text-sm mt-0.5">{song.artist}</p>
							</div>

							<TrackStatusBar tracks={song.tracks} disabledTracks={song.disabledTracks ?? []} />

							<button
								type="button"
								onClick={() => handleLoadSong(song)}
								disabled={isLoadingUrls}
								className="mt-auto rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium transition-colors"
							>
								{isLoadingUrls && loadingForId === song.id ? (
									<span className="flex items-center justify-center gap-2">
										<span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										Loading…
									</span>
								) : (
									'Load Song'
								)}
							</button>
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
}

function ManageView({ songs, setSongs, onBack }: ManageViewProps) {
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
	showToast: (msg: string, type?: Toast['type']) => void;
}

function SongTrackManager({
	song,
	isExpanded,
	onToggle,
	onDelete,
	onTrackChange,
	showToast,
}: SongTrackManagerProps) {
	const uploadedKeys = new Map(song.tracks.map((t) => [t.trackKey, t]));
	const uploadedCount = uploadedKeys.size;
	const [showHidden, setShowHidden] = useState(false);

	// disabled = in DB disabledTracks AND not yet uploaded (uploaded always shows)
	const disabledSet = new Set(song.disabledTracks ?? []);
	const hiddenCount = [...disabledSet].filter((k) => !uploadedKeys.has(k)).length;

	const visibleDefs = PRACTICE_TRACK_DEFS.filter((t) => {
		const isDisabled = disabledSet.has(t.key) && !uploadedKeys.has(t.key);
		return !isDisabled || showHidden;
	});

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

			{/* Track upload slots */}
			{isExpanded && (
				<div className="border-t border-gray-700 divide-y divide-gray-700/60">
					{visibleDefs.map((trackDef) => {
						const existing = uploadedKeys.get(trackDef.key);
						const isHiddenSlot = disabledSet.has(trackDef.key) && !existing;
						return (
							<TrackUploadSlot
								key={trackDef.key}
								song={song}
								trackKey={trackDef.key}
								trackLabel={trackDef.label}
								existing={existing}
								isHiddenSlot={isHiddenSlot}
								onHide={() => hideTrack(trackDef.key)}
								onRestore={() => restoreTrack(trackDef.key)}
								onTrackChange={onTrackChange}
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
// TrackUploadSlot — upload / replace / delete a single stem
// ─────────────────────────────────────────────────────────────

interface TrackUploadSlotProps {
	song: PracticeSong;
	trackKey: string;
	trackLabel: string;
	existing: PracticeSongTrack | undefined;
	isHiddenSlot: boolean;
	onHide: () => void;
	onRestore: () => void;
	onTrackChange: (updated: PracticeSong) => void;
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
	trackKey,
	trackLabel,
	existing,
	isHiddenSlot,
	onHide,
	onRestore,
	onTrackChange,
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
				body: JSON.stringify({ songId: song.id, trackKey, fileExtension: ext }),
			});
			if (!urlRes.ok) throw new Error('Failed to get upload URL');
			const { signedUrl, storagePath } = (await urlRes.json()) as {
				signedUrl: string;
				storagePath: string;
			};

			// 2. Upload directly to Supabase Storage
			await uploadWithProgress(signedUrl, file, setUploadProgress);

			// 3. Record the track in the database
			const trackRes = await fetch('/api/admin/practice/tracks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ songId: song.id, trackKey, storagePath }),
			});
			if (!trackRes.ok) throw new Error('Failed to save track record');
			const savedTrack = (await trackRes.json()) as PracticeSongTrack;

			// 4. Update local state
			const updatedTracks = [
				...song.tracks.filter((t) => t.trackKey !== trackKey),
				savedTrack,
			];
			onTrackChange({ ...song, tracks: updatedTracks });
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
			const updatedTracks = song.tracks.filter((t) => t.trackKey !== trackKey);
			onTrackChange({ ...song, tracks: updatedTracks });
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
