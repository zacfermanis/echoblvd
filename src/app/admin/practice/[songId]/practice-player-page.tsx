'use client';

import { useRouter } from 'next/navigation';
import type { PracticeSong } from '@/app/types/band';
import { PracticePlayer } from '../practice-player';

interface Props {
	song: PracticeSong;
	streamUrls: Record<string, string>;
}

export function PracticePlayerPage({ song, streamUrls }: Props) {
	const router = useRouter();
	return (
		<PracticePlayer
			song={song}
			streamUrls={streamUrls}
			onBack={() => router.push('/admin/practice')}
		/>
	);
}
