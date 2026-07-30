import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("recover stale wall-preview generations", { minutes: 1 }, internal.previewBundles.recoverStaleGenerationJobs, {});
crons.interval("recover stale ai concept drafts", { minutes: 1 }, internal.leadRequests.recoverStaleAiConceptDrafts, {});

export default crons;
