"use client";

import { useRef, useState } from "react";

const blobBaseUrl = "https://tu8dyrkppxcttpj1.public.blob.vercel-storage.com";

const workVideos = [
  {
    id: "wall-print-1",
    poster: `${blobBaseUrl}/work-videos/wall-print-1-poster.jpg`,
    src: `${blobBaseUrl}/work-videos/wall-print-1.mp4`
  },
  {
    id: "wall-print-2",
    poster: `${blobBaseUrl}/work-videos/wall-print-2-poster.jpg`,
    src: `${blobBaseUrl}/work-videos/wall-print-2.mp4`
  },
  {
    id: "wall-print-3",
    poster: `${blobBaseUrl}/work-videos/wall-print-3-poster.jpg`,
    src: `${blobBaseUrl}/work-videos/wall-print-3.mp4`
  }
] as const;

function canUseHoverPlayback() {
  return window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;
}

function WorkVideoCard({ video, index }: { video: (typeof workVideos)[number]; index: number }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playVideo = () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.muted = true;
    void videoElement
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const pauseVideo = () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    videoElement.pause();
    setIsPlaying(false);
  };

  const toggleVideo = () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    if (videoElement.paused) {
      playVideo();
      return;
    }

    pauseVideo();
  };

  return (
    <button
      aria-label={`${isPlaying ? "Pause" : "Play"} Chicago wall print work clip ${index + 1}`}
      className="group overflow-hidden rounded-lg border bg-card text-left outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      data-testid="work-video-card"
      onClick={toggleVideo}
      onMouseEnter={() => {
        if (canUseHoverPlayback()) {
          playVideo();
        }
      }}
      onMouseLeave={() => {
        if (canUseHoverPlayback()) {
          pauseVideo();
        }
      }}
      type="button"
    >
      <video
        className="aspect-[4/5] w-full bg-muted object-cover lg:aspect-[9/14]"
        data-testid="work-video"
        loop
        muted
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        playsInline
        poster={video.poster}
        preload="metadata"
        ref={videoRef}
      >
        <source src={video.src} type="video/mp4" />
        Your browser does not support this video.
      </video>
    </button>
  );
}

export function WorkVideosSection() {
  return (
    <section aria-labelledby="work-videos-heading" className="border-t bg-background px-4 py-10 md:px-6 md:py-12" data-testid="work-videos-section">
      <div className="mx-auto grid max-w-6xl gap-6">
        <div className="grid gap-2">
          <h2 className="text-3xl font-semibold leading-tight md:text-5xl" id="work-videos-heading">
            Our work in the Chicago area
          </h2>
        </div>

        <div className="-mx-4 grid auto-cols-[minmax(16rem,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto lg:overflow-visible lg:px-0 lg:pb-0">
          {workVideos.map((video, index) => (
            <WorkVideoCard index={index} key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}
