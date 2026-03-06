'use client';

import { useEffect, useRef, useState } from 'react';
import { PRACTICE_TRACK_DEFS } from '@/app/types/band';
import type { PracticeSong } from '@/app/types/band';

interface Props {
	song: PracticeSong;
	streamUrls: Record<string, string>;
	onBack: () => void;
}

function formatTime(seconds: number): string {
	if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRACK_GROUPS = ['Vocals', 'Guitars & Keys', 'Drums'] as const;

export function PracticePlayer({ song, streamUrls, onBack }: Props) {
	const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
	const isSeeking = useRef(false);
	const wasPlayingRef = useRef(false);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isBuffering, setIsBuffering] = useState(false);

	const [volumes, setVolumes] = useState<Record<string, number>>(() =>
		Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, 100])),
	);
	const [muted, setMuted] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, false])),
	);

	const availableTracks = PRACTICE_TRACK_DEFS.filter((t) => streamUrls[t.key]);

	function getAllAudios(): HTMLAudioElement[] {
		return availableTracks
			.map((t) => audioRefs.current[t.key])
			.filter((a): a is HTMLAudioElement => Boolean(a));
	}

	async function playAll() {
		const audios = getAllAudios();
		if (audios.length === 0) return;

		// React Strict Mode runs cleanup effects on mount (simulating unmount/remount).
		// If our cleanup had cleared a.src, React won't re-sync the prop because the
		// DOM element is the same node. Restore the src imperatively before playing.
		availableTracks.forEach((t) => {
			const audio = audioRefs.current[t.key];
			if (audio && !audio.src && streamUrls[t.key]) {
				audio.src = streamUrls[t.key];
				audio.load();
			}
		});

		try {
			setIsBuffering(true);
			await Promise.all(audios.map((a) => a.play()));
			setIsPlaying(true);
		} catch (err) {
			console.error('Audio play error:', err);
		} finally {
			setIsBuffering(false);
		}
	}

	function pauseAll() {
		getAllAudios().forEach((a) => a.pause());
		setIsPlaying(false);
	}

	function handlePlay() {
		void playAll();
	}

	function handlePause() {
		pauseAll();
	}

	function handleStop() {
		const audios = getAllAudios();
		audios.forEach((a) => {
			a.pause();
			a.currentTime = 0;
		});
		setIsPlaying(false);
		setCurrentTime(0);
	}

	function handleRewind() {
		const wasPlaying = isPlaying;
		pauseAll();
		getAllAudios().forEach((a) => {
			a.currentTime = 0;
		});
		setCurrentTime(0);
		if (wasPlaying) void playAll();
	}

	function handleSeekStart() {
		isSeeking.current = true;
		wasPlayingRef.current = isPlaying;
		pauseAll();
	}

	function handleSeekChange(value: number) {
		setCurrentTime(value);
		getAllAudios().forEach((a) => {
			a.currentTime = value;
		});
	}

	function handleSeekEnd() {
		isSeeking.current = false;
		if (wasPlayingRef.current) void playAll();
	}

	function handleVolumeChange(key: string, value: number) {
		setVolumes((v) => ({ ...v, [key]: value }));
		const audio = audioRefs.current[key];
		if (audio) audio.volume = value / 100;
	}

	function handleMuteToggle(key: string) {
		setMuted((m) => {
			const newMuted = !m[key];
			const audio = audioRefs.current[key];
			if (audio) audio.muted = newMuted;
			return { ...m, [key]: newMuted };
		});
	}

	// Cleanup on unmount or song change.
	// Do NOT set a.src = '' here — Strict Mode runs this cleanup on initial mount
	// (simulating unmount) and then React won't re-sync the src prop onto the
	// already-existing DOM node, leaving all audio elements with an empty src.
	useEffect(() => {
		return () => {
			Object.values(audioRefs.current).forEach((a) => {
				a.pause();
				a.load(); // resets internal state without clearing the src attribute
			});
			audioRefs.current = {};
		};
	}, [song.id]);

	const leaderKey = availableTracks[0]?.key;

	return (
		<div className="space-y-6">
			{/* Song header */}
			<div className="flex items-start gap-4">
				<button
					type="button"
					onClick={onBack}
					className="mt-1 text-sm text-gray-400 hover:text-white transition-colors shrink-0"
				>
					← Back
				</button>
				<div>
					<h2 className="text-3xl font-bold text-white leading-tight">{song.title}</h2>
					<p className="text-gray-400 mt-0.5">{song.artist}</p>
					<p className="text-xs text-gray-600 mt-1">
						{availableTracks.length} of {PRACTICE_TRACK_DEFS.length} tracks loaded
					</p>
				</div>
			</div>

			{/* Hidden audio elements */}
			<div aria-hidden="true" className="hidden">
				{availableTracks.map((t, i) => (
					<audio
						key={t.key}
					ref={(el) => {
						if (el) {
							audioRefs.current[t.key] = el;
							// Set src imperatively so Strict Mode's cleanup/remount
							// cycle can't leave the element with a stale empty src.
							if (!el.src || el.src !== streamUrls[t.key]) {
								el.src = streamUrls[t.key];
							}
							el.volume = (volumes[t.key] ?? 100) / 100;
							el.muted = muted[t.key] ?? false;
						}
					}}
					src={streamUrls[t.key]}
						preload="auto"
						onTimeUpdate={
							i === 0
								? (e) => {
										if (!isSeeking.current) {
											setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime);
										}
									}
								: undefined
						}
						onLoadedMetadata={
							i === 0
								? (e) => {
										setDuration((e.currentTarget as HTMLAudioElement).duration);
									}
								: undefined
						}
						onEnded={
							i === 0 && t.key === leaderKey
								? () => {
										setIsPlaying(false);
										setCurrentTime(0);
									}
								: undefined
						}
						onWaiting={i === 0 ? () => setIsBuffering(true) : undefined}
						onPlaying={i === 0 ? () => setIsBuffering(false) : undefined}
					/>
				))}
			</div>

			{availableTracks.length === 0 ? (
				<div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
					<p className="text-4xl mb-4">🎵</p>
					<p className="text-gray-300 font-medium">No tracks uploaded yet</p>
					<p className="text-gray-500 text-sm mt-2">
						Go back and upload stems in Manage Songs.
					</p>
					<button
						type="button"
						onClick={onBack}
						className="mt-6 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 text-sm font-medium transition-colors"
					>
						Go Back
					</button>
				</div>
			) : (
				<>
					{/* Transport controls */}
					<div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-5">
						{/* Progress / seek bar */}
						<div className="flex items-center gap-3">
							<span className="text-sm tabular-nums text-gray-400 w-10 text-right">
								{formatTime(currentTime)}
							</span>
							<input
								type="range"
								min={0}
								max={duration || 0}
								value={currentTime}
								step={0.5}
								onMouseDown={handleSeekStart}
								onTouchStart={handleSeekStart}
								onChange={(e) => handleSeekChange(Number(e.target.value))}
								onMouseUp={handleSeekEnd}
								onTouchEnd={handleSeekEnd}
								disabled={duration === 0}
								className="flex-1 h-2 accent-indigo-500 cursor-pointer disabled:cursor-default disabled:opacity-40"
							/>
							<span className="text-sm tabular-nums text-gray-400 w-10">
								{formatTime(duration)}
							</span>
						</div>

						{/* Buttons */}
						<div className="flex items-center justify-center gap-4">
							{/* Rewind */}
							<button
								type="button"
								onClick={handleRewind}
								title="Rewind to start"
								className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-lg"
							>
								⏮
							</button>

							{/* Play / Pause */}
							{isPlaying ? (
								<button
									type="button"
									onClick={handlePause}
									title="Pause"
									className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-2xl shadow-lg transition-colors"
								>
									⏸
								</button>
							) : (
								<button
									type="button"
									onClick={handlePlay}
									disabled={isBuffering}
									title="Play"
									className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-2xl shadow-lg transition-colors"
								>
									{isBuffering ? (
										<span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										'▶'
									)}
								</button>
							)}

							{/* Stop */}
							<button
								type="button"
								onClick={handleStop}
								title="Stop"
								className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-lg"
							>
								⏹
							</button>
						</div>
					</div>

					{/* Mixer panel */}
					<div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
								Mixer
							</h3>
							<p className="text-xs text-gray-500">
								{availableTracks.length} tracks
							</p>
						</div>

						<div className="divide-y divide-gray-700/60">
							{TRACK_GROUPS.map((group) => {
								const groupTracks = PRACTICE_TRACK_DEFS.filter((t) => t.group === group);
								return (
									<div key={group}>
										<div className="px-6 py-2 bg-gray-900/40">
											<span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
												{group}
											</span>
										</div>
										{groupTracks.map((trackDef) => {
											const hasTrack = Boolean(streamUrls[trackDef.key]);
											const vol = volumes[trackDef.key] ?? 100;
											const isMuted = muted[trackDef.key] ?? false;

											return (
												<div
													key={trackDef.key}
													className={`px-6 py-3 flex items-center gap-4 transition-opacity ${
														!hasTrack ? 'opacity-30' : ''
													}`}
												>
													{/* Track name */}
													<span className="text-sm text-white w-36 shrink-0 select-none">
														{trackDef.label}
													</span>

													{hasTrack ? (
														<>
															{/* Volume slider */}
															<div className="flex-1 flex items-center gap-2 min-w-0">
																<input
																	type="range"
																	min={0}
																	max={100}
																	value={isMuted ? 0 : vol}
																	onChange={(e) =>
																		handleVolumeChange(
																			trackDef.key,
																			Number(e.target.value),
																		)
																	}
																	disabled={isMuted}
																	className={`w-full h-2 ${
																		isMuted
																			? 'accent-gray-600 cursor-not-allowed opacity-50'
																			: 'accent-indigo-500 cursor-pointer'
																	}`}
																/>
																<span className="text-xs tabular-nums text-gray-400 w-8 text-right shrink-0">
																	{isMuted ? '—' : `${vol}`}
																</span>
															</div>

															{/* Mute button */}
															<button
																type="button"
																onClick={() => handleMuteToggle(trackDef.key)}
																className={`shrink-0 text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
																	isMuted
																		? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
																		: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
																}`}
															>
																{isMuted ? 'MUTED' : 'Mute'}
															</button>
														</>
													) : (
														<span className="text-xs text-gray-600 italic">
															not uploaded
														</span>
													)}
												</div>
											);
										})}
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
