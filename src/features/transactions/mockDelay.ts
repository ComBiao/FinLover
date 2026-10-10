const MOCK_DELAY_MS = 200;

/** Resolves `value` after a short delay so mock services behave like network calls. Delete together with the last mock service. */
export function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}
