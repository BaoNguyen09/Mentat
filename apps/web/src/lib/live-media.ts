export function resolveWebSocketUrl(path: string) {
  if (path.startsWith("ws://") || path.startsWith("wss://")) {
    return path;
  }

  const url = new URL(path, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

export function float32ToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);

  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

export function pcm16ToBase64(input: Int16Array) {
  return bytesToBase64(new Uint8Array(input.buffer));
}

export function base64ToFloat32(base64: string) {
  const bytes = base64ToBytes(base64);
  const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const output = new Float32Array(pcm.length);

  for (let index = 0; index < pcm.length; index += 1) {
    output[index] = pcm[index] / 0x8000;
  }

  return output;
}

export function readSampleRate(mimeType: string, fallbackRate: number) {
  const match = mimeType.match(/rate=(\d+)/i);
  return match ? Number(match[1]) : fallbackRate;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
