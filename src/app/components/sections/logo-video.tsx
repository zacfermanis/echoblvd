'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export function LogoVideo() {
  const [videoEnded, setVideoEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleToggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }

  function handlePlayAgain() {
    setVideoEnded(false);
    setIsMuted(true);
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }

  return (
    <div
      className={`relative transition-all duration-1000 ease-in-out ${
        videoEnded
          ? 'w-48 sm:w-64 lg:w-80 mb-8'
          : 'w-full max-w-4xl mb-0'
      }`}
    >
      {/* Small logo above video during playback */}
      <div className={`flex justify-center transition-all duration-1000 ease-in-out ${
        videoEnded ? 'h-0 opacity-0 mb-0' : 'h-16 sm:h-20 opacity-100 mb-4'
      }`}>
        <Image
          src="/Echo Blvd Logo.svg"
          alt="Echo Blvd"
          width={80}
          height={80}
          className="object-contain h-full w-auto"
        />
      </div>

      {/* Aspect-ratio wrapper — landscape while video plays, portrait for logo */}
      <div className={`relative transition-all duration-1000 ease-in-out ${
        videoEnded ? 'aspect-[3/4]' : 'aspect-video'
      }`}>
        <Image
          src="/Echo Blvd Logo.svg"
          alt="Echo Blvd Logo"
          fill
          className={`object-contain transition-opacity duration-1000 ease-in-out ${
            videoEnded ? 'opacity-100' : 'opacity-0'
          }`}
          priority
        />

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          onEnded={() => setVideoEnded(true)}
        >
          <source src="https://8seirfiyslx0jmio.public.blob.vercel-storage.com/EchoBlvd_1.mp4" type="video/mp4" />
        </video>

        <button
          onClick={handleToggleMute}
          className={`absolute bottom-2 right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-300 ${
            videoEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      </div>

      <button
        onClick={handlePlayAgain}
        className={`absolute -bottom-6 right-0 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-all duration-300 ${
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
