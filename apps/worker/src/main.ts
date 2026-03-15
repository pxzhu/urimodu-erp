import { createServer } from "node:http";

import { normalizeAttendanceJob } from "./jobs/attendance-normalize.job";
import { renderPdfJob } from "./jobs/pdf-render.job";
import { importParseJob } from "./jobs/import-parse.job";
import { exportGenerateJob } from "./jobs/export-generate.job";
import { notificationDispatchJob } from "./jobs/notification-dispatch.job";

const port = Number(process.env.WORKER_PORT ?? 4100);
const tickMs = Number(process.env.WORKER_TICK_MS ?? 60_000);

async function runWorkerTick() {
  void normalizeAttendanceJob();
  void renderPdfJob();
  void importParseJob();
  void exportGenerateJob();
  void notificationDispatchJob();
}

void runWorkerTick();
setInterval(() => {
  void runWorkerTick();
}, tickMs);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "worker",
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[worker] listening on port ${port}`);
});
