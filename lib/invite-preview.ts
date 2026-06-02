// 모험 초대 코드 미리보기 (anon 키로 RPC 호출)
// hillyheally.com/a/{code} 페이지에서 사용

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type SessionInvitePreview = {
  session_id: string;
  title: string;
  mountain_name: string;
  meeting_at: string;
  meeting_place: string;
  duration_minutes: number;
  status: "open" | "closed" | "completed" | "cancelled";
  capacity: number;
  cover_image_url: string | null;
  is_private: boolean;
  host_nickname: string | null;
  host_avatar_url: string | null;
  expired: boolean;
};

export async function fetchSessionInvitePreview(
  code: string
): Promise<SessionInvitePreview | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_session_invite_preview`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_code: code }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data as SessionInvitePreview | null;
}
