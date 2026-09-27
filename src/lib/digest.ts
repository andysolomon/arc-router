/** SHA-256 of `text` as hex, truncated to `length` chars (default 12); 'n/a' when WebCrypto is unavailable. */
export async function digest(text: string, length = 12): Promise<string> {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, length);
  } catch {
    return 'n/a';
  }
}
