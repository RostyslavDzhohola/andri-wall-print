import { describe, expect, it } from "vitest";

import {
  GENERATION_MAX_AUTO_ATTEMPTS,
  selectIdempotentBundleReuse
} from "@/convex/previewBundles";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";

const expected = {
  kind: "upload" as const,
  sourceFingerprint: "a".repeat(64),
  byteLength: 1200,
  contentType: "image/png",
  print: DEFAULT_PREVIEW_BUNDLE_PRINT,
  cropMode: "contain" as const
};

const existing = {
  source: {
    kind: "upload",
    sourceFingerprint: expected.sourceFingerprint,
    byteLength: expected.byteLength,
    contentType: expected.contentType
  },
  print: expected.print,
  crop: {
    mode: expected.cropMode
  },
  status: "ready",
  job: {
    attempt: 3
  }
};

describe("homepage upload idempotency reuse", () => {
  it.each([
    {
      name: "no existing bundle",
      candidate: null,
      decision: { action: "insert" }
    },
    {
      name: "wrong source kind",
      candidate: {
        ...existing,
        source: {
          kind: "sample"
        }
      },
      decision: { action: "insert" }
    },
    {
      name: "fingerprint mismatch",
      candidate: {
        ...existing,
        source: {
          ...existing.source,
          sourceFingerprint: "b".repeat(64)
        }
      },
      decision: { action: "insert" }
    },
    {
      name: "failed matching bundle at the retry limit",
      candidate: {
        ...existing,
        status: "failed",
        job: {
          attempt: GENERATION_MAX_AUTO_ATTEMPTS
        }
      },
      decision: { action: "unavailable" }
    },
    {
      name: "rejected matching bundle",
      candidate: {
        ...existing,
        status: "rejected"
      },
      decision: { action: "unavailable" }
    },
    {
      name: "ready matching bundle",
      candidate: existing,
      decision: { action: "reuse" }
    }
  ])("selects $decision.action for $name", ({ candidate, decision }) => {
    expect(selectIdempotentBundleReuse(candidate, expected)).toEqual(decision);
  });

  it("treats every stored identity field as part of the reuse decision", () => {
    const mismatches = [
      { ...existing, source: { ...existing.source, byteLength: expected.byteLength + 1 } },
      { ...existing, source: { ...existing.source, contentType: "image/jpeg" } },
      { ...existing, print: { ...existing.print, aspectRatio: "2:1" } },
      { ...existing, print: { ...existing.print, widthMeters: existing.print.widthMeters + 0.1 } },
      { ...existing, print: { ...existing.print, heightMeters: existing.print.heightMeters + 0.1 } },
      { ...existing, crop: { mode: "cover" } }
    ];

    for (const mismatch of mismatches) {
      expect(selectIdempotentBundleReuse(mismatch, expected)).toEqual({ action: "insert" });
    }
  });

  it("increments a failed bundle with no prior job from attempt zero", () => {
    expect(
      selectIdempotentBundleReuse(
        {
          ...existing,
          status: "failed",
          job: undefined
        },
        expected
      )
    ).toEqual({
      action: "requeue",
      attempt: 1
    });
  });

  it("requeues a failed attempt one as attempt two", () => {
    expect(
      selectIdempotentBundleReuse(
        {
          ...existing,
          status: "failed",
          job: {
            attempt: 1
          }
        },
        expected
      )
    ).toEqual({
      action: "requeue",
      attempt: 2
    });
  });

  it.each(["rejected", "revoked"])("keeps matching %s bundles unavailable", (status) => {
    expect(selectIdempotentBundleReuse({ ...existing, status }, expected)).toEqual({
      action: "unavailable"
    });
  });
});
