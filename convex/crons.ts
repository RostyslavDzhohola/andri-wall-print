import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("recover stale wall-preview generations", { minutes: 1 }, internal.previewBundles.recoverStaleGenerationJobs, {});

export default crons;
