import { createServer } from "node:http";

const samples = [
  {
    id: "g-community-one",
    title: "Community AI concept",
    description: "An AI-generated wall print concept shared anonymously with Wall Print Pro.",
    sourceKind: "community_ai",
    print: { aspectRatio: "6:5", widthMeters: 1.524, heightMeters: 1.27, label: "5 ft x 4.2 ft" },
    assets: {
      poster: "/artworks/chicago-final-1.jpg",
      glb: "/api/ar/chicago-final-1.glb",
      usdz: "/api/ar/chicago-final-1.usdz"
    }
  },
  {
    id: "g-community-two",
    title: "Community AI concept",
    description: "An AI-generated wall print concept shared anonymously with Wall Print Pro.",
    sourceKind: "community_ai",
    print: { aspectRatio: "3:5", widthMeters: 0.9144, heightMeters: 1.524, label: "3 ft x 5 ft" },
    assets: {
      poster: "/artworks/chicago-final-2.jpg",
      glb: "/api/ar/chicago-final-2.glb",
      usdz: "/api/ar/chicago-final-2.usdz"
    }
  }
];

const server = createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/api/query") {
    response.writeHead(404).end();
    return;
  }

  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    let body;

    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      response.writeHead(400).end();
      return;
    }

    let value = null;

    if (body.path === "gallery:listPublished") {
      value = body.args?.cursor
        ? { page: [samples[1]], continueCursor: null, isDone: true }
        : { page: [samples[0]], continueCursor: "community-page-2", isDone: false };
    } else if (body.path === "gallery:getPublishedBySlug") {
      value = samples.find((sample) => sample.id === body.args?.slug) ?? null;
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "success", value }));
  });
});

server.listen(3110, "127.0.0.1");
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));
