import { describe, expect, it } from "vitest";

import { metadata as galleryMetadata } from "@/app/gallery/page";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as requestMetadata } from "@/app/request/page";
import { metadata as reservedMetadata } from "@/app/reserved/page";
import { metadata as workMetadata } from "@/app/work/page";

const TITLE_TEMPLATE = "%s | Wall Print Pro";

function renderedTitle(title: string) {
  return TITLE_TEMPLATE.replace("%s", title);
}

describe("page metadata", () => {
  it("sets self-referential canonicals on public pages instead of inheriting the homepage", () => {
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(galleryMetadata.alternates?.canonical).toBe("/gallery");
    expect(requestMetadata.alternates?.canonical).toBe("/request");
    expect(String(workMetadata.alternates?.canonical)).toBe("https://www.thewallprintpro.com/work");
    expect(String(reservedMetadata.alternates?.canonical)).toBe("https://www.thewallprintpro.com/reserved");
  });

  it("adds the brand suffix once through the root title template", () => {
    for (const metadata of [galleryMetadata, requestMetadata, workMetadata, reservedMetadata]) {
      const title = metadata.title as string;

      expect(title).not.toContain("| Wall Print Pro");
      expect(renderedTitle(title)).toMatch(/\| Wall Print Pro$/);
      expect(renderedTitle(title)).not.toContain("| Wall Print Pro | Wall Print Pro");
    }
  });

  it("describes the Chicago estimate request page", () => {
    expect(requestMetadata.description).toContain("free estimate");
    expect(requestMetadata.description).toContain("Chicago");
  });
});
