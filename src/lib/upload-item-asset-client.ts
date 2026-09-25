// Client half of the P1-D admin asset upload - same shape as
// upload-recording-client.ts: ask /presign, then either PUT straight to R2
// and confirm via /complete (which re-checks the real stored size), or
// fall back to uploading through our own server when R2 isn't configured.
export async function uploadItemGroupAsset(file: File, type: string): Promise<string> {
  const presignRes = await fetch("/api/admin/item-groups/assets/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, mimeType: file.type, sizeBytes: file.size }),
  });
  const presign = await presignRes.json().catch(() => null);
  if (!presignRes.ok) throw new Error(presign?.error ?? "Couldn't prepare the upload.");

  if (presign?.mode === "direct") {
    const put = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("Uploading the file failed. Please try again.");
    const completeRes = await fetch("/api/admin/item-groups/assets/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: presign.key, type, mimeType: file.type }),
    });
    const complete = await completeRes.json().catch(() => null);
    if (!completeRes.ok) throw new Error(complete?.error ?? "Couldn't confirm the upload.");
    return complete.assetKey as string;
  }

  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  const res = await fetch("/api/admin/item-groups/assets", { method: "POST", body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Couldn't upload the file.");
  return data.assetKey as string;
}
