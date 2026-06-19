import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { adminList } from "@/lib/admin-rest";
import {
  BASECAMP_ASSETS_BUCKET,
  categoryLabel,
  seasonLabel,
} from "@/lib/basecamp-object-constants";
import ObjectEditForm from "./ObjectEditForm";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type ObjectRow = {
  id: string;
  name: string;
  category: string;
  season: string | null;
  storage_path: string;
  sort_order: number;
  unlock_cost: number;
  design_key: string | null;
  created_at: string;
};

function publicImageUrl(storagePath: string, createdAt?: string): string {
  const base = `${SUPABASE_URL}/storage/v1/object/public/${BASECAMP_ASSETS_BUCKET}/${storagePath}`;
  return createdAt ? `${base}?v=${encodeURIComponent(createdAt)}` : base;
}

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows } = await adminList<ObjectRow>(
    `basecamp_objects?select=id,name,category,season,storage_path,sort_order,unlock_cost,design_key,created_at&id=eq.${id}`
  );
  const obj = rows[0];
  if (!obj) notFound();

  return (
    <main className="p-6 lg:p-10">
      <header className="mb-6">
        <Link
          href="/admin/objects"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          오브젝트 카탈로그
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {obj.name}
          </h1>
          <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.06] border border-white/10 text-gray-300 text-[11px] font-medium">
            {categoryLabel(obj.category)}
          </span>
          {obj.season && (
            <span className="inline-flex items-center px-2 h-6 rounded-md bg-white/[0.06] border border-white/10 text-gray-300 text-[11px] font-medium">
              {seasonLabel(obj.season)}
            </span>
          )}
        </div>
        {obj.design_key && (
          <p className="text-xs text-gray-500 font-mono mt-1.5">
            design_key: {obj.design_key}
          </p>
        )}
      </header>

      <ObjectEditForm
        objectId={obj.id}
        initialName={obj.name}
        initialCategory={obj.category}
        initialSeason={obj.season}
        initialSortOrder={obj.sort_order}
        initialUnlockCost={obj.unlock_cost}
        initialDesignKey={obj.design_key}
        imageUrl={publicImageUrl(obj.storage_path, obj.created_at)}
        storagePath={obj.storage_path}
      />
    </main>
  );
}
