import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg",
  "video/mp4": "mp4", "audio/mpeg": "mp3", "text/html": "html",
};

/** Saves bytes and returns the public URL path (served by /files/[name]). */
export function saveFile(data: Buffer | string, mime: string): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${EXT[mime] ?? "bin"}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), data);
  return `/files/${name}`;
}

export function absoluteUrl(p: string) {
  if (/^https?:\/\//.test(p)) return p;
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "") + p;
}

export function readUpload(name: string): { data: Buffer; mime: string } | null {
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(name)) return null;
  const file = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return null;
  const ext = name.split(".").pop()!;
  const mime = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
  return { data: fs.readFileSync(file), mime };
}
