import { adminList } from "@/lib/admin-rest";
import NotificationSender from "./NotificationSender";

export const dynamic = "force-dynamic";

type Notif = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

type ProfileMini = { id: string; nickname: string | null };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const { rows: recent } = await adminList<Notif>(
    "notifications?select=id,user_id,type,title,body,is_read,created_at&order=created_at.desc",
    { from: 0, to: 49, count: true }
  );

  const userIds = Array.from(new Set(recent.map((r) => r.user_id)));
  const userMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { rows } = await adminList<ProfileMini>(
      `profiles?select=id,nickname&id=in.(${userIds.join(",")})`
    );
    rows.forEach((p) => userMap.set(p.id, p.nickname));
  }

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          푸시/알림 발송
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          알림을 보내고 최근 발송 내역을 확인합니다.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <NotificationSender />
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-base font-semibold text-white">
                최근 알림 (최신 50건)
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                notifications 테이블 raw
              </p>
            </div>
            {recent.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                발송 내역이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
                {recent.map((n) => (
                  <li key={n.id} className="px-5 py-3 hover:bg-white/[0.02]">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="text-sm text-white truncate flex-1">
                        {n.title}
                      </div>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    {n.body ? (
                      <div className="text-xs text-gray-400 line-clamp-2 mb-1">
                        {n.body}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10">
                        {n.type}
                      </span>
                      <span>
                        →{" "}
                        {userMap.get(n.user_id) ?? (
                          <span className="text-gray-600">(없음)</span>
                        )}
                      </span>
                      {n.is_read ? (
                        <span className="text-emerald-400">읽음</span>
                      ) : (
                        <span className="text-orange-300">미읽음</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
