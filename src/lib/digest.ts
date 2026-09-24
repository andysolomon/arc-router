/** SHA-256 of `text`, first 12 hex chars; 'n/a' when WebCrypto is unavailable. */
export async function digest(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 12);
  } catch {
    return 'n/a';
  }
}
