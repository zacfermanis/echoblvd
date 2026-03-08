'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PracticeSong } from '@/app/types/band';
import { PracticePlayer } from '../practice-player';

interface Props {
	song: PracticeSong;
	initialStreamUrls: Record<string, string>;
	initialTakeId?: string | null;
}

export function PracticePlayerPage({ song, initialStreamUrls, initialTakeId }: Props) {
	const router = useRouter();
	const [currentTakeId, setCurrentTakeId] = useState<string | null>(initialTakeId ?? null);
	const [streamUrls, setStreamUrls] = useState<Record<string, string>>(initialStreamUrls);

	const hasTakes = (song.takes?.length ?? 0) > 0;

	// When switching take, fetch stream URLs for that take
	useEffect(() => {
		if (currentTakeId == null || currentTakeId === '') {
			setStreamUrls(initialStreamUrls);
			return;
		}
		let cancelled = false;
		void (async () => {
			const res = await fetch(
				`/api/admin/practice/stream-urls?songId=${encodeURIComponent(song.id)}&takeId=${encodeURIComponent(currentTakeId)}`,
			);
			if (!res.ok || cancelled) return;
			const data = (await res.json()) as { urls?: Record<string, string> };
			if (!cancelled) setStreamUrls(data.urls ?? {});
		})();
		return () => {
			cancelled = true;
		};
	}, [song.id, currentTakeId, initialStreamUrls]);

	const handleTakeChange = useCallback((takeId: string | null) => {
		setCurrentTakeId(takeId);
	}, []);

	// Resolve effective tracks for current take (player uses this for metadata/display)
	const effectiveTracks = currentTakeId && hasTakes
		? (song.takes!.find((t) => t.id === currentTakeId)?.tracks ?? song.tracks)
		: song.tracks;

	const effectiveSong: PracticeSong = {
		...song,
		tracks: effectiveTracks,
	};

	return (
		<PracticePlayer
			key={currentTakeId ?? 'original'}
			song={effectiveSong}
			streamUrls={streamUrls}
			onBack={() => router.push('/admin/practice')}
			currentTakeId={currentTakeId}
			takes={song.takes}
			onTakeChange={hasTakes ? handleTakeChange : undefined}
		/>
	);
}
