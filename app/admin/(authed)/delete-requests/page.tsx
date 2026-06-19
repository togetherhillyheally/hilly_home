import DeleteRequestsTable, {
  type DeletionRequest,
} from "./DeleteRequestsTable";

export const dynamic = "force-dynamic";

async function supabaseGet<T>(path: string): Promise<T[]> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as T[];
}

async function fetchRequests(): Promise<DeletionRequest[]> {
  const requests = await supabaseGet<DeletionRequest>(
    "account_deletion_requests?select=id,user_id,phone_number,phone_e164,status,source,note,requested_at,processed_at,processed_by&order=requested_at.desc&limit=200"
  );
  const userIds = Array.from(
    new Set(requests.map((r) => r.user_id).filter((v): v is string => !!v))
  );
  if (userIds.length === 0) return requests;
  const profiles = await supabaseGet<{ id: string; nickname: string | null }>(
    `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
  );
  const nameMap = new Map(profiles.map((p) => [p.id, p.nickname]));
  return requests.map((r) => ({
    ...r,
    nickname: r.user_id ? (nameMap.get(r.user_id) ?? null) : null,
  }));
}

export default async function DeleteRequestsPage() {
  const requests = await fetchRequests();
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          계정 삭제 요청
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          전체 {requests.length}건 · 대기{" "}
          <span className="text-orange-300 font-medium">{pendingCount}</span>건
        </p>
      </header>

      <DeleteRequestsTable requests={requests} />
    </main>
  );
}
