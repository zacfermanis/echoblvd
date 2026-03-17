'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export function LogoVideo() {
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlayAgain() {
    setVideoEnded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }

  return (
    <div
      className={`relative transition-all duration-1000 ease-in-out ${
        videoEnded
          ? 'w-48 h-64 sm:w-64 sm:h-80 lg:w-80 lg:h-96 mb-8'
          : 'w-96 h-[32rem] sm:w-[32rem] sm:h-[40rem] lg:w-[40rem] lg:h-[48rem] mb-0'
      }`}
    >
      {/* Logo — sits underneath, fades in when video ends */}
      <Image
        src="/Echo Blvd Logo.svg"
        alt="Echo Blvd Logo"
        fill
        className={`object-contain transition-opacity duration-1000 ease-in-out ${
          videoEnded ? 'opacity-100' : 'opacity-0'
        }`}
        priority
      />

      {/* Video — fades out when it ends */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${
          videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onEnded={() => setVideoEnded(true)}
      >
        <source src="/EchoBlvd_1.mp4" type="video/mp4" />
      </video>

      {/* Play again button — appears after video ends */}
      <button
        onClick={handlePlayAgain}
        className={`absolute -bottom-6 -right-8 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-all duration-300 ${
          videoEnded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Play video again"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
        play again
      </button>
    </div>
  );
}
