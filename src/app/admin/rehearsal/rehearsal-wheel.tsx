'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetListEntry } from '@/app/types/band';

interface Props {
	songs: SetListEntry[];
}

const SEGMENT_COLORS = [
	'#4f46e5', // indigo
	'#7c3aed', // violet
	'#2563eb', // blue
	'#0891b2', // cyan
	'#0d9488', // teal
	'#059669', // emerald
	'#65a30d', // lime
	'#ca8a04', // yellow
	'#dc2626', // red
	'#db2777', // pink
	'#9333ea', // purple
	'#6366f1', // indigo-light
];

const TWO_PI = 2 * Math.PI;
// Pointer is at the top of the wheel (12 o'clock = 270° = 3π/2 in canvas coords)
const POINTER_ANGLE = (3 * Math.PI) / 2;
const SPIN_DURATION_MS = 4500;
const MIN_EXTRA_SPINS = 6;
const MAX_EXTRA_SPINS = 9;

const CANVAS_W = 520;
const CANVAS_H = 560;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2 + 20; // shift center down to give pointer room at top
const RADIUS = 230;

function easeOut(t: number): number {
	return 1 - Math.pow(1 - t, 4);
}

function getWinnerIndex(rotation: number, count: number): number {
	const segAngle = TWO_PI / count;
	const normalised = ((POINTER_ANGLE - rotation) % TWO_PI + TWO_PI) % TWO_PI;
	return Math.floor(normalised / segAngle) % count;
}

const fieldLabel: Record<string, string> = {
	zacTuning: 'Tuning',
	zacPedal: 'Pedal',
	zacGuitar: 'Guitar',
	zacKeys: 'Keys',
	tomTuning: 'Tuning',
	tomGuitar: 'Guitar',
	jeremyTuning: 'Tuning',
	jeremyGuitar: 'Guitar',
};

export function RehearsalWheel({ songs: initialSongs }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rotationRef = useRef(0);
	const animRef = useRef<number | null>(null);
	const startTimeRef = useRef<number | null>(null);
	const startRotRef = useRef(0);
	const targetRotRef = useRef(0);
	const remainingRef = useRef<SetListEntry[]>(initialSongs);

	const [remaining, setRemaining] = useState<SetListEntry[]>(initialSongs);
	const [spinning, setSpinning] = useState(false);
	const [selected, setSelected] = useState<SetListEntry | null>(null);

	// Keep ref in sync with state so animation closure can read latest value
	useEffect(() => {
		remainingRef.current = remaining;
	}, [remaining]);

	const drawWheel = useCallback((rot: number, songs: SetListEntry[]) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

		if (songs.length === 0) {
			ctx.beginPath();
			ctx.arc(CX, CY, RADIUS, 0, TWO_PI);
			ctx.fillStyle = '#374151';
			ctx.fill();
			ctx.fillStyle = '#9ca3af';
			ctx.font = 'bold 18px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('All songs rehearsed!', CX, CY);
			return;
		}

		const segAngle = TWO_PI / songs.length;
		const fontSize = Math.max(7, Math.min(13, 380 / songs.length));

		for (let i = 0; i < songs.length; i++) {
			const startAngle = rot + i * segAngle;
			const endAngle = rot + (i + 1) * segAngle;
			const midAngle = rot + (i + 0.5) * segAngle;

			// Segment
			ctx.beginPath();
			ctx.moveTo(CX, CY);
			ctx.arc(CX, CY, RADIUS, startAngle, endAngle);
			ctx.closePath();
			ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
			ctx.fill();
			ctx.strokeStyle = '#111827';
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Song label — radial, right-aligned from near the rim
			ctx.save();
			ctx.translate(CX, CY);
			ctx.rotate(midAngle);
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
			ctx.fillStyle = 'white';
			ctx.shadowColor = 'rgba(0,0,0,0.8)';
			ctx.shadowBlur = 3;
			const maxChars = Math.max(8, Math.floor((RADIUS - 30) / (fontSize * 0.58)));
			const label =
				songs[i].song.length > maxChars
					? songs[i].song.slice(0, maxChars - 1) + '…'
					: songs[i].song;
			ctx.fillText(label, RADIUS - 14, 0);
			ctx.restore();
		}

		// Outer ring
		ctx.beginPath();
		ctx.arc(CX, CY, RADIUS, 0, TWO_PI);
		ctx.strokeStyle = '#4b5563';
		ctx.lineWidth = 4;
		ctx.stroke();

		// Centre hub
		ctx.beginPath();
		ctx.arc(CX, CY, 20, 0, TWO_PI);
		ctx.fillStyle = '#111827';
		ctx.fill();
		ctx.strokeStyle = '#4f46e5';
		ctx.lineWidth = 3;
		ctx.stroke();

		// Pointer — downward-pointing triangle at 12 o'clock
		const tipX = CX;
		const tipY = CY - RADIUS + 4; // tip touches wheel edge
		const baseY = tipY - 36;
		const baseHalf = 13;
		ctx.beginPath();
		ctx.moveTo(tipX, tipY);
		ctx.lineTo(tipX - baseHalf, baseY);
		ctx.lineTo(tipX + baseHalf, baseY);
		ctx.closePath();
		ctx.fillStyle = '#f59e0b';
		ctx.fill();
		ctx.strokeStyle = '#92400e';
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}, []);

	// Redraw whenever the remaining list changes (initial draw + post-spin update)
	useEffect(() => {
		drawWheel(rotationRef.current, remaining);
	}, [remaining, drawWheel]);

	function spin() {
		if (spinning || remaining.length === 0) return;

		const extraSpins =
			MIN_EXTRA_SPINS + Math.random() * (MAX_EXTRA_SPINS - MIN_EXTRA_SPINS);
		const randomAngle = Math.random() * TWO_PI;
		const totalDelta = extraSpins * TWO_PI + randomAngle;

		startRotRef.current = rotationRef.current;
		targetRotRef.current = rotationRef.current + totalDelta;
		startTimeRef.current = null;

		setSpinning(true);
		setSelected(null);

		function animate(timestamp: number) {
			if (startTimeRef.current === null) startTimeRef.current = timestamp;
			const elapsed = timestamp - startTimeRef.current;
			const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
			const eased = easeOut(progress);

			rotationRef.current =
				startRotRef.current + eased * (targetRotRef.current - startRotRef.current);

			drawWheel(rotationRef.current, remainingRef.current);

			if (progress < 1) {
				animRef.current = requestAnimationFrame(animate);
			} else {
				rotationRef.current = targetRotRef.current;
				const songs = remainingRef.current;
				const winnerIdx = getWinnerIndex(rotationRef.current, songs.length);
				const winner = songs[winnerIdx];
				setSelected(winner);
				setRemaining(prev => prev.filter(s => s.id !== winner.id));
				setSpinning(false);
			}
		}

		animRef.current = requestAnimationFrame(animate);
	}

	function reset() {
		if (animRef.current !== null) {
			cancelAnimationFrame(animRef.current);
			animRef.current = null;
		}
		rotationRef.current = 0;
		remainingRef.current = initialSongs;
		setRemaining(initialSongs);
		setSelected(null);
		setSpinning(false);
	}

	const canSpin = !spinning && remaining.length > 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-white">Rehearsal</h1>
					<p className="text-gray-400 text-sm mt-1">
						{remaining.length} of {initialSongs.length} songs remaining
					</p>
				</div>
				<button
					type="button"
					onClick={reset}
					className="rounded-md border border-gray-600 text-gray-200 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
				>
					Reset
				</button>
			</div>

			{/* Selected song title — above the spinner */}
			<div className="text-center min-h-[4rem] flex flex-col items-center justify-center">
				{selected ? (
					<>
						<p className="text-5xl font-extrabold text-amber-400 leading-tight">{selected.song}</p>
						<p className="text-xl text-gray-300 mt-2">{selected.artist}</p>
						{selected.length ? (
							<p className="text-gray-500 text-base mt-1">{selected.length}</p>
						) : null}
					</>
				) : (
					<p className="text-gray-600 text-lg italic">Spin to pick a song…</p>
				)}
			</div>

			{/* Three-column layout: Zac | Wheel | Tom + Jeremy */}
			<div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-6 items-start">

				{/* Left: Zac — stacks below wheel on mobile */}
				<div className="order-2 lg:order-1 lg:pt-4">
					{selected && (
						<MemberSection label="Zac" fields={['zacGuitar', 'zacTuning', 'zacPedal', 'zacKeys']} entry={selected} />
					)}
				</div>

				{/* Center: Wheel + button — first on mobile */}
				<div className="order-1 lg:order-2 flex flex-col items-center gap-4">
					<button
						type="button"
						onClick={spin}
						disabled={!canSpin}
						className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-10 py-3 text-lg transition-colors"
					>
						{spinning ? 'Spinning…' : remaining.length === 0 ? 'All Done!' : 'Spin!'}
					</button>
					<canvas
						ref={canvasRef}
						width={CANVAS_W}
						height={CANVAS_H}
						onClick={canSpin ? spin : undefined}
						className={`w-full max-w-[520px] transition-opacity ${canSpin ? 'cursor-pointer' : 'cursor-default'} ${remaining.length === 0 ? 'opacity-60' : 'opacity-100'}`}
					/>
				</div>

				{/* Right: Tom + Jeremy — stacks after Zac on mobile */}
				<div className="order-3 lg:pt-4 space-y-3">
					{selected && (
						<>
							<MemberSection label="Tom" fields={['tomGuitar', 'tomTuning']} entry={selected} />
							<MemberSection label="Jeremy" fields={['jeremyGuitar', 'jeremyTuning']} entry={selected} />
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function MemberSection({
	label,
	fields,
	entry,
}: {
	label: string;
	fields: (keyof SetListEntry)[];
	entry: SetListEntry;
}) {
	return (
		<section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
			<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
				{label}
			</h3>
			<dl className="space-y-2">
				{fields.map(field => (
					<div key={field}>
						<dt className="text-xs text-gray-500">{fieldLabel[field]}</dt>
						<dd className="mt-0.5 text-white text-sm">
							{(entry[field] as string | undefined) || '—'}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
