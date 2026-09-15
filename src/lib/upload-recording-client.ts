// Client-side upload helper shared by every recording flow (solo practice,
// mock test questions, AI conversation turns). Tries the direct-to-R2
// presigned upload first; when the server reports R2 isn't configured,
// falls back to the original multipart-through-the-server upload - same
// two paths src/lib/storage.ts supports server-side, so this is just the
// client half of that same fallback discipline.
export async function uploadRecording(blob: Blob, durationSeconds: number): Promise<string> {
  const mimeType = blob.type || "audio/webm";

  const presignRes = await fetch("/api/practice/recordings/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType }),
  });
  const presignData = await presignRes.json().catch(() => null);
  if (!presignRes.ok) {
    throw new Error(presignData?.error || "Couldn't prepare the upload.");
  }

  if (presignData?.mode === "direct") {
    const putRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    if (!putRes.ok) {
      throw new Error("Uploading the recording failed. Please try again.");
    }

    const completeRes = await fetch("/api/practice/recordings/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordingId: presignData.recordingId,
        key: presignData.key,
        mimeType,
        durationSeconds,
      }),
    });
    const completeData = await completeRes.json().catch(() => null);
    if (!completeRes.ok) {
      throw new Error(completeData?.error || "Couldn't save the recording.");
    }
    return completeData.recordingId as string;
  }

  const form = new FormData();
  form.append("file", blob, "recording.webm");
  form.append("durationSeconds", String(durationSeconds));

  const uploadRes = await fetch("/api/practice/recordings", { method: "POST", body: form });
  const uploadData = await uploadRes.json().catch(() => null);
  if (!uploadRes.ok) {
    throw new Error(uploadData?.error || "Couldn't save the recording.");
  }
  return uploadData.recordingId as string;
}
