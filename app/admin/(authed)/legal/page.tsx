import Link from "next/link";
import { readAdminSession } from "@/lib/admin-session";
import { redirect } from "next/navigation";
import { adminList } from "@/lib/admin-rest";
import LegalEditor from "./LegalEditor";

export const dynamic = "force-dynamic";

type LegalType = "terms" | "privacy";

const TYPE_LABELS: Record<LegalType, string> = {
  terms: "이용약관",
  privacy: "개인정보처리방침",
};

type Doc = {
  type: LegalType;
  content_md: string;
  effective_date: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  version: number;
  effective_date: string;
  saved_at: string;
  saved_by: string | null;
};

export default async function LegalAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await readAdminSession();
  if (!session) redirect("/admin");

  const sp = await searchParams;
  const type: LegalType = sp.type === "privacy" ? "privacy" : "terms";

  const [{ rows: docRows }, { rows: versions }] = await Promise.all([
    adminList<Doc>(
      `legal_documents?type=eq.${type}&select=type,content_md,effective_date,updated_at`
    ),
    adminList<VersionRow>(
      `legal_document_versions?type=eq.${type}&select=id,version,effective_date,saved_at,saved_by&order=version.desc`,
      { from: 0, to: 99 }
    ),
  ]);
  const doc = docRows[0] ?? null;

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          법적 문서
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          이용약관·개인정보처리방침을 markdown 으로 관리합니다. 저장 시 이전 버전이 자동으로 스냅샷됩니다.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["terms", "privacy"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/legal?type=${t}`}
            className={`px-4 h-9 inline-flex items-center rounded-lg text-sm font-medium transition-colors ${
              t === type
                ? "bg-orange-500/20 text-orange-200 border border-orange-500/40"
                : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
            }`}
          >
            {TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      <LegalEditor
        type={type}
        initialContent={doc?.content_md ?? ""}
        initialEffectiveDate={doc?.effective_date ?? ""}
        versions={versions}
      />
    </main>
  );
}
