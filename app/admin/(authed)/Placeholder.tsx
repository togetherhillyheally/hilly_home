import { Construction } from "lucide-react";

export default function Placeholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className="p-6 lg:p-10">
      <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-gray-400 mb-8">{description}</p>
      ) : (
        <div className="mb-8" />
      )}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
          <Construction className="h-6 w-6 text-orange-400" />
        </div>
        <h2 className="text-base font-medium text-white mb-1">
          준비 중인 페이지
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          이 메뉴는 곧 만들 예정입니다. 사이드바에서 다른 메뉴를 선택해 주세요.
        </p>
      </div>
    </main>
  );
}
