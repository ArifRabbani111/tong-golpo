export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function logout() {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
}

export function requireAuthRedirect(router, returnPath) {
  const token = getToken();
  if (!token) {
    router.replace(`/auth?returnTo=${encodeURIComponent(returnPath)}`);
    return false;
  }
  return true;
}
