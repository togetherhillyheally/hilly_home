import { cookies } from "next/headers";
import { USERS_GATE_COOKIE } from "./gate-config";
import UsersPasswordGate from "./UsersPasswordGate";

export const dynamic = "force-dynamic";

export default async function UsersAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const unlocked = store.get(USERS_GATE_COOKIE)?.value === "1";
  if (!unlocked) return <UsersPasswordGate />;
  return <>{children}</>;
}
