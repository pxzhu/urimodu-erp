import { BadGatewayException, Injectable } from "@nestjs/common";

interface RenderPdfInput {
  title: string;
  html: string;
}

@Injectable()
export class DocumentRenderService {
  private readonly baseUrl = process.env.DOCS_SERVICE_BASE_URL ?? "http://localhost:4300";

  async renderPdf(input: RenderPdfInput): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/render/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }).catch((error) => {
      throw new BadGatewayException(
        `Docs service is unavailable: ${error instanceof Error ? error.message : "unknown error"}`
      );
    });

    if (!response.ok) {
      throw new BadGatewayException(`Docs service render failed (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
