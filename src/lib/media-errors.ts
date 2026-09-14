// Maps real getUserMedia() DOMException names to specific, honest messages.
// Never a generic "something went wrong" - the failure mode actually matters
// (denied vs no device vs device busy) and changes what the candidate should do.
export function describeMediaError(err: unknown, device: "camera" | "microphone"): string {
  const name = err instanceof DOMException ? err.name : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return `Permission denied. Please allow ${device} access in your browser's site settings, then try again.`;
    case "NotFoundError":
    case "DevicesNotFoundError":
      return `No ${device} was found on this device.`;
    case "NotReadableError":
    case "TrackStartError":
      return `Your ${device} appears to be in use by another application. Close other apps using it and try again.`;
    case "OverconstrainedError":
      return `No ${device} on this device matches the required settings.`;
    case "SecurityError":
      return `${device === "camera" ? "Camera" : "Microphone"} access is blocked on this page (it may need to be loaded over HTTPS).`;
    default:
      return `Couldn't access your ${device}. Please check your device and browser permissions and try again.`;
  }
}
