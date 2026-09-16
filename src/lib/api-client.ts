/** Public API origin only. Secrets remain server-side. */
const configuredOrigin = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "");

// In local development the Vite proxy forwards this origin to Express. In production,
// set VITE_API_URL to the deployed Express service (for example Render).
export const apiUrl = (path: string) => `${configuredOrigin || ""}${path.startsWith("/") ? path : `/${path}`}`;
