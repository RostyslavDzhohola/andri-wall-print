# Clean in-page project video without self-hosting

**Research date:** 2026-07-14
**Scope:** Wall Print Pro's five Instagram-linked project candidates
**Decision:** A clean player is feasible, but not by wrapping Instagram. Use seller-approved original files uploaded directly to a managed video service, then play that service's HLS stream through an open-source player. Keep each canonical Instagram URL and attribution in the project catalog.

## Short answer

There are good open-source player libraries, but none of them supplies or hosts the video and none can remove the controls, attribution, or outbound behavior inside Instagram's cross-origin embed.

The best current fit is:

1. The seller supplies the original project files and confirms website-use permission.
2. Upload those files directly to **Mux Video** (best free starting point) or **Cloudflare Stream** (best predictable paid option). The files do not pass through or live in this repository or the Next.js server.
3. Use **Media Chrome** around Mux's React video element for the clean player controls and, if swipe behavior warrants a library, **Embla Carousel** for previous/next touch navigation. For only five items and one viewport, plain React index state may be simpler than adding Embla.
4. Store the managed playback ID/HLS URL alongside, never instead of, `canonicalUrl` and Instagram attribution in `lib/social-proof.ts`.

This changes who operates the video infrastructure; it does **not** remove the permission gate. No service or library makes it permissible to scrape, download, copy, or republish Instagram media that Wall Print Pro does not own or have permission to use.

## Experimental direct-API trial (implemented, not launch-approved)

After this research, the seller requested a reversible trial of the narrower Instagram API route. The repository now has an opt-in clean carousel that requests current `media_url` values server-side from Wall Print Pro's authorized Professional account. It never scrapes a public post, downloads or rehosts a file, exposes the access token, or enables the direct player for the third-party `iam_sushi` post. If the API is absent, slow, invalid, or returns no catalog match, the current official embeds remain the public fallback.

The trial requires all three server-only environment variables:

```text
WALL_PRINT_PRO_INSTAGRAM_USER_ID=<authorized Professional account ID>
WALL_PRINT_PRO_INSTAGRAM_ACCESS_TOKEN=<server-side user access token>
WALL_PRINT_PRO_INSTAGRAM_GRAPH_VERSION=<version enabled for the Meta app, for example v26.0>
```

The Graph version must be confirmed in the seller's Meta app dashboard rather than copied blindly from this example. The API route refreshes the returned media URLs and exposes only matched project media plus the existing catalog context to the browser. This is enough to evaluate the clean player, but it does not overturn the production recommendation below or supply rights for media the seller does not control.

## Why Instagram wrappers do not solve it

Instagram's supported website presentation is an official embed. Instagram says an embed shares the content **with the username and a link to the Instagram profile**, and it depends on a public account whose Embeds setting is enabled ([Instagram Help Centre](https://www.facebook.com/help/instagram/620154495870484)). Meta's oEmbed endpoint likewise returns embed HTML rather than a durable, unbranded video source ([Meta oEmbed Read reference](https://developers.facebook.com/docs/features-reference/oembed-read)).

React Instagram components and “feed” libraries are therefore wrappers around the same Instagram embed/oEmbed output. They can size or sequence the outer cards, but they cannot style or remove UI inside the Instagram iframe. A carousel around five Instagram iframes would still have Instagram chrome and outbound actions in every slide.

YouTube or Vimeo providers in Plyr/Vidstack have the same category of limitation: the open-source library controls an iframe provider through that provider's API, but provider branding and allowed behavior remain provider-controlled. Media Chrome explicitly notes that social players allow only limited customization ([Media Chrome README](https://github.com/muxinc/media-chrome#why)).

## Could the Instagram API provide a raw source?

Only in a narrow, fragile case—and it is not the recommended delivery architecture.

Meta's current Instagram API is for Instagram **Professional** accounts (Business or Creator). With Facebook Login it cannot access consumer accounts, and Meta describes media access as managing the professional account's own presence ([Meta's official Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)). Instagram Login requires an app, access token, and `instagram_business_basic` permission ([Meta's official Instagram Login collection](https://www.postman.com/meta/instagram/folder/23987686-98bfade9-3736-4738-8b4a-f56d6534f6de)). The Instagram Media reference exposes fields including `media_url` and `permalink` ([Instagram Media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media)).

Implications for this catalog:

- Posts owned by `wall_printpro` might be queryable only after the seller authorizes a Meta app and the account meets Professional-account requirements.
- `first-client-story`, owned by `iam_sushi`, is not Wall Print Pro-owned media. Wall Print Pro's token cannot turn it into an owned source; that account owner would need to authorize the appropriate access and separately grant republication rights.
- oEmbed is not an alternative raw-video endpoint. It is for rendering the official Instagram presentation.
- `media_url` is an authenticated API field, not a documented permanent public playback ID or a managed streaming contract. Treating the returned Instagram CDN URL as a hard-coded `<video>` source would require token handling and URL refresh logic, and would still be the temporary-CDN hotlinking the approved project constraints prohibit. This is an engineering inference from the API's ownership/authentication model and the absence of a stable playback guarantee—not a claim that the field can never play in a browser.

**Conclusion:** Do not build production playback on Instagram `media_url`. Even for seller-owned posts, use the original seller file and a video-delivery service after permission is recorded.

## Open-source player comparison

| Library | What it solves | Fit here | What it does not solve |
| --- | --- | --- | --- |
| **Media Chrome** (MIT) | Small, composable Web Components and React wrappers for fully custom controls around `<video>`, Mux Video, HLS.js, and other media elements | **Recommended.** It lets this React 19 app render only the controls we want while Mux or Cloudflare handles delivery | Controls only the media element/player it is attached to; it is not a host or Instagram extractor ([source](https://github.com/muxinc/media-chrome)) |
| **Vidstack** (MIT) | React components/hooks, custom or prebuilt accessible layouts, HLS support, keyboard/media state | Strong player design, but not the first choice for this repo today: the currently published `@vidstack/react` package declares React 18 peer compatibility while this app uses React 19 | Does not host media or remove UI from an Instagram iframe ([source](https://github.com/vidstack/player)) |
| **Mux Player** (MIT components) | Ready-made player built on Media Chrome for a Mux playback ID; React package available | Lowest integration effort if Mux is selected. Free-plan Mux Player shows a small Mux badge; verify appearance before choosing it for a strict zero-platform-chrome requirement | Tied most naturally to Mux; free-plan badge may conflict with the desired presentation ([source](https://github.com/muxinc/elements/tree/main/packages/mux-player), [free-plan note](https://www.mux.com/blog/free-plan)) |
| **Video.js** (Apache-2.0) | Mature full player framework with built-in HLS/DASH and a large plugin ecosystem | Capable, but heavier than this five-video portfolio needs | No hosting; more framework and CSS surface than needed ([source](https://github.com/videojs/video.js)) |
| **Plyr** (MIT) | Clean, lightweight HTML5 controls and keyboard support; can be integrated with HLS.js/Shaka/Dash.js | Fine for plain MP4; less attractive than Vidstack for a new React/HLS implementation | Streaming requires another library/integration; YouTube/Vimeo remain embeds; no Instagram provider ([source](https://github.com/sampotts/plyr)) |
| **Embla Carousel** (MIT, optional) | Precise touch swiping, React wrapper, and previous/next API | Good if real swipe physics are required. Its docs recommend controls outside the viewport, matching this design | Does not play or host video ([source](https://www.embla-carousel.com/docs/v8/get-started/react), [repository](https://github.com/davidjerleke/embla-carousel)) |

The player and carousel are separate concerns. Media Chrome should own playback controls; a small React controller or Embla should own project selection. On selection change, pause the old source, load the new source/poster/title, and move focus/announce the new project without autoplay. Reduced-motion should disable carousel animation rather than disable playback.

## Managed hosting comparison

These are managed services, not open-source hosting projects. Their value is that Wall Print Pro does not operate storage, transcoding, adaptive streaming, or a video CDN.

| Service | Current relevant offer | Player freedom | Fit for Wall Print Pro |
| --- | --- | --- | --- |
| **Mux Video** | Free plan: up to **10 stored on-demand videos** and **100,000 delivery minutes/month**. Direct Upload URLs send browser uploads straight to Mux. Every asset receives a playback ID and standard HLS URL | Any HLS player can use `https://stream.mux.com/{PLAYBACK_ID}.m3u8`; Mux Player is optional ([playback docs](https://www.mux.com/docs/guides/play-your-videos), [direct uploads](https://www.mux.com/docs/guides/mux-uploader)) | **Best first choice.** Five catalog candidates fit under the current ten-video free limit. The free-plan badge applies to Mux Player; Media Chrome around the raw Mux video/HLS element keeps the website controls site-owned. Pricing can change, so recheck at activation ([pricing](https://www.mux.com/pricing)) |
| **Cloudflare Stream** | Uploads, stores, encodes, and delivers adaptive H.264 video. Storage is **$5 per 1,000 stored minutes**; delivery is **$1 per 1,000 delivered minutes**. Direct Creator Uploads send files straight to Stream | Exposes HLS and DASH manifests for any compatible player ([own-player docs](https://developers.cloudflare.com/stream/viewing-videos/using-own-player/), [direct uploads](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/)) | **Best paid/predictable choice**, especially if the seller already uses Cloudflare. No need to revive the old R2 social copies. Stream is a distinct video product with transcoding and adaptive delivery ([overview](https://developers.cloudflare.com/stream/), [pricing](https://developers.cloudflare.com/stream/pricing/)) |
| **Cloudinary** | Managed uploads, transformation, optimization, storage, and delivery. Free plan currently includes 25 monthly credits shared by transformations/storage/bandwidth | Can use Cloudinary's player or deliver MP4/HLS to another player; direct browser uploads are supported ([upload docs](https://cloudinary.com/documentation/upload_images), [player docs](https://cloudinary.com/documentation/cloudinary_video_player)) | Good when automatic crop/format/poster transformations matter more than simple streaming. Credit accounting is less intuitive for this small portfolio ([billing](https://cloudinary.com/documentation/billing_and_plans)) |
| **Vercel Blob** | Object storage/CDN for files including video; charges by GB storage, operations, transfer, and edge usage | A normal `<video>`/player can request a public MP4 | Not a full video platform: the cited product docs offer file storage/delivery, not managed transcoding or adaptive HLS generation. It reduces server disk use but leaves encoding/poster/quality work to us, so it does not fully meet “do not host videos myself” ([overview](https://vercel.com/docs/vercel-blob), [pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)) |
| **Cloudflare R2** | Object storage, previously used by this repository | Can serve MP4 to an HTML5 player | Same object-storage tradeoff as Blob, and the existing R2 clips lack the required ownership/project mapping. Do not reuse them merely because the bucket exists. |

## Recommended architecture

```text
Seller-owned original file + written project permission
                    |
                    v
      direct upload to Mux Video (or Cloudflare Stream)
                    |
          managed encode + HLS + CDN
                    |
                    v
  Media Chrome + Mux Video in the Wall Print Pro carousel
       play/pause | previous/next | touch | keyboard
                    |
                    v
 Catalog record keeps playback ID + canonical Instagram URL + attribution
```

### Suggested catalog fields after the permission gate clears

```ts
{
  id: "label808-studio",
  canonicalUrl: "https://www.instagram.com/wall_printpro/p/DY0fWs8jcoi/",
  attribution: { platform: "instagram", account: "wall_printpro" },
  ownedPlayback: {
    provider: "mux", // or "cloudflare-stream"
    playbackId: "provider-issued-stable-id",
    posterUrl: "provider-issued-or-approved-poster",
    permissionRecord: "seller approval reference"
  }
}
```

Do not put provider API secrets in this public data. Playback IDs may be public; upload creation and asset administration remain server-side. Managed services also support signed playback if access later needs restriction, though these public portfolio videos probably do not need it ([Mux playback policies](https://www.mux.com/docs/core/mux-fundamentals), [Cloudflare signed URLs](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)).

## Launch gates and next decision

Before implementation, obtain for each selected candidate:

- the original MP4/MOV from the seller or rights holder—not a file downloaded from Instagram;
- written permission to host/stream, transcode, crop, generate a poster/captions, and present the work on Wall Print Pro's website;
- confirmation covering visible people, venue/customer, artwork, and audio/music;
- an explicit mapping from original filename to catalog ID and approved project title;
- separate rights-holder approval for the `iam_sushi` post if it remains in scope.

Once those exist, start with **Mux Video + Media Chrome** for the fastest, lowest-cost proof. Use Mux's raw HLS/video element instead of Mux Player when zero provider UI is required. If preferring the existing Cloudflare account matters more than the free tier, use **Cloudflare Stream + Media Chrome**. Keep the official Instagram embeds live until the managed assets and permissions are complete and rendered QA passes.
