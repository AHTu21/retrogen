const KEY = "retrogen_access_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (!token) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}
