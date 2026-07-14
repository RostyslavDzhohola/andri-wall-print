"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { InstagramProjectMedia } from "@/lib/instagram-project-media";

type InstagramProjectCarouselProps = {
  projects: InstagramProjectMedia[];
};

export function InstagramProjectCarousel({ projects }: InstagramProjectCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);
  const activeProject = projects[activeIndex];
  const hasMultipleProjects = projects.length > 1;

  const showProject = useCallback(
    (index: number) => {
      videoRef.current?.pause();
      setIsPlaying(false);
      setActiveIndex((index + projects.length) % projects.length);
    },
    [projects.length]
  );

  const showPrevious = useCallback(() => showProject(activeIndex - 1), [activeIndex, showProject]);
  const showNext = useCallback(() => showProject(activeIndex + 1), [activeIndex, showProject]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
      video.currentTime = 0;
    }
  }, [activeIndex]);

  if (!activeProject) {
    return null;
  }

  return (
    <div
      aria-label="Wall Print Pro Instagram projects"
      className="mt-12 grid gap-6"
      data-testid="instagram-project-carousel"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && hasMultipleProjects) {
          event.preventDefault();
          showPrevious();
        } else if (event.key === "ArrowRight" && hasMultipleProjects) {
          event.preventDefault();
          showNext();
        } else if ((event.key === " " || event.key === "Enter") && activeProject.kind === "video" && event.target === event.currentTarget) {
          event.preventDefault();
          void togglePlayback();
        }
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;

        if (startX === null || !hasMultipleProjects) {
          return;
        }

        const distance = event.changedTouches[0]?.clientX - startX;

        if (Math.abs(distance) < 48) {
          return;
        }

        if (distance < 0) {
          showNext();
        } else {
          showPrevious();
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      role="region"
      tabIndex={0}
    >
      <div className="relative mx-auto aspect-[4/5] w-full max-w-3xl overflow-hidden rounded-[0.875rem] border border-border bg-black shadow-[0_24px_70px_rgba(35,31,25,.12)] sm:aspect-[16/10]">
        {activeProject.kind === "video" ? (
          <video
            aria-label={`${activeProject.title} video`}
            className="pointer-events-none h-full w-full object-contain"
            data-testid="instagram-project-video"
            key={activeProject.mediaId}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            playsInline
            poster={activeProject.posterUrl ?? undefined}
            preload="metadata"
            ref={videoRef}
            src={activeProject.mediaUrl}
          />
        ) : (
          // The URL is returned by Meta's authorized API and refreshed server-side.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={activeProject.title}
            className="pointer-events-none h-full w-full object-contain"
            data-testid="instagram-project-image"
            key={activeProject.mediaId}
            src={activeProject.mediaUrl}
          />
        )}

        {activeProject.kind === "video" ? (
          <button
            aria-label={isPlaying ? `Pause ${activeProject.title}` : `Play ${activeProject.title}`}
            className="pointer-events-none absolute inset-0 grid place-items-center text-white outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/80"
            data-testid="instagram-project-playback"
            onClick={() => void togglePlayback()}
            type="button"
          >
            <span className="instagram-project-play-control pointer-events-auto grid size-16 place-items-center rounded-full border border-white/35 bg-black/65 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
              {isPlaying ? <Pause aria-hidden="true" className="size-7 fill-current" /> : <Play aria-hidden="true" className="ml-1 size-7 fill-current" />}
            </span>
          </button>
        ) : null}

      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div aria-live="polite" className="grid gap-2" data-testid="instagram-project-context">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Project {activeIndex + 1} of {projects.length}</p>
          <h3 className="text-2xl font-semibold leading-snug text-foreground">{activeProject.title}</h3>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{activeProject.summary}</p>
        </div>
        {hasMultipleProjects ? (
          <div className="grid gap-2 sm:justify-items-end">
            <div className="flex gap-2" aria-label="Project navigation">
              <Button
                aria-label="Previous project"
                className="size-11 rounded-full motion-reduce:transition-none"
                data-testid="instagram-project-previous"
                onClick={showPrevious}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </Button>
              <Button
                aria-label="Next project"
                className="size-11 rounded-full motion-reduce:transition-none"
                data-testid="instagram-project-next"
                onClick={showNext}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </Button>
            </div>
            <div className="flex gap-2" aria-label="Choose a project">
              {projects.map((project, index) => (
                <button
                  aria-label={`Show project ${index + 1}: ${project.title}`}
                  aria-pressed={index === activeIndex}
                  className="size-11 rounded-full border border-border text-sm font-semibold tabular-nums text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  key={project.projectId}
                  onClick={() => showProject(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
