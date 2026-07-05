"use client";

import { useEffect } from "react";

import { logReservedVisit } from "@/lib/reserved-funnel-log";

type ReservedVisitLoggerProps = {
  sessionId?: string;
};

// Fire-and-forget funnel log on mount. Renders nothing. Currently a no-op stub
// (see lib/reserved-funnel-log.ts) awaiting a public session-keyed Convex
// mutation from the funnel-spine task.
export function ReservedVisitLogger({ sessionId }: ReservedVisitLoggerProps) {
  useEffect(() => {
    logReservedVisit(sessionId);
  }, [sessionId]);

  return null;
}
