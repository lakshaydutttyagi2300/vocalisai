import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UPLOADS_ROOT } from "@/lib/uploads";

// Same "key" naming (e.g. "recordings/<userId>/<id>.webm") works as both a
// relative filesystem path and an S3/R2 object key, so PracticeRecording.filePath
// never needed to change shape when this moved off local disk - only where
// the bytes actually live did.
//
// Local disk remains the fallback when R2 isn't configured (no R2_* env
// vars set) - fine for local dev, but local disk does NOT persist across
// deploys on Vercel, so production MUST have R2 configured before real
// recordings are at stake.

function r2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME;

// The client only needs to know whether to ask for a direct-upload URL or
// fall back to uploading through our own server (src/app/api/practice/recordings/presign).
export function isR2Configured(): boolean {
  return r2Client() !== null && !!BUCKET;
}

// A short-lived URL the browser can PUT the recording straight to, so the
// audio bytes never pass through our own serverless function - avoids the
// request body size limits a platform like Vercel imposes on Functions,
// and saves the bandwidth of relaying every recording through our server.
export async function getPresignedUploadUrl(key: string, mimeType: string): Promise<string> {
  const client = r2Client();
  if (!client || !BUCKET) throw new Error("R2 is not configured.");

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

// P1-D: same direct-to-R2 presigned-PUT pattern as getPresignedUploadUrl
// above, kept as its own function (rather than just calling that one)
// because item-group assets have their own key prefix
// ("item-groups/<id-or-pending>/...", never "recordings/..."). A
// presigned S3/R2 PUT has no reliable way to cap the upload size up front
// (that needs a POST policy, a materially different flow) - the real size
// cap (item-groups.ts's ITEM_GROUP_ASSET_MAX_BYTES) is enforced AFTER the
// upload instead, by itemAssetSize() below, checked by the /complete
// route before the ItemGroup row is created or updated.
export async function getPresignedItemAssetUploadUrl(key: string, mimeType: string): Promise<string> {
  const client = r2Client();
  if (!client || !BUCKET) throw new Error("R2 is not configured.");

  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

// Confirms an item-group asset actually landed in R2 and reports its real
// size - same "never trust the client's word alone" discipline as
// recordingExists(), extended to size since an oversized upload must be
// caught here (the presigned PUT itself can't reject it - see above).
// Returns null if the object doesn't exist.
export async function itemAssetSize(key: string): Promise<number | null> {
  const client = r2Client();
  if (!client || !BUCKET) return null;

  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return result.ContentLength ?? null;
  } catch {
    return null;
  }
}

// Confirms a direct-to-R2 upload actually landed before the caller trusts
// it and creates a PracticeRecording row - never take the client's word
// alone that a presigned PUT succeeded (src/app/api/practice/recordings/complete).
export async function recordingExists(key: string): Promise<boolean> {
  const client = r2Client();
  if (!client || !BUCKET) return false;

  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Removes an item-group asset that failed a post-upload check (currently
// only the size cap - see the /complete route) - the object already
// landed in R2 by the time that check runs, so this cleans it up rather
// than leaving an orphaned, oversized file billed to the bucket forever.
// Never used on a PracticeRecording; recordings have no equivalent
// post-upload rejection path today.
export async function deleteItemAsset(key: string): Promise<void> {
  const client = r2Client();
  if (!client || !BUCKET) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("Failed to delete rejected item-group asset:", err);
  }
}

export async function writeRecording(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  const client = r2Client();
  if (client && BUCKET) {
    await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
    return;
  }

  const absolutePath = path.join(UPLOADS_ROOT, key);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

// Throws if the object/file doesn't exist - callers already handle that
// (a missing recording is reported as 404, never fabricated).
export async function readRecording(key: string): Promise<Buffer> {
  const client = r2Client();
  if (client && BUCKET) {
    const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty object body");
    return Buffer.from(bytes);
  }

  const absolutePath = path.join(UPLOADS_ROOT, key);
  return fs.readFile(absolutePath);
}
