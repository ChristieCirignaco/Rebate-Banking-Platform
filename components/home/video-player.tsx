"use client";

import { useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

// Click-to-play video with a mute toggle, matching the reference "A Message From Donald
// J. Trump" clip behavior.
export function VideoPlayer({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_40px_rgba(30,58,138,0.35)] ${className}`}
      onClick={togglePlay}
      role="button"
      tabIndex={0}
      aria-label="Play video message"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") togglePlay();
      }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        className="aspect-video h-full w-full object-cover"
      />
      {!playing && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-105">
            <Play className="ml-1 h-8 w-8 fill-[var(--trb-dark)] text-[var(--trb-dark)]" />
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}
