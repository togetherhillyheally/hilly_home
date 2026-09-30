/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 좌하단 Next.js dev 인디케이터(N 아이콘) 숨김
  devIndicators: false,
  async rewrites() {
    return [
      // 소노캄180K 스태프 브리핑 정적 페이지 (public/sono180k/index.html)
      { source: "/sono180k", destination: "/sono180k/index.html" },
    ]
  },
  async redirects() {
    return [
      // 구 주소 → 새 주소
      { source: "/runtrip", destination: "/sono180k", permanent: false },
      { source: "/runtrip/:path*", destination: "/sono180k/:path*", permanent: false },
    ]
  },
}

export default nextConfig
