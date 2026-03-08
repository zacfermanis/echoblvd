'use client';

import { useEffect, useRef, useState } from 'react';
import { createMp3Encoder } from 'wasm-media-encoders';
import { PRACTICE_TRACK_DEFS } from '@/app/types/band';
import type { PracticeSong, PracticeTake } from '@/app/types/band';

const PRACTICE_SETTINGS_KEY = 'practice-settings';

export interface SavedPracticeSettings {
	volumes: Record<string, number>;
	muted: Record<string, boolean>;
	solo: Record<string, boolean>;
	fxParams: Record<string, TrackFxParams>;
	masterFxParams: TrackFxParams;
}

function settingsStorageKey(songId: string, takeId: string | null): string {
	return takeId ? `${PRACTICE_SETTINGS_KEY}-${songId}-${takeId}` : `${PRACTICE_SETTINGS_KEY}-${songId}`;
}

function loadSavedSettings(songId: string, takeId: string | null): SavedPracticeSettings | null {
	try {
		const raw = typeof window !== 'undefined' ? localStorage.getItem(settingsStorageKey(songId, takeId)) : null;
		if (!raw) return null;
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object') return null;
		return parsed as SavedPracticeSettings;
	} catch {
		return null;
	}
}

function saveSettingsToStorage(songId: string, takeId: string | null, settings: SavedPracticeSettings): void {
	try {
		localStorage.setItem(settingsStorageKey(songId, takeId), JSON.stringify(settings));
	} catch {
		// quota or disabled
	}
}

interface Props {
	song: PracticeSong;
	streamUrls: Record<string, string>;
	onBack: () => void;
	/** When set, indicates which take is active; null = original tracks. */
	currentTakeId?: string | null;
	takes?: PracticeTake[] | null;
	onTakeChange?: (takeId: string | null) => void;
}

function formatTime(seconds: number): string {
	if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRACK_GROUPS = ['Vocals', 'Guitars & Keys', 'Drums'] as const;
const CACHE_NAME = 'practice-stems-v1';

// ── FX: Web Audio API (no VST; browser-native only) ───────────────

const EQ_BANDS = [
	{ key: 'low', label: '80 Hz', freq: 80, type: 'lowshelf' as const },
	{ key: 'lowMid', label: '250 Hz', freq: 250, type: 'peaking' as const },
	{ key: 'mid', label: '1 kHz', freq: 1000, type: 'peaking' as const },
	{ key: 'highMid', label: '4 kHz', freq: 4000, type: 'peaking' as const },
	{ key: 'high', label: '12 kHz', freq: 12000, type: 'highshelf' as const },
] as const;

export interface TrackFxParams {
	eq: {
		on: boolean;
		low: number;
		lowMid: number;
		mid: number;
		highMid: number;
		high: number;
	};
	compressor: { on: boolean; threshold: number; ratio: number; gain: number };
	delay: { on: boolean; time: number; feedback: number };
	chorus: { on: boolean; rate: number; depth: number; mix: number };
	reverb: { on: boolean; amount: number; time: number; space: number; width: number };
}

const DEFAULT_FX: TrackFxParams = {
	eq: { on: false, low: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
	compressor: { on: false, threshold: -24, ratio: 4, gain: 0 },
	delay: { on: false, time: 0.25, feedback: 0.4 },
	chorus: { on: false, rate: 1.5, depth: 0.5, mix: 0.5 },
	reverb: { on: false, amount: 0.3, time: 0.5, space: 0.5, width: 1 },
};

function defaultFxParams(): Record<string, TrackFxParams> {
	return Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, { ...DEFAULT_FX }]));
}

/** Coerce to a finite number; use fallback for NaN/undefined/Infinity. */
function finiteNum(value: unknown, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

/** Ensure all FX params have finite numbers (handles stale state / partial updates). */
function normalizeFxParams(p: TrackFxParams): TrackFxParams {
	return {
		eq: {
			on: Boolean(p.eq?.on),
			low: finiteNum(p.eq?.low, 0),
			lowMid: finiteNum(p.eq?.lowMid, 0),
			mid: finiteNum(p.eq?.mid, 0),
			highMid: finiteNum(p.eq?.highMid, 0),
			high: finiteNum(p.eq?.high, 0),
		},
		compressor: {
			on: Boolean(p.compressor?.on),
			threshold: finiteNum(p.compressor?.threshold, -24),
			ratio: finiteNum(p.compressor?.ratio, 4),
			gain: finiteNum(p.compressor?.gain, 0),
		},
		delay: {
			on: Boolean(p.delay?.on),
			time: finiteNum(p.delay?.time, 0.25),
			feedback: finiteNum(p.delay?.feedback, 0.4),
		},
		chorus: {
			on: Boolean(p.chorus?.on),
			rate: finiteNum(p.chorus?.rate, 1.5),
			depth: finiteNum(p.chorus?.depth, 0.5),
			mix: finiteNum(p.chorus?.mix, 0.5),
		},
		reverb: {
			on: Boolean(p.reverb?.on),
			amount: finiteNum(p.reverb?.amount, 0.3),
			time: finiteNum(p.reverb?.time, 0.5),
			space: finiteNum(p.reverb?.space, 0.5),
			width: finiteNum(p.reverb?.width, 1),
		},
	};
}

/** Create a stereo reverb impulse response. time = decay time (s), space 0–1 = room size (longer tail). */
function createReverbIR(ctx: BaseAudioContext, time: number, space: number): AudioBuffer {
	const decaySeconds = Math.max(0.2, Math.min(3, time));
	const lengthMultiplier = 0.5 + Math.max(0, Math.min(1, space));
	const length = Math.floor(ctx.sampleRate * decaySeconds * lengthMultiplier);
	const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
	const left = buffer.getChannelData(0);
	const right = buffer.getChannelData(1);
	for (let i = 0; i < length; i++) {
		const t = i / ctx.sampleRate;
		const decay = Math.exp(-t * (1 / decaySeconds));
		left[i] = (Math.random() * 2 - 1) * decay;
		right[i] = (Math.random() * 2 - 1) * decay;
	}
	return buffer;
}

interface FxChain {
	nodes: AudioNode[];
	output: AudioNode;
	audioContext?: BaseAudioContext;
	eqBands: (BiquadFilterNode | null)[];
	comp: DynamicsCompressorNode | null;
	compGain: GainNode | null;
	delay: DelayNode | null;
	delayFeedback: GainNode | null;
	chorusDelay: DelayNode | null;
	chorusLFO: OscillatorNode | null;
	chorusConst: ConstantSourceNode | null;
	chorusDepthGain: GainNode | null;
	chorusDry: GainNode | null;
	chorusWet: GainNode | null;
	reverb: ConvolverNode | null;
	reverbDry: GainNode | null;
	reverbWet: GainNode | null;
	/** [L from ch0, L from ch1, R from ch0, R from ch1] for stereo width */
	reverbWidthGains: [GainNode, GainNode, GainNode, GainNode] | null;
}

function buildFxChain(ctx: BaseAudioContext, trackKey: string, params: TrackFxParams): FxChain | null {
	const p = normalizeFxParams(params);
	const hasAny = p.eq.on || p.compressor.on || p.delay.on || p.chorus.on || p.reverb.on;
	if (!hasAny) return null;

	const nodes: AudioNode[] = [];
	let prev: AudioNode;

	function connectNext(node: AudioNode): void {
		nodes.push(node);
		prev.connect(node);
		prev = node;
	}

	// Dummy start so we can "connect" the first real node to the input later
	const input = ctx.createGain();
	input.gain.value = 1;
	prev = input;
	nodes.push(input);

	const result: Partial<FxChain> = { nodes: [...nodes], output: input, audioContext: ctx, eqBands: [], comp: null, compGain: null, delay: null, delayFeedback: null, chorusDelay: null, chorusLFO: null, chorusConst: null, chorusDepthGain: null, chorusDry: null, chorusWet: null, reverb: null, reverbDry: null, reverbWet: null, reverbWidthGains: null };

	if (p.eq.on) {
		const bands: BiquadFilterNode[] = [];
		for (const band of EQ_BANDS) {
			const node = ctx.createBiquadFilter();
			node.type = band.type;
			node.frequency.value = band.freq;
			if (band.type === 'peaking') node.Q.value = 0.7;
			node.gain.value = p.eq[band.key];
			connectNext(node);
			bands.push(node);
		}
		result.eqBands = bands;
	}

	if (p.compressor.on) {
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = p.compressor.threshold;
		comp.knee.value = 6;
		comp.ratio.value = p.compressor.ratio;
		comp.attack.value = 0.003;
		comp.release.value = 0.25;
		connectNext(comp);
		result.comp = comp;
		const compGain = ctx.createGain();
		compGain.gain.value = 10 ** (p.compressor.gain / 20);
		connectNext(compGain);
		result.compGain = compGain;
	}

	if (p.delay.on) {
		const delayTime = Math.max(0.01, Math.min(2, p.delay.time));
		const delay = ctx.createDelay(2);
		delay.delayTime.value = delayTime;
		const feedback = ctx.createGain();
		feedback.gain.value = Math.max(0, Math.min(1, p.delay.feedback));
		delay.connect(feedback);
		feedback.connect(delay);
		connectNext(delay);
		result.delay = delay;
		result.delayFeedback = feedback;
	}

	if (p.chorus.on) {
		const baseDelay = 0.015;
		const depthSec = 0.002 + Math.max(0, Math.min(1, p.chorus.depth)) * 0.01;
		const rateHz = Math.max(0.3, Math.min(4, p.chorus.rate));
		const mix = Math.max(0, Math.min(1, p.chorus.mix));

		const chorusDelay = ctx.createDelay(0.05);
		chorusDelay.delayTime.value = baseDelay;
		const lfo = ctx.createOscillator();
		lfo.type = 'sine';
		lfo.frequency.value = rateHz;
		const depthGain = ctx.createGain();
		depthGain.gain.value = depthSec * 0.5;
		lfo.connect(depthGain);
		depthGain.connect(chorusDelay.delayTime);
		const constantSource = ctx.createConstantSource();
		constantSource.offset.value = baseDelay;
		constantSource.connect(chorusDelay.delayTime);
		constantSource.start(0);
		lfo.start(0);

		const dry = ctx.createGain();
		dry.gain.value = 1 - mix;
		const wet = ctx.createGain();
		wet.gain.value = mix;
		prev.connect(dry);
		prev.connect(chorusDelay);
		chorusDelay.connect(wet);
		const merge = ctx.createGain();
		merge.gain.value = 1;
		dry.connect(merge);
		wet.connect(merge);
		prev = merge;
		nodes.push(dry, chorusDelay, wet, merge);
		result.chorusDelay = chorusDelay;
		result.chorusLFO = lfo;
		result.chorusConst = constantSource;
		result.chorusDepthGain = depthGain;
		result.chorusDry = dry;
		result.chorusWet = wet;
	}

	if (p.reverb.on) {
		const dry = ctx.createGain();
		dry.gain.value = 1 - p.reverb.amount;
		const wet = ctx.createGain();
		wet.gain.value = p.reverb.amount;
		const conv = ctx.createConvolver();
		conv.buffer = createReverbIR(ctx, p.reverb.time, p.reverb.space);
		conv.normalize = true;
		const splitter = ctx.createChannelSplitter(2);
		conv.connect(splitter);
		const w = Math.max(0, Math.min(1, p.reverb.width));
		const g0toL = ctx.createGain();
		g0toL.gain.value = 0.5 + 0.5 * w;
		const g1toL = ctx.createGain();
		g1toL.gain.value = 0.5 - 0.5 * w;
		const g0toR = ctx.createGain();
		g0toR.gain.value = 0.5 - 0.5 * w;
		const g1toR = ctx.createGain();
		g1toR.gain.value = 0.5 + 0.5 * w;
		splitter.connect(g0toL, 0);
		splitter.connect(g1toL, 1);
		splitter.connect(g0toR, 0);
		splitter.connect(g1toR, 1);
		const merger = ctx.createChannelMerger(2);
		g0toL.connect(merger, 0, 0);
		g1toL.connect(merger, 0, 0);
		g0toR.connect(merger, 0, 1);
		g1toR.connect(merger, 0, 1);
		merger.connect(wet);
		prev.connect(dry);
		prev.connect(conv);
		const merge = ctx.createGain();
		merge.gain.value = 1;
		dry.connect(merge);
		wet.connect(merge);
		prev = merge;
		nodes.push(dry, conv, splitter, g0toL, g1toL, g0toR, g1toR, merger, wet, merge);
		result.reverb = conv;
		result.reverbDry = dry;
		result.reverbWet = wet;
		result.reverbWidthGains = [g0toL, g1toL, g0toR, g1toR];
	}

	result.output = prev;
	result.nodes = nodes;
	return result as FxChain;
}

function applyFxParams(chain: FxChain | null, params: TrackFxParams): void {
	if (!chain) return;
	const p = normalizeFxParams(params);
	if (chain.eqBands.length > 0) {
		EQ_BANDS.forEach((band, i) => {
			const node = chain.eqBands[i];
			if (node) node.gain.value = p.eq[band.key];
		});
	}
	if (chain.comp) {
		chain.comp.threshold.value = p.compressor.threshold;
		chain.comp.ratio.value = p.compressor.ratio;
	}
	if (chain.compGain) {
		chain.compGain.gain.value = 10 ** (p.compressor.gain / 20);
	}
	if (chain.delay) {
		chain.delay.delayTime.value = Math.max(0.01, Math.min(2, p.delay.time));
		if (chain.delayFeedback) chain.delayFeedback.gain.value = Math.max(0, Math.min(1, p.delay.feedback));
	}
	if (chain.chorusLFO) {
		chain.chorusLFO.frequency.value = Math.max(0.3, Math.min(4, p.chorus.rate));
	}
	if (chain.chorusDepthGain) {
		const depthSec = 0.002 + Math.max(0, Math.min(1, p.chorus.depth)) * 0.01;
		chain.chorusDepthGain.gain.value = depthSec * 0.5;
	}
	if (chain.chorusDry && chain.chorusWet) {
		const mix = Math.max(0, Math.min(1, p.chorus.mix));
		chain.chorusDry.gain.value = 1 - mix;
		chain.chorusWet.gain.value = mix;
	}
	if (chain.reverbDry && chain.reverbWet) {
		chain.reverbDry.gain.value = 1 - p.reverb.amount;
		chain.reverbWet.gain.value = p.reverb.amount;
	}
	if (chain.reverb && chain.audioContext) {
		chain.reverb.buffer = createReverbIR(chain.audioContext, p.reverb.time, p.reverb.space);
	}
	if (chain.reverbWidthGains) {
		const w = Math.max(0, Math.min(1, p.reverb.width));
		chain.reverbWidthGains[0].gain.value = 0.5 + 0.5 * w;
		chain.reverbWidthGains[1].gain.value = 0.5 - 0.5 * w;
		chain.reverbWidthGains[2].gain.value = 0.5 - 0.5 * w;
		chain.reverbWidthGains[3].gain.value = 0.5 + 0.5 * w;
	}
}

interface FxPanelProps {
	trackKey: string;
	params: TrackFxParams;
	onChange: (next: TrackFxParams) => void;
}

function FxPanel({ params, onChange }: FxPanelProps) {
	const update = (patch: Partial<TrackFxParams>) =>
		onChange({
			...params,
			...patch,
			eq: { ...params.eq, ...(patch.eq ?? {}) },
			compressor: { ...params.compressor, ...(patch.compressor ?? {}) },
			delay: { ...params.delay, ...(patch.delay ?? {}) },
			chorus: { ...params.chorus, ...(patch.chorus ?? {}) },
			reverb: { ...params.reverb, ...(patch.reverb ?? {}) },
		});

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
			{/* EQ */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<label className="flex items-center gap-2 font-medium text-gray-300">
						<input
							type="checkbox"
							checked={params.eq.on}
							onChange={(e) => update({ eq: { ...params.eq, on: e.target.checked } })}
							className="rounded border-gray-500 accent-violet-500"
						/>
						EQ
					</label>
					{params.eq.on && (
						<button
							type="button"
							onClick={() =>
								update({
									eq: {
										...params.eq,
										low: 0,
										lowMid: 0,
										mid: 0,
										highMid: 0,
										high: 0,
									},
								})
							}
							className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
						>
							Reset
						</button>
					)}
				</div>
				{params.eq.on && (
					<div className="space-y-1 pl-6">
						{EQ_BANDS.map((band) => (
							<div key={band.key} className="flex items-center justify-between gap-2">
								<span className="text-gray-500 text-xs w-12">{band.label}</span>
								<input
									type="range"
									min={-12}
									max={12}
									value={params.eq[band.key]}
									onChange={(e) =>
										update({ eq: { ...params.eq, [band.key]: Number(e.target.value) } })
									}
									className="flex-1 max-w-24 h-1.5 accent-violet-500"
								/>
								<span className="text-gray-400 w-6 text-right text-xs">
									{params.eq[band.key]}dB
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Compressor */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<label className="flex items-center gap-2 font-medium text-gray-300">
						<input
							type="checkbox"
							checked={params.compressor.on}
							onChange={(e) => update({ compressor: { ...params.compressor, on: e.target.checked } })}
							className="rounded border-gray-500 accent-violet-500"
						/>
						Compressor
					</label>
					{params.compressor.on && (
						<button
							type="button"
							onClick={() =>
								update({ compressor: { ...DEFAULT_FX.compressor, on: params.compressor.on } })
							}
							className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
						>
							Reset
						</button>
					)}
				</div>
				{params.compressor.on && (
					<div className="space-y-1 pl-6">
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Threshold</span>
							<input
								type="range"
								min={-60}
								max={0}
								value={params.compressor.threshold}
								onChange={(e) =>
									update({ compressor: { ...params.compressor, threshold: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.compressor.threshold}dB</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Ratio</span>
							<input
								type="range"
								min={1}
								max={20}
								step={0.5}
								value={params.compressor.ratio}
								onChange={(e) =>
									update({ compressor: { ...params.compressor, ratio: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.compressor.ratio}:1</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Gain</span>
							<input
								type="range"
								min={-12}
								max={12}
								value={params.compressor.gain}
								onChange={(e) =>
									update({ compressor: { ...params.compressor, gain: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.compressor.gain >= 0 ? `+${params.compressor.gain}` : params.compressor.gain}dB</span>
						</div>
					</div>
				)}
			</div>

			{/* Delay */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<label className="flex items-center gap-2 font-medium text-gray-300">
						<input
							type="checkbox"
							checked={params.delay.on}
							onChange={(e) => update({ delay: { ...params.delay, on: e.target.checked } })}
							className="rounded border-gray-500 accent-violet-500"
						/>
						Delay
					</label>
					{params.delay.on && (
						<button
							type="button"
							onClick={() =>
								update({ delay: { ...DEFAULT_FX.delay, on: params.delay.on } })
							}
							className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
						>
							Reset
						</button>
					)}
				</div>
				{params.delay.on && (
					<div className="space-y-1 pl-6">
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Time</span>
							<input
								type="range"
								min={0.05}
								max={2}
								step={0.01}
								value={params.delay.time}
								onChange={(e) =>
									update({ delay: { ...params.delay, time: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.delay.time.toFixed(2)}s</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Feedback</span>
							<input
								type="range"
								min={0}
								max={0.95}
								step={0.01}
								value={params.delay.feedback}
								onChange={(e) =>
									update({ delay: { ...params.delay, feedback: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.delay.feedback * 100)}%</span>
						</div>
					</div>
				)}
			</div>

			{/* Chorus */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<label className="flex items-center gap-2 font-medium text-gray-300">
						<input
							type="checkbox"
							checked={params.chorus.on}
							onChange={(e) => update({ chorus: { ...params.chorus, on: e.target.checked } })}
							className="rounded border-gray-500 accent-violet-500"
						/>
						Chorus
					</label>
					{params.chorus.on && (
						<button
							type="button"
							onClick={() =>
								update({ chorus: { ...DEFAULT_FX.chorus, on: params.chorus.on } })
							}
							className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
						>
							Reset
						</button>
					)}
				</div>
				{params.chorus.on && (
					<div className="space-y-1 pl-6">
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Rate</span>
							<input
								type="range"
								min={0.3}
								max={4}
								step={0.1}
								value={params.chorus.rate}
								onChange={(e) =>
									update({ chorus: { ...params.chorus, rate: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.chorus.rate.toFixed(1)} Hz</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Depth</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={params.chorus.depth}
								onChange={(e) =>
									update({ chorus: { ...params.chorus, depth: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.chorus.depth * 100)}%</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Mix</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={params.chorus.mix}
								onChange={(e) =>
									update({ chorus: { ...params.chorus, mix: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.chorus.mix * 100)}%</span>
						</div>
					</div>
				)}
			</div>

			{/* Reverb */}
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-2">
					<label className="flex items-center gap-2 font-medium text-gray-300">
						<input
							type="checkbox"
							checked={params.reverb.on}
							onChange={(e) => update({ reverb: { ...params.reverb, on: e.target.checked } })}
							className="rounded border-gray-500 accent-violet-500"
						/>
						Reverb
					</label>
					{params.reverb.on && (
						<button
							type="button"
							onClick={() =>
								update({ reverb: { ...DEFAULT_FX.reverb, on: params.reverb.on } })
							}
							className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
						>
							Reset
						</button>
					)}
				</div>
				{params.reverb.on && (
					<div className="space-y-1 pl-6">
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Amount</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={params.reverb.amount}
								onChange={(e) =>
									update({ reverb: { ...params.reverb, amount: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.reverb.amount * 100)}%</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Time</span>
							<input
								type="range"
								min={0.2}
								max={3}
								step={0.05}
								value={params.reverb.time}
								onChange={(e) =>
									update({ reverb: { ...params.reverb, time: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{params.reverb.time.toFixed(2)}s</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Space</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={params.reverb.space}
								onChange={(e) =>
									update({ reverb: { ...params.reverb, space: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.reverb.space * 100)}%</span>
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-gray-500 text-xs w-20 shrink-0">Width</span>
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={params.reverb.width}
								onChange={(e) =>
									update({ reverb: { ...params.reverb, width: Number(e.target.value) } })
								}
								className="flex-1 min-w-0 max-w-24 h-1.5 accent-violet-500"
							/>
							<span className="text-gray-400 w-10 shrink-0 text-right text-xs tabular-nums">{Math.round(params.reverb.width * 100)}%</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

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

export function PracticePlayer({ song, streamUrls, onBack, currentTakeId = null, takes, onTakeChange }: Props) {
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
	const [fxParams, setFxParams] = useState<Record<string, TrackFxParams>>(defaultFxParams);
	const [fxPanelTrackKey, setFxPanelTrackKey] = useState<string | null>(null);
	const [masterFxParams, setMasterFxParams] = useState<TrackFxParams>({ ...DEFAULT_FX });
	const [masterFxPanelOpen, setMasterFxPanelOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

	const fxChainRef = useRef<Record<string, FxChain | null>>({});
	const masterInputRef = useRef<GainNode | null>(null);
	const masterFxChainRef = useRef<FxChain | null>(null);

	const availableTracks = PRACTICE_TRACK_DEFS.filter((t) => streamUrls[t.key]);

	// Apply saved settings for this song/take on mount
	useEffect(() => {
		const saved = loadSavedSettings(song.id, currentTakeId ?? null);
		if (!saved) return;
		const defaultVolumes = Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, 100]));
		const defaultMuted = Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, false]));
		const defaultSolo = Object.fromEntries(PRACTICE_TRACK_DEFS.map((t) => [t.key, false]));
		setVolumes((prev) => ({ ...defaultVolumes, ...prev, ...saved.volumes }));
		setMuted((prev) => ({ ...defaultMuted, ...prev, ...saved.muted }));
		setSolo((prev) => ({ ...defaultSolo, ...prev, ...saved.solo }));
		setFxParams((prev) => {
			const next = { ...prev };
			for (const [key, p] of Object.entries(saved.fxParams ?? {})) {
				next[key] = normalizeFxParams(p);
			}
			return next;
		});
		if (saved.masterFxParams) setMasterFxParams(normalizeFxParams(saved.masterFxParams));
	}, [song.id, currentTakeId ?? '']);

	// When stems are ready, apply current mixer state (e.g. from saved settings) to gain nodes
	useEffect(() => {
		if (loadState !== 'ready' || availableTracks.length === 0) return;
		applyGains(volumes, muted, solo);
	}, [loadState, volumes, muted, solo]);

	// Per-track metadata used to build version-aware cache keys
	const trackMetaByKey = Object.fromEntries(
		song.tracks.map((t) => [t.trackKey, { storagePath: t.storagePath, version: t.version }]),
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

		// Master bus: all tracks sum here; master FX (if any) then goes to destination
		const masterInput = ctx.createGain();
		masterInput.gain.value = 1;
		masterInput.connect(ctx.destination);
		masterInputRef.current = masterInput;

		// Create a GainNode per track for independent volume/mute control
		for (const t of availableTracks) {
			const gain = ctx.createGain();
			gain.gain.value = 1;
			gain.connect(masterInput);
			gainNodesRef.current[t.key] = gain;
		}

		let cancelled = false;

		async function loadAll() {
			const cache = await caches.open(CACHE_NAME);

			const loadTrack = async (trackKey: string, signedUrl: string): Promise<[string, AudioBuffer]> => {
				const meta = trackMetaByKey[trackKey];
				// Cache key includes version so re-uploads always bust the cache.
				// Format: /practice-stem/{storagePath}?v={version}
				const cacheKey = meta ? `/practice-stem/${meta.storagePath}?v=${meta.version}` : null;

				setLoadProgress((prev) => ({ ...prev, [trackKey]: 0 }));

				let arrayBuffer: ArrayBuffer;
				const cached = cacheKey ? await cache.match(cacheKey) : null;

				if (cached) {
					// Instant load from browser cache — version matches, so it's fresh
					arrayBuffer = await cached.arrayBuffer();
					setLoadProgress((prev) => ({ ...prev, [trackKey]: 95 }));
				} else {
					// Download with XHR for progress feedback
					arrayBuffer = await downloadWithProgress(signedUrl, (pct) => {
						setLoadProgress((prev) => ({ ...prev, [trackKey]: pct }));
					});

					if (cacheKey && meta) {
						// Evict any stale cached versions of this track before storing the new one
						const allCached = await cache.keys();
						const stalePrefix = `/practice-stem/${meta.storagePath}?v=`;
						await Promise.all(
							allCached
								.filter((r) => r.url.includes(stalePrefix) && !r.url.endsWith(`v=${meta.version}`))
								.map((r) => cache.delete(r)),
						);

						// Cache the fresh download
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
			Object.entries(fxChainRef.current).forEach(([, c]) => {
				if (c) {
					try { c.output.disconnect(); } catch { /* already disconnected */ }
					if (c.chorusLFO) try { c.chorusLFO.stop(); } catch { /* already stopped */ }
					if (c.chorusConst) try { c.chorusConst.stop(); } catch { /* already stopped */ }
				}
			});
			fxChainRef.current = {};
			const masterChain = masterFxChainRef.current;
			if (masterChain) {
				try { masterChain.output.disconnect(); } catch { /* already disconnected */ }
				if (masterChain.chorusLFO) try { masterChain.chorusLFO.stop(); } catch { /* already stopped */ }
				if (masterChain.chorusConst) try { masterChain.chorusConst.stop(); } catch { /* already stopped */ }
				masterFxChainRef.current = null;
			}
			const masterInput = masterInputRef.current;
			if (masterInput) {
				try { masterInput.disconnect(); } catch { /* already disconnected */ }
				masterInputRef.current = null;
			}
			ctx.close();
			audioCtxRef.current = null;
			buffersRef.current = {};
			gainNodesRef.current = {};
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [song.id, Object.keys(streamUrls).sort().join(',')]);

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

	/** Destination for all track outputs (master bus input). */
	function getMasterInput(): GainNode | null {
		return masterInputRef.current;
	}

	/** Reconnect a track's gain to master bus, optionally through an FX chain. */
	function reconnectTrackOutput(trackKey: string, paramsOverride?: TrackFxParams) {
		const ctx = audioCtxRef.current;
		const gain = gainNodesRef.current[trackKey];
		const masterInput = getMasterInput();
		if (!ctx || !gain || !masterInput) return;
		const params = paramsOverride ?? fxParams[trackKey] ?? DEFAULT_FX;
		const oldChain = fxChainRef.current[trackKey];

		gain.disconnect();
		if (oldChain) {
			try { oldChain.output.disconnect(); } catch { /* already disconnected */ }
			if (oldChain.chorusLFO) try { oldChain.chorusLFO.stop(); } catch { /* already stopped */ }
			if (oldChain.chorusConst) try { oldChain.chorusConst.stop(); } catch { /* already stopped */ }
			fxChainRef.current[trackKey] = null;
		}

		const chain = buildFxChain(ctx, trackKey, params);
		if (chain) {
			gain.connect(chain.nodes[0]);
			chain.output.connect(masterInput);
			fxChainRef.current[trackKey] = chain;
			applyFxParams(chain, params);
		} else {
			gain.connect(masterInput);
		}
	}

	/** Reconnect master bus through optional master FX chain to destination. */
	function reconnectMasterOutput(paramsOverride?: TrackFxParams) {
		const ctx = audioCtxRef.current;
		const masterInput = masterInputRef.current;
		if (!ctx || !masterInput) return;
		const params = normalizeFxParams(paramsOverride ?? masterFxParams);
		const hasAny = params.eq.on || params.compressor.on || params.delay.on || params.chorus.on || params.reverb.on;

		masterInput.disconnect();
		const oldChain = masterFxChainRef.current;
		if (oldChain) {
			try { oldChain.output.disconnect(); } catch { /* already disconnected */ }
			if (oldChain.chorusLFO) try { oldChain.chorusLFO.stop(); } catch { /* already stopped */ }
			if (oldChain.chorusConst) try { oldChain.chorusConst.stop(); } catch { /* already stopped */ }
			masterFxChainRef.current = null;
		}

		if (hasAny) {
			const chain = buildFxChain(ctx, 'master', params);
			if (chain) {
				masterInput.connect(chain.nodes[0]);
				chain.output.connect(ctx.destination);
				masterFxChainRef.current = chain;
				applyFxParams(chain, params);
			} else {
				masterInput.connect(ctx.destination);
			}
		} else {
			masterInput.connect(ctx.destination);
		}
	}

	function handleMasterFxParamChange(next: TrackFxParams) {
		setMasterFxParams(next);
		const chain = masterFxChainRef.current;
		const hasSameStructure =
			chain &&
			chain.eqBands.length > 0 === next.eq.on &&
			Boolean(chain.comp) === next.compressor.on &&
			Boolean(chain.delay) === next.delay.on &&
			Boolean(chain.chorusDelay) === next.chorus.on &&
			Boolean(chain.reverb) === next.reverb.on;
		if (chain && hasSameStructure) {
			applyFxParams(chain, next);
		} else {
			reconnectMasterOutput(next);
		}
	}

	function handleFxParamChange(trackKey: string, next: TrackFxParams) {
		setFxParams((prev) => ({ ...prev, [trackKey]: next }));
		const chain = fxChainRef.current[trackKey];
		const hasSameStructure =
			chain &&
			chain.eqBands.length > 0 === next.eq.on &&
			Boolean(chain.comp) === next.compressor.on &&
			Boolean(chain.delay) === next.delay.on &&
			Boolean(chain.chorusDelay) === next.chorus.on &&
			Boolean(chain.reverb) === next.reverb.on;
		if (chain && hasSameStructure) {
			applyFxParams(chain, next);
		} else {
			reconnectTrackOutput(trackKey, next);
		}
	}

	/** Compute gain for each track (same logic as applyGains) for offline mix. */
	function getMixGains(): Record<string, number> {
		const anySolo = Object.values(solo).some(Boolean);
		const out: Record<string, number> = {};
		for (const t of availableTracks) {
			if (anySolo) {
				out[t.key] = solo[t.key] ? (volumes[t.key] ?? 100) / 100 : 0;
			} else {
				out[t.key] = muted[t.key] ? 0 : (volumes[t.key] ?? 100) / 100;
			}
		}
		return out;
	}

	/** Render current mix (volume/mute/solo + per-track FX + master FX) to an MP3 and trigger download. */
	async function handleDownloadMix() {
		if (availableTracks.length === 0 || isExporting) return;

		const buffers = buffersRef.current;
		let sampleRate = 44100;
		let durationSec = 0;
		for (const t of availableTracks) {
			const buf = buffers[t.key];
			if (buf) {
				sampleRate = buf.sampleRate;
				durationSec = Math.max(durationSec, buf.duration);
			}
		}
		if (durationSec <= 0) return;

		setIsExporting(true);
		try {
			const lengthFrames = Math.ceil(durationSec * sampleRate);
			const ctx = new OfflineAudioContext(2, lengthFrames, sampleRate);
			const mixGains = getMixGains();
			const masterParams = normalizeFxParams(masterFxParams);
			const hasMasterFx = masterParams.eq.on || masterParams.compressor.on || masterParams.delay.on || masterParams.chorus.on || masterParams.reverb.on;

			// Master bus: all tracks sum here, then optional master FX to destination
			const masterInput = ctx.createGain();
			masterInput.gain.value = 1;
			if (hasMasterFx) {
				const masterChain = buildFxChain(ctx, 'master', masterParams);
				if (masterChain) {
					masterInput.connect(masterChain.nodes[0]);
					masterChain.output.connect(ctx.destination);
					applyFxParams(masterChain, masterParams);
				} else {
					masterInput.connect(ctx.destination);
				}
			} else {
				masterInput.connect(ctx.destination);
			}

			for (const t of availableTracks) {
				const buffer = buffers[t.key];
				const gainVal = mixGains[t.key] ?? 0;
				if (!buffer || gainVal === 0) continue;

				const source = ctx.createBufferSource();
				source.buffer = buffer;
				const trackGain = ctx.createGain();
				trackGain.gain.value = gainVal;
				source.connect(trackGain);
				source.start(0);

				const trackParams = normalizeFxParams(fxParams[t.key] ?? DEFAULT_FX);
				const hasTrackFx = trackParams.eq.on || trackParams.compressor.on || trackParams.delay.on || trackParams.chorus.on || trackParams.reverb.on;
				if (hasTrackFx) {
					const trackChain = buildFxChain(ctx, t.key, trackParams);
					if (trackChain) {
						trackGain.connect(trackChain.nodes[0]);
						trackChain.output.connect(masterInput);
						applyFxParams(trackChain, trackParams);
					} else {
						trackGain.connect(masterInput);
					}
				} else {
					trackGain.connect(masterInput);
				}
			}

			const rendered = await ctx.startRendering();
			const leftF32 = rendered.getChannelData(0);
			const rightF32 = rendered.numberOfChannels >= 2 ? rendered.getChannelData(1) : leftF32;

			const encoder = await createMp3Encoder();
			encoder.configure({
				sampleRate,
				channels: 2,
				bitrate: 128,
			});

			const encoded = encoder.encode([leftF32, rightF32]);
			const copy1 = new Uint8Array(encoded.length);
			if (encoded.length > 0) copy1.set(encoded);
			const final = encoder.finalize();
			const copy2 = new Uint8Array(final.length);
			if (final.length > 0) copy2.set(final);

			const totalLen = copy1.length + copy2.length;
			const combined = new Uint8Array(totalLen);
			combined.set(copy1);
			combined.set(copy2, copy1.length);

			const blob = new Blob([combined], { type: 'audio/mp3' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${song.title.replace(/[^\w\s-]/g, '')}-mix.mp3`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export mix failed:', err);
		} finally {
			setIsExporting(false);
		}
	}

	function handleSaveSettings() {
		saveSettingsToStorage(song.id, currentTakeId ?? null, {
			volumes: { ...volumes },
			muted: { ...muted },
			solo: { ...solo },
			fxParams: Object.fromEntries(
				Object.entries(fxParams).map(([k, p]) => [k, normalizeFxParams(p)]),
			),
			masterFxParams: normalizeFxParams(masterFxParams),
		});
		setSettingsSavedAt(Date.now());
		setTimeout(() => setSettingsSavedAt(null), 2000);
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
	const hasTakes = (takes?.length ?? 0) > 0;

	return (
		<div className="space-y-6">
			{/* Song header */}
			<div className="flex flex-wrap items-start gap-4">
				<button
					type="button"
					onClick={onBack}
					className="mt-1 text-sm text-gray-400 hover:text-white transition-colors shrink-0"
				>
					← Back
				</button>
				<div className="min-w-0 flex-1">
					<h2 className="text-3xl font-bold text-white leading-tight">{song.title}</h2>
					<p className="text-gray-400 mt-0.5">{song.artist}</p>
					<p className="text-xs text-gray-600 mt-1">
						{availableTracks.length} of {PRACTICE_TRACK_DEFS.length - (song.disabledTracks ?? []).length} tracks loaded
					</p>
					{/* Take switcher */}
					{hasTakes && onTakeChange && (
						<div className="flex flex-wrap items-center gap-2 mt-3">
							<span className="text-xs text-gray-500 uppercase tracking-widest">Source:</span>
							<button
								type="button"
								onClick={() => onTakeChange(null)}
								className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
									currentTakeId == null || currentTakeId === ''
										? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
										: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
								}`}
							>
								Original
							</button>
							{(takes ?? []).map((take) => (
								<button
									key={take.id}
									type="button"
									onClick={() => onTakeChange(take.id)}
									className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
										currentTakeId === take.id
											? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
											: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
									}`}
								>
									{take.name}
								</button>
							))}
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={handleSaveSettings}
					title="Save mixer and FX settings for this song (and take) to this device"
					className="shrink-0 text-xs px-3 py-2 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors font-medium"
				>
					{settingsSavedAt ? 'Saved ✓' : 'Save settings'}
				</button>
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
						<div className="flex items-center w-full">
							<div className="flex-1 min-w-0" aria-hidden />
							<div className="flex items-center justify-center gap-4 shrink-0">
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
							<div className="flex-1 min-w-0 flex justify-end">
							<button
								type="button"
								onClick={handleDownloadMix}
								disabled={isExporting}
								title="Download MP3 mix (current volume, mute & solo)"
								className="flex items-center gap-2 px-2.5 py-2 sm:px-4 rounded-full border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
							>
								{isExporting ? (
									<span className="animate-pulse">…</span>
								) : (
									<>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="w-4 h-4 shrink-0"
											aria-hidden
										>
											<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
											<polyline points="7 10 12 15 17 10" />
											<line x1="12" y1="15" x2="12" y2="3" />
										</svg>
										<span className="hidden sm:inline">Download current mix</span>
									</>
								)}
							</button>
							</div>
						</div>
					</div>

					{/* Mixer panel */}
					<div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
							<h3 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
								Mixer
							</h3>
							<div className="flex items-center gap-3">
								<button
									type="button"
									title="Master FX — apply effects to the entire mix"
									onClick={() => setMasterFxPanelOpen((open) => !open)}
									className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
										masterFxPanelOpen
											? 'border-violet-500 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
											: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
									}`}
								>
									Master FX
								</button>
								{Object.values(solo).some(Boolean) && (
									<span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">
										Solo active
									</span>
								)}
								<p className="text-xs text-gray-500">{availableTracks.length} tracks</p>
							</div>
						</div>

						{masterFxPanelOpen && (
							<div className="px-6 py-4 bg-gray-900/60 border-b border-gray-700/60">
								<p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Effects apply to entire mix</p>
								<FxPanel
									trackKey="master"
									params={normalizeFxParams(masterFxParams)}
									onChange={handleMasterFxParamChange}
								/>
							</div>
						)}

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
												<div key={trackDef.key}>
												<div
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

															<button
																type="button"
																title="Audio effects (EQ, reverb, compression, delay)"
																onClick={() =>
																	setFxPanelTrackKey((k) => (k === trackDef.key ? null : trackDef.key))
																}
																className={`shrink-0 text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
																	fxPanelTrackKey === trackDef.key
																		? 'border-violet-500 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
																		: 'border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
																}`}
															>
																FX
															</button>
														</>
													) : (
														<span className="text-xs text-gray-600 italic">
															not uploaded
														</span>
													)}
												</div>

												{/* FX panel for this track */}
												{hasTrack && fxPanelTrackKey === trackDef.key && (
													<div className="px-6 py-4 bg-gray-900/60 border-t border-gray-700/60">
														<FxPanel
															trackKey={trackDef.key}
															params={normalizeFxParams(fxParams[trackDef.key] ?? DEFAULT_FX)}
															onChange={(next) => handleFxParamChange(trackDef.key, next)}
														/>
													</div>
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
