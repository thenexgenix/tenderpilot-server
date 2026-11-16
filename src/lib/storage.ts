import { del, get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR ?? "./storage",
);

const storageKeyPattern = /^[0-9a-f-]{36}\.pdf$/i;
const blobStorageKeyPattern = /^tenders\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.pdf$/i;

function isBlobStorageConfigured() {
  return Boolean(
    process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN,
  );
}

export function isBlobStorageKey(storageKey: string) {
  return blobStorageKeyPattern.test(storageKey);
}

export function isOwnedBlobStorageKey(storageKey: string, ownerId: string) {
  return (
    isBlobStorageKey(storageKey) && storageKey.startsWith(`tenders/${ownerId}/`)
  );
}

function getStoragePath(storageKey: string) {
  if (!storageKeyPattern.test(storageKey)) {
    throw new Error("Invalid storage key.");
  }

  return path.join(storageRoot, storageKey);
}

export async function savePdfFile(buffer: Buffer) {
  if (isBlobStorageConfigured()) {
    const storageKey = `tenders/legacy/${randomUUID()}.pdf`;
    const blob = await put(storageKey, buffer, {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });

    return blob.pathname;
  }

  await mkdir(storageRoot, { recursive: true });

  const storageKey = `${randomUUID()}.pdf`;
  await writeFile(getStoragePath(storageKey), buffer, {
    flag: "wx",
  });

  return storageKey;
}

export async function deleteStoredFile(storageKey: string) {
  if (isBlobStorageKey(storageKey)) {
    await del(storageKey);
    return;
  }

  try {
    await unlink(getStoragePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function readStoredFile(storageKey: string) {
  if (isBlobStorageKey(storageKey)) {
    const result = await get(storageKey, { access: "private" });

    if (!result || !result.stream) {
      throw new Error("Stored PDF was not found.");
    }

    const reader = result.stream.getReader();
    const chunks: Buffer[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  return readFile(getStoragePath(storageKey));
}
