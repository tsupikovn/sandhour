import { fetch as nativeFetch } from '@tauri-apps/plugin-http';

export interface HttpReply {
  status: number;
  ok: boolean;
  /** Parsed body, or `null` when the body was not JSON. */
  data: any;
}

/**
 * POST JSON through the Rust HTTP client rather than the webview, so the call is
 * not blocked by the provider's CORS policy. A failure to connect at all is
 * turned into a readable message naming the host.
 */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<HttpReply> {
  let res: Response;
  try {
    res = await nativeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  } catch (err) {
    let host = url;
    try {
      host = new URL(url).host;
    } catch {
      // keep the raw string
    }
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not connect to ${host}. ${detail}`.trim());
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

/** Pull the human-readable message out of the common error body shapes. */
function providerMessage(data: any): string {
  const msg = data?.error?.message ?? data?.message ?? (typeof data?.error === 'string' ? data.error : '');
  return typeof msg === 'string' ? msg.slice(0, 200) : '';
}

/** Throw a readable error for a non-2xx reply. */
export function throwForStatus(reply: HttpReply, providerLabel: string): never {
  const detail = providerMessage(reply.data);
  const tail = detail ? ` (${detail})` : '';
  switch (reply.status) {
    case 401:
    case 403:
      throw new Error(`The API key was rejected. Check it in the settings.${tail}`);
    case 404:
      throw new Error(`Model or address not found. Check the model name and the API address.${tail}`);
    case 429:
      throw new Error(`Rate limit reached or out of credit. Wait a minute and try again.${tail}`);
    default:
      throw new Error(`${providerLabel} error (${reply.status}).${tail}`);
  }
}
