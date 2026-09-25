import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ITEM_GROUP_ASSET_MAX_BYTES,
  buildItemGroupAssetKey,
  isValidItemGroupAssetKey,
  isValidItemGroupAssetMimeType,
  validateItemGroupAssetUpload,
} from "@/lib/item-groups";

// Storage, session and audit-log are mocked so these route tests never
// touch the real R2 bucket (the dev .env has real R2 credentials) - every
// branch, including the oversized-delete and success paths, is exercised
// against the mock instead.
const storage = vi.hoisted(() => ({
  isR2Configured: vi.fn(),
  getPresignedItemAssetUploadUrl: vi.fn(),
  itemAssetSize: vi.fn(),
  deleteItemAsset: vi.fn(),
  writeRecording: vi.fn(),
}));
const session = vi.hoisted(() => ({ getServerSession: vi.fn() }));
const audit = vi.hoisted(() => ({ logAdminAction: vi.fn() }));

vi.mock("@/lib/storage", () => storage);
vi.mock("next-auth", () => session);
vi.mock("@/lib/audit-log", () => audit);

const ADMIN = { user: { id: "admin_1", email: "admin@example.test", role: "ADMIN" } };
const CANDIDATE = { user: { id: "user_1", email: "user@example.test", role: "CANDIDATE" } };
const VALID_KEY = "item-groups/3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f.mp3";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("item-group asset validators", () => {
  it("allows only the MIME types listed for each asset-bearing type", () => {
    expect(isValidItemGroupAssetMimeType("AUDIO", "audio/mpeg")).toBe(true);
    expect(isValidItemGroupAssetMimeType("AUDIO", "image/png")).toBe(false);
    expect(isValidItemGroupAssetMimeType("IMAGE", "image/png")).toBe(true);
    expect(isValidItemGroupAssetMimeType("PASSAGE", "text/plain")).toBe(false);
  });

  it("rejects PASSAGE, bad MIME, missing size, and oversized uploads", () => {
    expect(validateItemGroupAssetUpload({ type: "PASSAGE", mimeType: "audio/mpeg", sizeBytes: 100 })).toMatch(/PASSAGE/);
    expect(validateItemGroupAssetUpload({ type: "AUDIO", mimeType: "application/pdf", sizeBytes: 100 })).toMatch(/isn't an allowed file type/);
    expect(validateItemGroupAssetUpload({ type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: 0 })).toMatch(/size/);
    expect(validateItemGroupAssetUpload({ type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: ITEM_GROUP_ASSET_MAX_BYTES + 1 })).toMatch(/too large/);
    expect(validateItemGroupAssetUpload({ type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: ITEM_GROUP_ASSET_MAX_BYTES })).toBeNull();
  });

  it("builds keys under item-groups/ and only accepts that exact shape back", () => {
    const key = buildItemGroupAssetKey("3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f", "audio/mpeg");
    expect(key).toBe(VALID_KEY);
    expect(isValidItemGroupAssetKey(key, "audio/mpeg")).toBe(true);
    expect(isValidItemGroupAssetKey(key, "image/png")).toBe(false); // extension must match the MIME type
    expect(isValidItemGroupAssetKey("recordings/user_1/3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f.mp3", "audio/mpeg")).toBe(false);
    expect(isValidItemGroupAssetKey("item-groups/../../etc/passwd.mp3", "audio/mpeg")).toBe(false);
    expect(isValidItemGroupAssetKey("item-groups/not-a-uuid.mp3", "audio/mpeg")).toBe(false);
  });
});

describe("POST /api/admin/item-groups/assets/presign", () => {
  it("rejects a non-admin", async () => {
    session.getServerSession.mockResolvedValue(CANDIDATE);
    const { POST } = await import("@/app/api/admin/item-groups/assets/presign/route");
    const res = await POST(jsonRequest({ type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: 1000 }));
    expect(res.status).toBe(403);
    expect(storage.getPresignedItemAssetUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects an invalid request before minting anything", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    const { POST } = await import("@/app/api/admin/item-groups/assets/presign/route");
    const res = await POST(jsonRequest({ type: "AUDIO", mimeType: "application/pdf", sizeBytes: 1000 }));
    expect(res.status).toBe(400);
    expect(storage.getPresignedItemAssetUploadUrl).not.toHaveBeenCalled();
  });

  it("tells the client to use the server fallback when R2 isn't configured", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    storage.isR2Configured.mockReturnValue(false);
    const { POST } = await import("@/app/api/admin/item-groups/assets/presign/route");
    const res = await POST(jsonRequest({ type: "AUDIO", mimeType: "audio/mpeg", sizeBytes: 1000 }));
    expect(await res.json()).toEqual({ mode: "server" });
  });

  it("returns a direct upload URL and an item-groups/ key when R2 is configured", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    storage.isR2Configured.mockReturnValue(true);
    storage.getPresignedItemAssetUploadUrl.mockResolvedValue("https://signed.example/put");
    const { POST } = await import("@/app/api/admin/item-groups/assets/presign/route");
    const res = await POST(jsonRequest({ type: "IMAGE", mimeType: "image/png", sizeBytes: 5000 }));
    const body = await res.json();
    expect(body.mode).toBe("direct");
    expect(body.uploadUrl).toBe("https://signed.example/put");
    expect(isValidItemGroupAssetKey(body.key, "image/png")).toBe(true);
  });
});

describe("POST /api/admin/item-groups/assets/complete", () => {
  it("rejects a key that doesn't match the expected item-groups/ shape", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    const { POST } = await import("@/app/api/admin/item-groups/assets/complete/route");
    const res = await POST(jsonRequest({ key: "recordings/someone/else.mp3", type: "AUDIO", mimeType: "audio/mpeg" }));
    expect(res.status).toBe(400);
    expect(storage.itemAssetSize).not.toHaveBeenCalled();
  });

  it("returns 404 when the upload never landed", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    storage.itemAssetSize.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/item-groups/assets/complete/route");
    const res = await POST(jsonRequest({ key: VALID_KEY, type: "AUDIO", mimeType: "audio/mpeg" }));
    expect(res.status).toBe(404);
  });

  it("deletes an upload whose REAL size exceeds the cap, even if the client claimed otherwise at presign", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    storage.itemAssetSize.mockResolvedValue(ITEM_GROUP_ASSET_MAX_BYTES + 1);
    const { POST } = await import("@/app/api/admin/item-groups/assets/complete/route");
    const res = await POST(jsonRequest({ key: VALID_KEY, type: "AUDIO", mimeType: "audio/mpeg" }));
    expect(res.status).toBe(413);
    expect(storage.deleteItemAsset).toHaveBeenCalledWith(VALID_KEY);
    expect(audit.logAdminAction).not.toHaveBeenCalled();
  });

  it("confirms a valid upload and writes an audit-log entry", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    storage.itemAssetSize.mockResolvedValue(12345);
    const { POST } = await import("@/app/api/admin/item-groups/assets/complete/route");
    const res = await POST(jsonRequest({ key: VALID_KEY, type: "AUDIO", mimeType: "audio/mpeg" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ assetKey: VALID_KEY, sizeBytes: 12345 });
    expect(storage.deleteItemAsset).not.toHaveBeenCalled();
    expect(audit.logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ITEM_GROUP_ASSET_UPLOADED", targetId: VALID_KEY }));
  });
});

describe("POST /api/admin/item-groups/assets (server fallback)", () => {
  function formRequest(file: Blob, type: string) {
    const form = new FormData();
    form.set("file", file);
    form.set("type", type);
    return new Request("http://localhost/x", { method: "POST", body: form });
  }

  it("rejects a non-admin", async () => {
    session.getServerSession.mockResolvedValue(CANDIDATE);
    const { POST } = await import("@/app/api/admin/item-groups/assets/route");
    const res = await POST(formRequest(new Blob(["x"], { type: "audio/mpeg" }), "AUDIO"));
    expect(res.status).toBe(403);
    expect(storage.writeRecording).not.toHaveBeenCalled();
  });

  it("rejects a disallowed MIME type without writing anything", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    const { POST } = await import("@/app/api/admin/item-groups/assets/route");
    const res = await POST(formRequest(new Blob(["x"], { type: "application/pdf" }), "AUDIO"));
    expect(res.status).toBe(400);
    expect(storage.writeRecording).not.toHaveBeenCalled();
  });

  it("writes a valid file under item-groups/ and audit-logs it", async () => {
    session.getServerSession.mockResolvedValue(ADMIN);
    const { POST } = await import("@/app/api/admin/item-groups/assets/route");
    const res = await POST(formRequest(new Blob(["fake-png-bytes"], { type: "image/png" }), "IMAGE"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(isValidItemGroupAssetKey(body.assetKey, "image/png")).toBe(true);
    expect(storage.writeRecording).toHaveBeenCalledWith(body.assetKey, expect.any(Buffer), "image/png");
    expect(audit.logAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: "ITEM_GROUP_ASSET_UPLOADED" }));
  });
});
