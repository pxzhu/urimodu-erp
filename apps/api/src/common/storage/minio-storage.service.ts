import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { Client } from "minio";

import type { ObjectStorage, PutObjectInput, StoredObject } from "./storage.interface";

@Injectable()
export class MinioStorageService implements ObjectStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private bucketReady: Promise<void> | null = null;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const port = Number(process.env.MINIO_PORT ?? 9000);
    const accessKey = process.env.MINIO_ACCESS_KEY ?? "minio";
    const secretKey = process.env.MINIO_SECRET_KEY ?? "minio123";
    const useSSL = (process.env.MINIO_USE_SSL ?? "false") === "true";

    this.bucket = process.env.MINIO_BUCKET ?? "erp-files";

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey
    });
  }

  private async ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const exists = await this.client.bucketExists(this.bucket);
        if (!exists) {
          await this.client.makeBucket(this.bucket);
        }
      })();
    }

    try {
      await this.bucketReady;
    } catch (error) {
      this.bucketReady = null;
      throw new ServiceUnavailableException(
        `Object storage bucket is unavailable: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  async putObject(input: PutObjectInput): Promise<{ key: string }> {
    await this.ensureBucket();

    await this.client.putObject(this.bucket, input.key, input.body, input.body.byteLength, {
      "Content-Type": input.contentType,
      ...input.metadata
    });

    return { key: input.key };
  }

  async getObject(key: string): Promise<StoredObject> {
    await this.ensureBucket();

    const stream = await this.client.getObject(this.bucket, key);
    return { key, stream };
  }
}
