const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function adminFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function adminList<T>(
  path: string,
  opts?: { from?: number; to?: number; count?: boolean }
): Promise<{ rows: T[]; total: number }> {
  const headers: Record<string, string> = {};
  if (opts?.count) headers.Prefer = "count=exact";
  if (opts?.from !== undefined && opts?.to !== undefined) {
    headers.Range = `${opts.from}-${opts.to}`;
  }
  const res = await adminFetch(path, { headers });
  if (!res.ok) return { rows: [], total: 0 };
  const rows = (await res.json()) as T[];
  const range = res.headers.get("content-range");
  const total = range ? Number(range.split("/")[1]) || 0 : rows.length;
  return { rows, total };
}

export function escapeIlike(term: string): string {
  return term.replace(/[%_*]/g, "");
}
