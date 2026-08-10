import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  type AdminTier,
  type MenuKey,
  type MenuScopeMap,
  resolveMenuKeys,
  resolveScope,
} from "@/lib/admin-permissions";
import { firstAccessibleHref } from "@/lib/admin-nav";

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
  tier: AdminTier;
  menuKeys: Set<MenuKey>;
  scopes: MenuScopeMap;
};

/** 이 세션이 주어진 메뉴에 접근 가능한지. */
export function hasMenuAccess(session: AdminSession, menuKey: MenuKey): boolean {
  return session.menuKeys.has(menuKey);
}

/**
 * 페이지/레이아웃에서 호출 — 세션이 없으면 로그인으로, 해당 메뉴 접근권이 없으면
 * 본인이 볼 수 있는 첫 메뉴로 리다이렉트. 사이드바에서 메뉴를 숨기는 것만으로는
 * URL 직접 접근을 막지 못하므로(특히 client 계정), 각 메뉴 페이지에서 반드시 호출해야 함.
 */
export async function requireMenuSession(menuKey: MenuKey): Promise<AdminSession> {
  const session = await readAdminSession();
  if (!session) redirect("/admin");
  if (!hasMenuAccess(session, menuKey)) {
    redirect(firstAccessibleHref(session.menuKeys) ?? "/admin");
  }
  return session;
}

/**
 * 스코프 지원 메뉴에서 이 세션이 조회 가능한 리소스 id 목록.
 * null = 제한 없음(전체 조회), 배열 = 해당 id들로만 제한(빈 배열 포함).
 */
export function scopeFor(session: AdminSession, menuKey: MenuKey): string[] | null {
  return resolveScope(menuKey, session.tier, session.scopes);
}

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

  // admin_tier 재검증 — 권한 박탈/강등 즉시 반영
  const profRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${row.user_id}&select=id,nickname,phone_number,admin_tier&limit=1`,
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
    admin_tier: AdminTier | null;
  }>;
  const prof = profs[0];
  if (!prof || !prof.admin_tier) return null;

  const [accessRes, scopeRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/admin_menu_access?profile_id=eq.${prof.id}&select=menu_key,allowed`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/admin_menu_scope?profile_id=eq.${prof.id}&select=menu_key,resource_id`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    ),
  ]);
  const overrides = accessRes.ok
    ? ((await accessRes.json()) as Array<{ menu_key: string; allowed: boolean }>)
    : [];
  const scopeRows = scopeRes.ok
    ? ((await scopeRes.json()) as Array<{ menu_key: string; resource_id: string }>)
    : [];

  const scopes: MenuScopeMap = {};
  for (const r of scopeRows) {
    const key = r.menu_key as MenuKey;
    (scopes[key] ??= []).push(r.resource_id);
  }

  return {
    userId: prof.id,
    nickname: prof.nickname,
    phoneNumber: prof.phone_number,
    tier: prof.admin_tier,
    menuKeys: resolveMenuKeys(prof.admin_tier, overrides),
    scopes,
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
