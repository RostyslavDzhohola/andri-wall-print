import mediaManifest from "@/public/media/wall-print-pro/manifest.json";

type FileDescriptor = {
  path: string;
  bytes: number;
  sha256: string;
};

export type ApprovedImageMedia = {
  original: string;
  kind: "image";
  title: string;
  label: string;
  alt: string;
  sources: {
    avif960: FileDescriptor;
    avif1600: FileDescriptor;
    jpeg1600: FileDescriptor;
  };
};

export type ApprovedVideoMedia = {
  original: string;
  kind: "video";
  title: string;
  label: string;
  alt: string;
  sources: {
    mp4: FileDescriptor;
    poster: FileDescriptor;
  };
};

export type ApprovedMedia = ApprovedImageMedia | ApprovedVideoMedia;

type ApprovedMediaManifest = {
  approvalSource: string;
  homepage: ApprovedMedia[];
  ourWork: ApprovedMedia[];
};

const approvedMedia = mediaManifest as ApprovedMediaManifest;

export const APPROVED_HOMEPAGE_MEDIA = approvedMedia.homepage;
export const APPROVED_OUR_WORK_MEDIA = approvedMedia.ourWork;
export const APPROVED_MEDIA_SOURCE = approvedMedia.approvalSource;
