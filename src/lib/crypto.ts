export function base64FromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function sha256Base64(message: string) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64FromArrayBuffer(hash);
}

function pemToArrayBuffer(pem: string) {
  // strip header/footer
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\n/g, "")
    .trim();
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptWithPublicKey(pem: string, message: string) {
  try {
    const keyData = pemToArrayBuffer(pem);
    const key = await crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key,
      enc.encode(message)
    );
    return base64FromArrayBuffer(encrypted);
  } catch (e) {
    console.warn("Public key encryption failed", e);
    throw e;
  }
}
