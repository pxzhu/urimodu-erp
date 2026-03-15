import { createServer } from "node:http";

import {
  normalizeIngestionPayload,
  resolveEdgeAgentKey,
  toIngressPayload,
  type EdgeAttendanceEvent
} from "./ingestion";

const port = Number(process.env.CONNECTOR_GATEWAY_PORT ?? 4200);
const edgeAgentKey = process.env.EDGE_AGENT_SHARED_KEY ?? "dev-edge-agent-key";
const integrationIngressUrl = process.env.INTEGRATION_INGEST_URL ?? "http://localhost:4000/integrations/attendance/raw";
const integrationIngressKey = process.env.INTEGRATION_INGEST_API_KEY ?? "dev-integration-key";
const defaultCompanyCode = process.env.DEFAULT_COMPANY_CODE ?? "ACME_KR";

function unauthorized(res: import("node:http").ServerResponse) {
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Invalid edge-agent key" }));
}

async function readJsonBody<T>(req: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

async function forwardToApi(event: EdgeAttendanceEvent) {
  const payload = toIngressPayload(event, defaultCompanyCode);

  const response = await fetch(integrationIngressUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-integration-key": integrationIngressKey
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    body: text
  };
}

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "connector-gateway",
        timestamp: new Date().toISOString(),
        integrationIngressUrl
      })
    );
    return;
  }

  if (req.method === "POST" && req.url === "/ingestion/events") {
    void (async () => {
      const requestKey = req.headers["x-edge-agent-key"];
      const headerKey = resolveEdgeAgentKey(req.headers);

      if (headerKey !== edgeAgentKey) {
        unauthorized(res);
        return;
      }

      try {
        const payload = await readJsonBody<EdgeAttendanceEvent | EdgeAttendanceEvent[]>(req);
        const events = normalizeIngestionPayload(payload);

        if (events.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "No events provided" }));
          return;
        }

        let accepted = 0;
        const forwarded: Array<{ index: number; status: number; ok: boolean; body: string }> = [];

        for (const [index, event] of events.entries()) {
          const result = await forwardToApi(event);
          forwarded.push({ index, ...result });
          if (result.ok) {
            accepted += 1;
          }
        }

        const hasFailure = accepted !== events.length;

        res.writeHead(hasFailure ? 502 : 202, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: hasFailure ? "partial_failure" : "accepted",
            total: events.length,
            accepted,
            failed: events.length - accepted,
            forwarded
          })
        );
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Failed to process ingestion request",
            error: error instanceof Error ? error.message : "unknown error"
          })
        );
      }
    })();
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[connector-gateway] listening on port ${port}`);
});
