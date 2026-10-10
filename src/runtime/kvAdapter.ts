import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface KVEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * In-memory KVNamespace-compatible adapter with TTL support.
 * Used for rate limiting and ephemeral state in Docker / Node / Bun self-hosted deployments.
 */
export function createMemoryKVAdapter(): KVNamespace {
  const store = new Map<string, KVEntry>();

  const adapter = {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(
      key: string,
      value: string | ArrayBuffer | ArrayBufferView,
      options?: { expirationTtl?: number; expiration?: number }
    ): Promise<void> {
      let strVal: string;
      if (typeof value === 'string') {
        strVal = value;
      } else if (value instanceof ArrayBuffer) {
        strVal = new TextDecoder().decode(value);
      } else {
        strVal = new TextDecoder().decode(
          new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        );
      }

      let expiresAt: number | null = null;
      if (options?.expirationTtl && options.expirationTtl > 0) {
        expiresAt = Date.now() + options.expirationTtl * 1000;
      } else if (options?.expiration && options.expiration > 0) {
        expiresAt = options.expiration * 1000;
      }

      store.set(key, { value: strVal, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(): Promise<{ keys: Array<{ name: string }>; list_complete: boolean }> {
      const now = Date.now();
      const keys: Array<{ name: string }> = [];
      for (const [k, v] of store.entries()) {
        if (v.expiresAt !== null && now > v.expiresAt) {
          store.delete(k);
        } else {
          keys.push({ name: k });
        }
      }
      return { keys, list_complete: true };
    },
  };

  return adapter as unknown as KVNamespace;
}

/**
 * Local disk R2Bucket-compatible adapter for Docker / self-hosted deployments.
 * Stores uploaded files in `uploadDir` (e.g. `./data/uploads`).
 */
export function createLocalR2Adapter(uploadDir: string): R2Bucket {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  const safePath = (key: string): string => {
    const sanitized = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    return join(uploadDir, sanitized);
  };

  const adapter = {
    async put(
      key: string,
      value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
      options?: { httpMetadata?: { contentType?: string } }
    ) {
      const filePath = safePath(key);
      const metaPath = `${filePath}.meta.json`;
      let bytes: Uint8Array;

      if (value === null) {
        bytes = new Uint8Array(0);
      } else if (typeof value === 'string') {
        bytes = new TextEncoder().encode(value);
      } else if (value instanceof ArrayBuffer) {
        bytes = new Uint8Array(value);
      } else if (ArrayBuffer.isView(value)) {
        bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      } else if (value instanceof Blob) {
        bytes = new Uint8Array(await value.arrayBuffer());
      } else {
        const res = new Response(value);
        bytes = new Uint8Array(await res.arrayBuffer());
      }

      writeFileSync(filePath, bytes);
      writeFileSync(
        metaPath,
        JSON.stringify({
          contentType: options?.httpMetadata?.contentType || 'application/octet-stream',
          size: bytes.byteLength,
          uploadedAt: new Date().toISOString(),
        })
      );

      return { key, size: bytes.byteLength };
    },
    async get(key: string) {
      const filePath = safePath(key);
      if (!existsSync(filePath)) return null;
      const metaPath = `${filePath}.meta.json`;
      let contentType = 'application/octet-stream';
      if (existsSync(metaPath)) {
        try {
          const parsed = JSON.parse(readFileSync(metaPath, 'utf-8')) as { contentType?: string };
          if (parsed.contentType) contentType = parsed.contentType;
        } catch {
          // ignore
        }
      }
      const buffer = readFileSync(filePath);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer));
          controller.close();
        },
      });
      return {
        key,
        body: stream,
        httpMetadata: { contentType },
      };
    },
    async delete(key: string) {
      const filePath = safePath(key);
      const metaPath = `${filePath}.meta.json`;
      if (existsSync(filePath)) unlinkSync(filePath);
      if (existsSync(metaPath)) unlinkSync(metaPath);
    },
  };

  return adapter as unknown as R2Bucket;
}
