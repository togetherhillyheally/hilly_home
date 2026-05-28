# 1단계: 빌드 단계
FROM node:20-alpine AS builder

# 작업 디렉터리 생성
WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 2단계: 실행 단계 (경량화된 이미지)
FROM node:20-alpine AS runner

# 시스템 기본 설정
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3200

# 앱 디렉터리 준비
WORKDIR /app

# 빌드된 output 복사 (Next.js standalone 모드 기준)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3200

# 실행 명령
CMD ["node", "server.js"]