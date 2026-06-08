const workVideos = [
  {
    id: "wall-print-1",
    poster: "/artworks/chicago-final-1.png",
    src: "/work-videos/wall-print-1.mp4"
  },
  {
    id: "wall-print-2",
    poster: "/artworks/chicago-final-2.png",
    src: "/work-videos/wall-print-2.mp4"
  },
  {
    id: "wall-print-3",
    poster: "/artworks/chicago-final-3.png",
    src: "/work-videos/wall-print-3.mp4"
  }
] as const;

export function WorkVideosSection() {
  return (
    <section aria-labelledby="work-videos-heading" className="border-t bg-background px-4 py-12 md:px-6" data-testid="work-videos-section">
      <div className="mx-auto grid max-w-6xl gap-6">
        <h2 className="text-3xl font-semibold leading-tight md:text-5xl" id="work-videos-heading">
          Check out work
        </h2>

        <div className="grid gap-4 lg:grid-cols-3">
          {workVideos.map((video) => (
            <div className="overflow-hidden rounded-lg border bg-card" data-testid="work-video-card" key={video.id}>
              <video
                className="aspect-[9/14] w-full bg-muted object-cover"
                controls
                data-testid="work-video"
                playsInline
                poster={video.poster}
                preload="metadata"
              >
                <source src={video.src} type="video/mp4" />
                Your browser does not support this video.
              </video>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
