import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { convert as htmlToText } from "html-to-text";
import PDFDocument from "pdfkit";

const port = Number(process.env.DOCS_SERVICE_PORT ?? 4300);
const templatesDir = resolve(join(process.cwd(), "apps/docs-service/src/templates"));

interface RenderPdfRequest {
  title?: string;
  html: string;
}

function htmlToPlainText(html: string): string {
  return htmlToText(html, {
    selectors: [
      { selector: "script", format: "skip" },
      { selector: "style", format: "skip" }
    ],
    wordwrap: false,
    preserveNewlines: true
  }).trim();
}

function resolveTemplatePathFromRequestPath(requestPath: string): string | null {
  const relativePath = requestPath.replace("/templates/", "");
  if (!relativePath || !relativePath.endsWith(".html") || relativePath.includes("\u0000")) {
    return null;
  }

  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(relativePath);
  } catch {
    return null;
  }

  const resolvedPath = resolve(templatesDir, decodedPath);
  const allowedPrefix = `${templatesDir}${sep}`;
  if (!resolvedPath.startsWith(allowedPrefix)) {
    return null;
  }

  return resolvedPath;
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
    const plainText = htmlToPlainText(input.html);

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
    void (async () => {
      const requestUrl = req.url;
      if (!requestUrl) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid template path" }));
        return;
      }

      const pathname = new URL(requestUrl, "http://localhost").pathname;
      const filePath = resolveTemplatePathFromRequestPath(pathname);
      if (!filePath) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid template path" }));
        return;
      }

      const fileInfo = await stat(filePath).catch(() => null);
      if (!fileInfo || !fileInfo.isFile()) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Template not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(filePath)
        .on("error", () => {
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
          }
          res.end(JSON.stringify({ message: "Failed to read template file" }));
        })
        .pipe(res);
    })();
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(port, () => {
  console.log(`[docs-service] listening on port ${port}`);
});
