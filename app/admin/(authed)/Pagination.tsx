import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  basePath: string;
  page: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  page: number,
  query: Record<string, string | undefined> = {}
): string {
  const s = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v) s.set(k, v);
  });
  if (page > 1) s.set("page", String(page));
  const qs = s.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({
  basePath,
  page,
  totalPages,
  query,
}: Props) {
  if (totalPages <= 1) return null;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const linkCls =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white hover:bg-white/[0.06] transition-colors";
  const disabledCls =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.05] bg-white/[0.01] text-sm text-gray-600 cursor-not-allowed";

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-gray-500">
        페이지 <span className="text-white">{page}</span> / {totalPages}
      </span>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link href={buildHref(basePath, page - 1, query)} className={linkCls}>
            <ChevronLeft className="h-4 w-4" /> 이전
          </Link>
        ) : (
          <span className={disabledCls}>
            <ChevronLeft className="h-4 w-4" /> 이전
          </span>
        )}
        {hasNext ? (
          <Link href={buildHref(basePath, page + 1, query)} className={linkCls}>
            다음 <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className={disabledCls}>
            다음 <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
