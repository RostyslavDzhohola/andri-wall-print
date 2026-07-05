export function logReservedVisit(sessionId?: string): void {
  if (!sessionId) {
    return;
  }

  void fetch("/api/reserved-visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId }),
    keepalive: true
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Reserved visit logging failed with HTTP ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Reserved visit logging failed", error);
    });
}
