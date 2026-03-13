import type { Readable } from "node:stream";

export interface PutObjectInput {
  key: string;
  contentType: string;
  body: Buffer;
  metadata?: Record<string, string>;
}

export interface StoredObject {
  key: string;
  stream: Readable;
}

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<{ key: string }>;
  getObject(key: string): Promise<StoredObject>;
}
