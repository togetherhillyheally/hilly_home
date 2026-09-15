import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "동서트레일 조사 도우미",
    short_name: "동서트레일 조사",
    description:
      "산길샘과 함께 쓰는 동서트레일 현장조사 카운터 도구 (힐리힐리)",
    scope: "/tools/",
    start_url: "/tools/dongseo-survey",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080f",
    theme_color: "#08080f",
    lang: "ko-KR",
    icons: [
      {
        src: "/images/another_logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/another_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/another_logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
