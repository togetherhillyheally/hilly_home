import { adminList } from "@/lib/admin-rest";
import SosBoard, { type SosItem } from "./SosBoard";

export const dynamic = "force-dynamic";

type AppAlert = {
  id: string;
  session_id: string;
  user_id: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

type TrackerSos = {
  id: number;
  device_id: string;
  recorded_at: string;
  lat: number | null;
  lng: number | null;
  battery_pct: number | null;
  sos_acked_at: string | null;
  sos_acked_by: string | null;
};

type Device = { id: string; imei: string; label: string | null; user_id: string | null };
type Profile = { id: string; nickname: string | null };
type Session = { id: string; trail_id: string | null };
type Trail = { id: string; name: string };

const inList = (ids: (string | null | undefined)[]) =>
  Array.from(new Set(ids.filter((x): x is string => !!x))).join(",");

export default async function SosPage() {
  const [{ rows: alerts }, { rows: trackerSos }] = await Promise.all([
    adminList<AppAlert>(
      `session_sos_alerts?select=id,session_id,user_id,lat,lng,note,created_at,resolved_at,resolved_by&order=created_at.desc`,
      { from: 0, to: 299 }
    ),
    adminList<TrackerSos>(
      `tracker_locations?select=id,device_id,recorded_at,lat,lng,battery_pct,sos_acked_at,sos_acked_by&event=eq.SOS&order=recorded_at.desc`,
      { from: 0, to: 299 }
    ),
  ]);

  const deviceIds = inList(trackerSos.map((t) => t.device_id));
  const { rows: devices } = deviceIds
    ? await adminList<Device>(`tracker_devices?select=id,imei,label,user_id&id=in.(${deviceIds})`)
    : { rows: [] as Device[] };
  const deviceMap = new Map(devices.map((d) => [d.id, d]));

  const sessionIds = inList(alerts.map((a) => a.session_id));
  const { rows: sessions } = sessionIds
    ? await adminList<Session>(`hiking_sessions?select=id,trail_id&id=in.(${sessionIds})`)
    : { rows: [] as Session[] };
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const trailIds = inList(sessions.map((s) => s.trail_id));
  const { rows: trails } = trailIds
    ? await adminList<Trail>(`trails?select=id,name&id=in.(${trailIds})`)
    : { rows: [] as Trail[] };
  const trailMap = new Map(trails.map((t) => [t.id, t.name]));

  const profileIds = inList([
    ...alerts.flatMap((a) => [a.user_id, a.resolved_by]),
    ...devices.map((d) => d.user_id),
    ...trackerSos.map((t) => t.sos_acked_by),
  ]);
  const { rows: profiles } = profileIds
    ? await adminList<Profile>(`profiles?select=id,nickname&id=in.(${profileIds})`)
    : { rows: [] as Profile[] };
  const nick = (id: string | null | undefined) =>
    id ? profiles.find((p) => p.id === id)?.nickname ?? null : null;

  const items: SosItem[] = [
    ...alerts.map((a): SosItem => {
      const s = sessionMap.get(a.session_id);
      return {
        key: `app:${a.id}`,
        source: "app",
        id: a.id,
        at: a.created_at,
        lat: a.lat,
        lng: a.lng,
        who: nick(a.user_id) ?? "(닉네임 없음)",
        userId: a.user_id,
        context: s?.trail_id ? trailMap.get(s.trail_id) ?? null : null,
        sessionId: a.session_id,
        note: a.note,
        battery: null,
        resolvedAt: a.resolved_at,
        resolvedBy: nick(a.resolved_by),
      };
    }),
    ...trackerSos.map((t): SosItem => {
      const d = deviceMap.get(t.device_id);
      return {
        key: `tracker:${t.id}`,
        source: "tracker",
        id: String(t.id),
        at: t.recorded_at,
        lat: t.lat,
        lng: t.lng,
        who: d?.label || (d ? `IMEI …${d.imei.slice(-4)}` : "알 수 없는 기기"),
        userId: d?.user_id ?? null,
        context: d?.user_id ? nick(d.user_id) : null,
        sessionId: null,
        note: null,
        battery: t.battery_pct,
        resolvedAt: t.sos_acked_at,
        resolvedBy: nick(t.sos_acked_by),
      };
    }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          SOS 확인
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          앱 SOS 버튼과 트래커 SOS 버튼 신호를 한곳에서 확인하고 처리해요. 30초마다 자동 새로고침.
        </p>
      </header>
      <SosBoard items={items} />
    </main>
  );
}
