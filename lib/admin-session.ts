import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const ADMIN_COOKIE = "hh_admin_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
/** 남은 TTL 이 이 값보다 적어지면 DB expires_at 을 슬라이딩 갱신 */
const REFRESH_THRESHOLD_MS = SESSION_TTL_MS * 0.5;

export function generateToken(): string {
  return randomBytes(48).toString("hex"); // 96 chars
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type AdminSession = {
  userId: string;
  nickname: string | null;
  phoneNumber: string | null;
};

export async function createAdminSession(opts: {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_sessions`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      token_hash: tokenHash,
      user_id: opts.userId,
      expires_at: expiresAt.toISOString(),
      ip_address: opts.ip,
      user_agent: opts.userAgent,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`admin_sessions insert failed: ${res.status} ${text}`);
  }
  return { token, expiresAt };
}

export async function readAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  const sessRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_sessions?token_hash=eq.${tokenHash}&select=user_id,expires_at,revoked_at&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!sessRes.ok) return null;
  const rows = (await sessRes.json()) as Array<{
    user_id: string;
    expires_at: string;
    revoked_at: string | null;
  }>;
  const row = rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  const expiresMs = new Date(row.expires_at).getTime();
  const nowMs = Date.now();
  if (expiresMs < nowMs) return null;

  // 슬라이딩 갱신 — 남은 TTL 이 절반 이하면 DB expires_at 을 재연장 (fire-and-forget)
  if (expiresMs - nowMs < REFRESH_THRESHOLD_MS) {
    const newExpires = new Date(nowMs + SESSION_TTL_MS).toISOString();
    fetch(
      `${SUPABASE_URL}/rest/v1/admin_sessions?token_hash=eq.${tokenHash}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ expires_at: newExpires }),
      }
    ).catch(() => {});
  }

  // is_super_admin 재검증 — 권한 박탈 즉시 반영
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${row.user_id}&select=id,nickname,phone_number,is_super_admin&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );
  if (!profRes.ok) return null;
  const profs = (await profRes.json()) as Array<{
    id: string;
    nickname: string | null;
    phone_number: string | null;
    is_super_admin: boolean | null;
  }>;
  const prof = profs[0];
  if (!prof || !prof.is_super_admin) return null;

  return {
    userId: prof.id,
    nickname: prof.nickname,
    phoneNumber: prof.phone_number,
  };
}

export async function revokeAdminSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await fetch(
    `${SUPABASE_URL}/rest/v1/admin_sessions?token_hash=eq.${tokenHash}`,
    {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    }
  );
}
