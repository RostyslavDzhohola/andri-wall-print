"use client";

import { useEffect } from "react";

import { logReservedVisit } from "@/lib/reserved-funnel-log";

type ReservedVisitLoggerProps = {
  sessionId?: string;
};

// Fire-and-forget funnel log on mount. Renders nothing. Posts to
// /api/reserved-visit (see lib/reserved-funnel-log.ts), which forwards to the
// session-keyed Convex mutation leadRequests:logReservedVisit.
export function ReservedVisitLogger({ sessionId }: ReservedVisitLoggerProps) {
  useEffect(() => {
    logReservedVisit(sessionId);
  }, [sessionId]);

  return null;
}
