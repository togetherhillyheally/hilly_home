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
      // 런트립 스태프 브리핑 정적 페이지 (public/runtrip/index.html)
      { source: "/runtrip", destination: "/runtrip/index.html" },
    ]
  },
}

export default nextConfig
