import type { Metadata } from "next";
import TrailResumeForm from "./TrailResumeForm";

export const metadata: Metadata = {
  title: "동서트레일 조사 이력서 | Hilly Heally",
  description: "동서트레일 조사 참여를 위한 이력서 제출 폼",
  robots: { index: false, follow: false },
};

export default function TrailResumePage() {
  return <TrailResumeForm />;
}
