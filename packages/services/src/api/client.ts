const SESSION_KEY = "fintrack_session";

function getBaseUrl(): string {
  // In production: empty string = same origin (Next.js rewrites proxy /api/* to FastAPI)
  // In local dev: NEXT_PUBLIC_API_URL=http://localhost:8000 bypasses the proxy
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw).token;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const isAuthEndpoint = path.startsWith("/api/auth");

  if (!token && !isAuthEndpoint) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
