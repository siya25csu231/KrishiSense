/* Centralized API client — every network call goes through here. */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Network error — please check your connection and try again.");
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg =
      (body as { error?: string } | null)?.error ??
      `Request failed (${res.status}). Please try again.`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

/* ----------------------------- types ------------------------------ */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  state: string | null;
  district: string | null;
  village: string | null;
  language: string | null;
  farmSizeAcres: number | null;
  soilType: string | null;
  preferredCrops: string | null;
}

export interface FieldRecord {
  id: string;
  name: string;
  areaAcres: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  soilType: string | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  ph: number | null;
  currentCrop: string | null;
  previousCrop: string | null;
  season: string | null;
}

export interface CropInputs {
  N: number;
  P: number;
  K: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
}

/* ---------------------------- services ----------------------------- */

export const authApi = {
  me: () => request<{ user: UserProfile | null }>("/api/auth"),
  login: (email: string, password: string) =>
    request<{ ok: boolean; user: UserProfile }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password }),
    }),
  register: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; user: UserProfile }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "register", ...payload }),
    }),
  demo: () =>
    request<{ ok: boolean; user: UserProfile }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "demo" }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    }),
};

export const fieldsApi = {
  list: () => request<{ fields: FieldRecord[] }>("/api/fields"),
  create: (payload: Record<string, unknown>) =>
    request<{ field: FieldRecord }>("/api/fields", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    request<{ field: FieldRecord }>(`/api/fields/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/fields/${id}`, { method: "DELETE" }),
};

export const cropApi = {
  recommend: (inputs: CropInputs) =>
    request("/api/recommend", { method: "POST", body: JSON.stringify(inputs) }),
  whatIf: (base: CropInputs, changed: Partial<CropInputs>) =>
    request("/api/recommend", {
      method: "POST",
      body: JSON.stringify({ ...base, whatIf: changed }),
    }),
};

export const diseaseApi = {
  detect: (stats: Record<string, unknown>) =>
    request("/api/disease", { method: "POST", body: JSON.stringify({ stats }) }),
};

export const weatherApi = {
  get: (lat: number, lon: number, place?: string) =>
    request(
      `/api/weather?lat=${lat}&lon=${lon}${place ? `&place=${encodeURIComponent(place)}` : ""}`
    ),
  geocode: (q: string) =>
    request<{ results: { name: string; lat: number; lon: number }[]; error?: string }>(
      `/api/weather?action=geocode&q=${encodeURIComponent(q)}`
    ),
};

export const marketApi = {
  snapshot: () => request("/api/market"),
  detail: (commodity: string) =>
    request("/api/market", { method: "POST", body: JSON.stringify({ commodity }) }),
};

export const agroApi = {
  call: (tool: string, payload: Record<string, unknown>) =>
    request(`/api/agro`, { method: "POST", body: JSON.stringify({ tool, ...payload }) }),
};

export const alertsApi = {
  list: () => request("/api/alerts"),
  dismiss: (id: string) =>
    request("/api/alerts", { method: "POST", body: JSON.stringify({ id }) }),
};

export const communityApi = {
  posts: () => request("/api/community"),
  createPost: (title: string, body: string) =>
    request("/api/community", { method: "POST", body: JSON.stringify({ title, body }) }),
  thread: (id: string) => request(`/api/community/${id}`),
  comment: (id: string, body: string) =>
    request(`/api/community/${id}`, { method: "POST", body: JSON.stringify({ body }) }),
  report: (id: string) => request(`/api/community/${id}`, { method: "PATCH" }),
};

export const historyApi = {
  list: () => request<{ history: HistoryRow[] }>("/api/history"),
  saved: () => request<{ saved: SavedRow[] }>("/api/history?saved=1"),
  save: (payload: Record<string, unknown>) =>
    request("/api/history", { method: "POST", body: JSON.stringify(payload) }),
  remove: (id: string) => request(`/api/history?id=${id}`, { method: "DELETE" }),
};

export const modelsApi = {
  report: () => request("/api/models"),
};

export const assistantApi = {
  ask: (message: string) =>
    request<{ answer: string; intent: string; link?: string }>("/api/assistant", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

export const profileApi = {
  get: () => request<{ user: UserProfile }>("/api/profile"),
  update: (payload: Record<string, unknown>) =>
    request<{ user: UserProfile }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

/* ----------------------------- types 2 ----------------------------- */

export interface HistoryRow {
  id: string;
  kind: string;
  title: string;
  summary: string;
  createdAt: string;
}

export interface SavedRow {
  id: string;
  title: string;
  kind: string;
  note: string | null;
  createdAt: string;
}

/* ---------------------------- formatters --------------------------- */

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
