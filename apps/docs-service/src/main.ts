import { createServer } from "node:http";

const port = Number(process.env.DOCS_SERVICE_PORT ?? 4300);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "docs-service",
        timestamp: new Date().toISOString(),
        adapters: ["hwpx", "hwp-fallback"]
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[docs-service] listening on port ${port}`);
});
