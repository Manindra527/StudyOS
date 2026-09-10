import type { ApiError } from "./api-response";

const FALLBACK = "Something went wrong. Please try again.";

export async function readApiError(response: Response, fallback = FALLBACK): Promise<string> {
  try {
    const payload = (await response.json()) as {
      success?: boolean;
      error?: ApiError;
    };
    if (payload.success === false && payload.error?.message) return payload.error.message;
  } catch {
    // The response body is intentionally never shown to the user.
  }
  return fallback;
}