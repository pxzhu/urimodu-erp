import { createServer } from "node:http";

const port = Number(process.env.CONNECTOR_GATEWAY_PORT ?? 4200);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "connector-gateway",
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  if (req.method === "POST" && req.url === "/ingestion/events") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "accepted",
          message: "Event received",
          receivedBytes: body.length
        })
      );
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[connector-gateway] listening on port ${port}`);
});
