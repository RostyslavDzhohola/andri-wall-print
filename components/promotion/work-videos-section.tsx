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

export function WorkVideosSection() {
  return (
    <section aria-labelledby="work-videos-heading" className="border-t bg-background px-4 py-10 md:px-6 md:py-12" data-testid="work-videos-section">
      <div className="mx-auto grid max-w-6xl gap-6">
        <h2 className="text-3xl font-semibold leading-tight md:text-5xl" id="work-videos-heading">
          Check out work
        </h2>

        <div className="-mx-4 grid auto-cols-[minmax(16rem,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto lg:overflow-visible lg:px-0 lg:pb-0">
          {workVideos.map((video) => (
            <div className="overflow-hidden rounded-lg border bg-card" data-testid="work-video-card" key={video.id}>
              <video
                className="aspect-[4/5] w-full bg-muted object-cover lg:aspect-[9/14]"
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
