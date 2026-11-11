/**
 * Parse a JSON object out of a model reply. Providers without a strict JSON mode
 * often wrap the object in a ```json fence or add a sentence around it, so fall
 * back to the outermost `{ … }` span before giving up.
 */
export function extractJson<T = unknown>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // fall through to the tolerant paths
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      // fall through
    }
  }

  throw new Error('Could not parse the model\'s reply.');
}
