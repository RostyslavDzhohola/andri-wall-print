import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { assetMetaValidator, assetStorageIdsValidator, printValidator } from "./validators";

export default defineSchema({
  arPreviews: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    print: printValidator,
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator,
    sourcePdfName: v.optional(v.string()),
    status: v.union(v.literal("ready"), v.literal("unavailable")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_slug", ["slug"])
});
