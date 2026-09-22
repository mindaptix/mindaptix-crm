import "server-only";

/** Bounded responses, fixed hosts at each call site, and no redirects or credential forwarding. */
export async function fetchJson(url: string, init: RequestInit, maxBytes = 2_000_000, timeout = 20_000): Promise<unknown> {
  const response = await fetch(url, { ...init, redirect: "error", cache: "no-store", signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout) });
  if (!response.ok) {
    if ([401, 403, 404].includes(response.status)) throw new Error(`Service access failed (${response.status}). Check API credentials and repository permissions.`);
    if (response.status === 429) throw new Error("Service rate limit reached. Try again later.");
    throw new Error(`Service request failed (${response.status}).`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Service returned no response.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.length;
      if (length > maxBytes) { await reader.cancel(); throw new Error("Service response exceeds review limits."); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
