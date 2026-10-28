import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(
  process.cwd(),
  process.env.STORAGE_DIR ?? "./storage",
);

const storageKeyPattern = /^[0-9a-f-]{36}\.pdf$/i;

function getStoragePath(storageKey: string) {
  if (!storageKeyPattern.test(storageKey)) {
    throw new Error("Invalid storage key.");
  }

  return path.join(storageRoot, storageKey);
}

export async function savePdfFile(buffer: Buffer) {
  await mkdir(storageRoot, { recursive: true });

  const storageKey = `${randomUUID()}.pdf`;
  await writeFile(getStoragePath(storageKey), buffer, {
    flag: "wx",
  });

  return storageKey;
}

export async function deleteStoredFile(storageKey: string) {
  try {
    await unlink(getStoragePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
