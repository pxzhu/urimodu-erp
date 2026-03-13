import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";

const port = Number(process.env.DOCS_SERVICE_PORT ?? 4300);
const templatesDir = join(process.cwd(), "apps/docs-service/src/templates");

interface RenderPdfRequest {
  title?: string;
  html: string;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderPdfBuffer(input: RenderPdfRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const title = input.title?.trim() || "Generated Document";
    const plainText = stripHtmlTags(input.html);

    doc.fontSize(18).text(title);
    doc.moveDown(1);
    doc.fontSize(11).text(plainText, {
      lineGap: 3
    });
    doc.end();
  });
}

async function readRequestBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

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

  if (req.method === "POST" && req.url === "/render/pdf") {
    void (async () => {
      try {
        const payload = await readRequestBody<RenderPdfRequest>(req);
        if (!payload?.html || typeof payload.html !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "html is required" }));
          return;
        }

        const pdfBuffer = await renderPdfBuffer(payload);
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Length": String(pdfBuffer.byteLength)
        });
        res.end(pdfBuffer);
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Failed to render PDF",
            error: error instanceof Error ? error.message : "unknown error"
          })
        );
      }
    })();
    return;
  }

  if (req.method === "GET" && req.url === "/templates") {
    void (async () => {
      const files = await readdir(templatesDir).catch(() => []);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          templates: files.filter((file) => file.endsWith(".html"))
        })
      );
    })();
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/templates/")) {
    const requestedFile = decodeURIComponent(req.url.replace("/templates/", ""));
    const filePath = join(templatesDir, requestedFile);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(filePath)
      .on("error", () => {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Template not found" }));
      })
      .pipe(res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[docs-service] listening on port ${port}`);
});
