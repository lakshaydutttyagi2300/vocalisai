import fs from "node:fs";

// Reads real WAV header metadata (no estimation) to get an authoritative
// duration in seconds: dataChunkBytes / byteRate.
export function getWavDurationSeconds(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a valid RIFF/WAVE file");
  }

  let offset = 12;
  let byteRate = null;
  let dataSize = null;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      byteRate = buf.readUInt32LE(chunkStart + 8);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (byteRate === null || dataSize === null) {
    throw new Error("Could not locate fmt/data chunks in WAV file");
  }

  return dataSize / byteRate;
}
