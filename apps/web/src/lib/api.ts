const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error(`CareLoop API request failed (${response.status})`);
  return response.json() as Promise<T>;
}
