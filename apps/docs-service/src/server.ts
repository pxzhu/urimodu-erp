import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { convert as htmlToText } from "html-to-text";
import PDFDocument from "pdfkit";

export interface RenderPdfRequest {
  title?: string;
  html: string;
}

export interface DocsServiceServerOptions {
  templatesDir?: string;
}

function getTemplatesDir(input?: string): string {
  return input ? resolve(input) : resolve(join(__dirname, "templates"));
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

function resolveTemplatePathFromRequestPath(
  requestPath: string,
  templatesDir: string
): string | null {
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
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    doc.on("data", (chunk: Buffer | Uint8Array) => chunks.push(Buffer.from(chunk)));
    doc.on("error", rejectPromise);
    doc.on("end", () => resolvePromise(Buffer.concat(chunks)));

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

async function readRequestBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

export function createDocsServiceServer(options: DocsServiceServerOptions = {}): Server {
  const templatesDir = getTemplatesDir(options.templatesDir);

  return createServer((req, res) => {
    if (req.url === "/health") {
      writeJson(res, 200, {
        status: "ok",
        service: "docs-service",
        timestamp: new Date().toISOString(),
        adapters: ["hwpx", "hwp-fallback"]
      });
      return;
    }

    if (req.method === "POST" && req.url === "/render/pdf") {
      void (async () => {
        try {
          const payload = await readRequestBody<RenderPdfRequest>(req);
          if (!payload?.html || typeof payload.html !== "string") {
            writeJson(res, 400, { message: "html is required" });
            return;
          }

          const pdfBuffer = await renderPdfBuffer(payload);
          res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Length": String(pdfBuffer.byteLength)
          });
          res.end(pdfBuffer);
        } catch (error) {
          writeJson(res, 500, {
            message: "Failed to render PDF",
            error: error instanceof Error ? error.message : "unknown error"
          });
        }
      })();
      return;
    }

    if (req.method === "GET" && req.url === "/templates") {
      void (async () => {
        const files = await readdir(templatesDir).catch(() => []);
        writeJson(res, 200, {
          templates: files.filter((file) => file.endsWith(".html"))
        });
      })();
      return;
    }

    if (req.method === "GET" && req.url?.startsWith("/templates/")) {
      void (async () => {
        const requestUrl = req.url;
        if (!requestUrl) {
          writeJson(res, 400, { message: "Invalid template path" });
          return;
        }

        const pathname = new URL(requestUrl, "http://localhost").pathname;
        const filePath = resolveTemplatePathFromRequestPath(pathname, templatesDir);
        if (!filePath) {
          writeJson(res, 400, { message: "Invalid template path" });
          return;
        }

        const fileInfo = await stat(filePath).catch(() => null);
        if (!fileInfo || !fileInfo.isFile()) {
          writeJson(res, 404, { message: "Template not found" });
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

    writeJson(res, 404, { message: "Not found" });
  });
}
