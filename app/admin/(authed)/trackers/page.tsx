import { adminList } from "@/lib/admin-rest";
import TrackerTable, {
  type LastCommand,
  type TrackerDevice,
} from "./TrackerTable";
import NewDeviceForm from "./NewDeviceForm";

export const dynamic = "force-dynamic";

/** 기기 목록 + 배정 사용자 닉네임 (user_id → profiles 임베드) */
type DeviceRow = TrackerDevice & {
  profiles: { nickname: string | null } | null;
};

export default async function TrackersPage() {
  const { rows } = await adminList<DeviceRow>(
    "tracker_devices?select=id,imei,hw_imei,label,status,battery_mv,battery_pct,last_seen_at,user_id,created_at,profiles(nickname)&order=created_at.asc"
  );

  const devices: TrackerDevice[] = rows.map((r) => ({
    ...r,
    user_nickname: r.profiles?.nickname ?? null,
  }));

  // 기기별 최근 명령 1건 — 적용 여부(acked/failed)를 행에서 바로 보려고.
  // 최신순 일부만 받아 기기별 첫 건만 남긴다 (기기 수가 적어 충분).
  const { rows: cmdRows } = await adminList<LastCommand>(
    "tracker_commands?select=device_id,command,status,reply,created_at&order=id.desc&limit=200"
  );
  const lastCommands: Record<string, LastCommand> = {};
  for (const c of cmdRows) {
    if (!lastCommands[c.device_id]) lastCommands[c.device_id] = c;
  }

  const active = devices.filter((d) => d.status !== "retired");
  const online = active.filter(
    (d) =>
      d.last_seen_at &&
      Date.now() - new Date(d.last_seen_at).getTime() < 10 * 60 * 1000
  ).length;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          트래커 기기
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          GPS 트래커 재고 입고 · 사용자 배정 · 원격 설정. 전체 {active.length}대 ·
          수신중 {online}대
        </p>
      </header>

      <NewDeviceForm />
      <TrackerTable devices={devices} lastCommands={lastCommands} />
    </main>
  );
}
