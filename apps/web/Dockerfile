# Modern Edu Web — Railway uchun (Next.js server rejimi).
# Railway: service Root Directory = repo root, Dockerfile path = apps/web/Dockerfile.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=1
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# NEXT_PUBLIC_* qiymatlari build vaqtida client bundle'ga kiritiladi.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_REALTIME_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
RUN pnpm turbo run build --filter=@modern-edu/web
RUN pnpm deploy --filter=@modern-edu/web --prod /app/deploy

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy ./
EXPOSE 3000
CMD ["pnpm", "start"]
