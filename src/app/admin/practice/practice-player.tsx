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
const CACHE_NAME = 'practice-stems-v1';

/** XHR download that reports progress. Returns a detached ArrayBuffer (safe to pass to decodeAudioData). */
function downloadWithProgress(
	url: string,
	onProgress: (pct: number) => void,
): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';
		xhr.onprogress = (e) => {
			if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve(xhr.response as ArrayBuffer);
			} else {
				reject(new Error(`HTTP ${xhr.status}`));
			}
		};
		xhr.onerror = () => reject(new Error('Network error'));
		xhr.open('GET', url);
		xhr.send();
	});
}

export function PracticePlayer({ song, streamUrls, onBack }: Props) {
	// ── Web Audio API refs ────────────────────────────────────────
	const audioCtxRef = useRef<AudioContext | null>(null);
	const buffersRef = useRef<Record<string, AudioBuffer>>({});
	const gainNodesRef = useRef<Record<string, GainNode>>({});
	const sourcesRef = useRef<Record<string, AudioBufferSourceNode | null>>({});

	// Playback position tracking (AudioContext time-based, drift-free)
	const isPlayingRef = useRef(false);
	const playStartCtxTimeRef = useRef(0); // AudioContext.currentTime when sources were started
	const playOffsetRef = useRef(0);       // song position (seconds) when sources were started
	const durationRef = useRef(0);
	const rafRef = useRef<number | null>(null);

	// ── UI state ──────────────────────────────────────────────────
	type LoadState = 'loading' | 'ready' | 'error';
	const [loadState, setLoadState] = useState<LoadState>('loading');
	const [loadProgress, setLoadProgress] = useState<Record<string, number>>({});

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	const [volumes, setVolumes] = useState<Record<string, number>>(() =>
		Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, 100])),
	);
	const [muted, setMuted] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, false])),
	);
	const [solo, setSolo] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, false])),
	);

	const availableTracks = PRACTICE_TRACK_DEFS.filter((t) => streamUrls[t.key]);

	// Stable cache key: storage path (not the signed URL which changes each load)
	const storagePathByKey = Object.fromEntries(
		song.tracks.map((t) => [t.trackKey, t.storagePath]),
	);

	// ── RAF time display ──────────────────────────────────────────
	function stopRaf() {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
	}

	function startRaf() {
		function tick() {
			const ctx = audioCtxRef.current;
			if (!ctx || !isPlayingRef.current) return;
			const t = playOffsetRef.current + (ctx.currentTime - playStartCtxTimeRef.current);
			setCurrentTime(Math.min(t, durationRef.current));
			rafRef.current = requestAnimationFrame(tick);
		}
		rafRef.current = requestAnimationFrame(tick);
	}

	// ── Stem loading (Cache API + Web Audio decode) ───────────────
	useEffect(() => {
		if (availableTracks.length === 0) {
			setLoadState('ready');
			return;
		}

		const ctx = new AudioContext();
		audioCtxRef.current = ctx;

		// Create a GainNode per track for independent volume/mute control
		for (const t of availableTracks) {
			const gain = ctx.createGain();
			gain.gain.value = 1;
			gain.connect(ctx.destination);
			gainNodesRef.current[t.key] = gain;
		}

		let cancelled = false;

		async function loadAll() {
			const cache = await caches.open(CACHE_NAME);

			const loadTrack = async (trackKey: string, signedUrl: string): Promise<[string, AudioBuffer]> => {
				const storagePath = storagePathByKey[trackKey];
				const cacheKey = `/practice-stem/${storagePath}`;

				setLoadProgress((prev) => ({ ...prev, [trackKey]: 0 }));

				let arrayBuffer: ArrayBuffer;
				const cached = storagePath ? await cache.match(cacheKey) : null;

				if (cached) {
					// Instant load from browser cache
					arrayBuffer = await cached.arrayBuffer();
					setLoadProgress((prev) => ({ ...prev, [trackKey]: 95 }));
				} else {
					// Download with XHR for progress feedback
					arrayBuffer = await downloadWithProgress(signedUrl, (pct) => {
						setLoadProgress((prev) => ({ ...prev, [trackKey]: pct }));
					});

					// Cache a copy keyed by stable storage path for future loads
					if (storagePath) {
						const forCache = new Response(arrayBuffer.slice(0), {
							headers: { 'Content-Type': 'audio/mpeg' },
						});
						cache.put(cacheKey, forCache).catch(() => {/* non-fatal */});
					}
					setLoadProgress((prev) => ({ ...prev, [trackKey]: 95 }));
				}

				// decodeAudioData detaches the ArrayBuffer, so slice is only needed for the cache copy above
				const audioBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
				setLoadProgress((prev) => ({ ...prev, [trackKey]: 100 }));
				return [trackKey, audioBuffer];
			};

			try {
				const results = await Promise.all(
					availableTracks.map((t) => loadTrack(t.key, streamUrls[t.key])),
				);

				if (cancelled) return;

				for (const [key, buffer] of results) {
					buffersRef.current[key] = buffer;
				}

				const maxDuration = Math.max(...results.map(([, b]) => b.duration));
				durationRef.current = maxDuration;
				setDuration(maxDuration);
				setLoadState('ready');
			} catch (err) {
				if (!cancelled) {
					console.error('Failed to load stems:', err);
					setLoadState('error');
				}
			}
		}

		void loadAll();

		return () => {
			cancelled = true;
			stopRaf();
			Object.values(sourcesRef.current).forEach((s) => {
				if (s) try { s.stop(); } catch { /* already stopped */ }
			});
			sourcesRef.current = {};
			ctx.close();
			audioCtxRef.current = null;
			buffersRef.current = {};
			gainNodesRef.current = {};
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [song.id]);

	// ── Playback helpers ──────────────────────────────────────────

	/** Stop current sources without touching playOffset. Returns current song position. */
	function stopSources(): number {
		const ctx = audioCtxRef.current;
		const pos = ctx
			? Math.min(
					playOffsetRef.current + (ctx.currentTime - playStartCtxTimeRef.current),
					durationRef.current,
				)
			: playOffsetRef.current;

		// Mark stopped BEFORE calling s.stop() so onended handlers ignore the event
		isPlayingRef.current = false;

		Object.values(sourcesRef.current).forEach((s) => {
			if (s) try { s.stop(); } catch { /* already stopped */ }
		});
		sourcesRef.current = {};
		stopRaf();
		return pos;
	}

	/** Create AudioBufferSourceNodes for all tracks and start them atomically. */
	async function startSources(offset: number) {
		const ctx = audioCtxRef.current;
		if (!ctx) return;

		if (ctx.state === 'suspended') await ctx.resume();

		// Schedule all tracks at exactly the same AudioContext time (+ tiny buffer for accuracy)
		const scheduleAt = ctx.currentTime + 0.05;

		for (const t of availableTracks) {
			const buffer = buffersRef.current[t.key];
			const gain = gainNodesRef.current[t.key];
			if (!buffer || !gain) continue;

			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.connect(gain);

			// Natural end of song — only watch the leader track
			if (t.key === availableTracks[0]?.key) {
				source.onended = () => {
					if (isPlayingRef.current) {
						isPlayingRef.current = false;
						setIsPlaying(false);
						playOffsetRef.current = 0;
						setCurrentTime(0);
						stopRaf();
					}
				};
			}

			source.start(scheduleAt, offset);
			sourcesRef.current[t.key] = source;
		}

		playStartCtxTimeRef.current = scheduleAt;
		playOffsetRef.current = offset;
		isPlayingRef.current = true;
		setIsPlaying(true);
		startRaf();
	}

	// ── Transport handlers ────────────────────────────────────────

	function handlePlay() {
		void startSources(playOffsetRef.current);
	}

	function handlePause() {
		const pos = stopSources();
		playOffsetRef.current = pos;
		setCurrentTime(pos);
		setIsPlaying(false);
	}

	function handleStop() {
		stopSources();
		playOffsetRef.current = 0;
		setIsPlaying(false);
		setCurrentTime(0);
	}

	function handleRewind() {
		const wasPlaying = isPlayingRef.current;
		if (wasPlaying) stopSources();
		playOffsetRef.current = 0;
		setCurrentTime(0);
		if (wasPlaying) void startSources(0);
	}

	// Seeking: pause → snap position → resume if was playing
	const isSeeking = useRef(false);
	const wasPlayingBeforeSeek = useRef(false);

	function handleSeekStart() {
		isSeeking.current = true;
		wasPlayingBeforeSeek.current = isPlayingRef.current;
		if (isPlayingRef.current) {
			const pos = stopSources();
			playOffsetRef.current = pos;
			setIsPlaying(false);
		}
	}

	function handleSeekChange(value: number) {
		playOffsetRef.current = value;
		setCurrentTime(value);
	}

	function handleSeekEnd() {
		isSeeking.current = false;
		if (wasPlayingBeforeSeek.current) void startSources(playOffsetRef.current);
	}

	/** Recalculate every track's GainNode value from the latest mixer state. */
	function applyGains(
		currentVolumes: Record<string, number>,
		currentMuted: Record<string, boolean>,
		currentSolo: Record<string, boolean>,
	) {
		const anySolo = Object.values(currentSolo).some(Boolean);
		for (const t of availableTracks) {
			const gain = gainNodesRef.current[t.key];
			if (!gain) continue;
			if (anySolo) {
				// Solo active: only soloed tracks are heard; mute is overridden by solo
				gain.gain.value = currentSolo[t.key] ? (currentVolumes[t.key] ?? 100) / 100 : 0;
			} else {
				gain.gain.value = currentMuted[t.key] ? 0 : (currentVolumes[t.key] ?? 100) / 100;
			}
		}
	}

	function handleVolumeChange(key: string, value: number) {
		const newVolumes = { ...volumes, [key]: value };
		setVolumes(newVolumes);
		applyGains(newVolumes, muted, solo);
	}

	function handleMuteToggle(key: string) {
		const newMuted = { ...muted, [key]: !muted[key] };
		setMuted(newMuted);
		applyGains(volumes, newMuted, solo);
	}

	function handleSoloToggle(key: string) {
		const newSolo = { ...solo, [key]: !solo[key] };
		setSolo(newSolo);
		applyGains(volumes, muted, newSolo);
	}

	// ── Loading screen ────────────────────────────────────────────
	if (loadState === 'loading') {
		const totalTracks = availableTracks.length;
		const totalPct =
			totalTracks > 0
				? Math.round(
						Object.values(loadProgress).reduce((sum, p) => sum + p, 0) / totalTracks,
					)
				: 0;

		return (
			<div className="space-y-6">
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
					</div>
				</div>

				<div className="rounded-lg border border-gray-700 bg-gray-800 p-8 space-y-6">
					<div className="text-center">
						<p className="text-gray-300 font-medium">Loading stems…</p>
						<p className="text-gray-500 text-sm mt-1">
							Cached tracks load instantly on future visits
						</p>
					</div>

					<div className="space-y-3">
						{availableTracks.map((t) => {
							const pct = loadProgress[t.key] ?? 0;
							return (
								<div key={t.key} className="space-y-1">
									<div className="flex justify-between text-xs text-gray-500">
										<span>{t.label}</span>
										<span>
											{pct >= 100
												? '✓ Ready'
												: pct === 0
													? 'Checking cache…'
													: `${pct}%`}
										</span>
									</div>
									<div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
										<div
											className="h-full bg-indigo-500 rounded-full transition-all duration-200"
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>

					<p className="text-center text-xs text-gray-600">{totalPct}% overall</p>
				</div>
			</div>
		);
	}

	if (loadState === 'error') {
		return (
			<div className="space-y-6">
				<button
					type="button"
					onClick={onBack}
					className="text-sm text-gray-400 hover:text-white transition-colors"
				>
					← Back
				</button>
				<div className="rounded-lg border border-red-800 bg-red-950/30 p-8 text-center">
					<p className="text-red-400 font-medium">Failed to load stems</p>
					<p className="text-gray-500 text-sm mt-2">Check your connection and try again.</p>
				</div>
			</div>
		);
	}

	// ── Player UI ─────────────────────────────────────────────────
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
								aria-label="Seek"
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
							<button
								type="button"
								onClick={handleRewind}
								title="Rewind to start"
								className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-lg"
							>
								⏮
							</button>

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
									title="Play"
									className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-2xl shadow-lg transition-colors"
								>
									▶
								</button>
							)}

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
							<div className="flex items-center gap-3">
								{Object.values(solo).some(Boolean) && (
									<span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
										Solo active
									</span>
								)}
								<p className="text-xs text-gray-500">{availableTracks.length} tracks</p>
							</div>
						</div>

					<div className="divide-y divide-gray-700/60">
						{TRACK_GROUPS.map((group) => {
							const groupTracks = PRACTICE_TRACK_DEFS.filter(
								(t) => t.group === group && !(song.disabledTracks ?? []).includes(t.key),
							);
							if (groupTracks.length === 0) return null;
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
											const isSoloed = solo[trackDef.key] ?? false;
											const anySolo = Object.values(solo).some(Boolean);
											// Track is silenced by solo if: solo mode is on and this track isn't soloed
											const silencedBySolo = anySolo && !isSoloed;

											return (
												<div
													key={trackDef.key}
													className={`px-6 py-3 flex items-center gap-4 transition-opacity ${
														!hasTrack ? 'opacity-30' : silencedBySolo ? 'opacity-40' : ''
													}`}
												>
													<span className="text-sm text-white w-36 shrink-0 select-none">
														{trackDef.label}
													</span>

													{hasTrack ? (
														<>
															<div className="flex-1 flex items-center gap-2 min-w-0">
																<input
																	aria-label={`${trackDef.label} volume`}
																	type="range"
																	min={0}
																	max={100}
																	value={isMuted && !isSoloed ? 0 : vol}
																	onChange={(e) =>
																		handleVolumeChange(
																			trackDef.key,
																			Number(e.target.value),
																		)
																	}
																	disabled={isMuted && !isSoloed}
																	className={`w-full h-2 ${
																		isMuted && !isSoloed
																			? 'accent-gray-600 cursor-not-allowed opacity-50'
																			: 'accent-indigo-500 cursor-pointer'
																	}`}
																/>
																<span className="text-xs tabular-nums text-gray-400 w-8 text-right shrink-0">
																	{isMuted && !isSoloed ? '—' : `${vol}`}
																</span>
															</div>

															<button
																type="button"
																title={isSoloed ? 'Un-solo' : 'Solo — only soloed tracks play'}
																onClick={() => handleSoloToggle(trackDef.key)}
																className={`shrink-0 text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
																	isSoloed
																		? 'border-amber-400 bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
																		: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
																}`}
															>
																S
															</button>

															<button
																type="button"
																title={isMuted ? 'Unmute' : 'Mute'}
																onClick={() => handleMuteToggle(trackDef.key)}
																className={`shrink-0 text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
																	isMuted
																		? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
																		: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
																}`}
															>
																M
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
