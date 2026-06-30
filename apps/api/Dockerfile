# Modern Edu API — Railway uchun ko'p bosqichli build (pnpm monorepo).
# Railway: service Root Directory = repo root, Dockerfile path = apps/api/Dockerfile.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=1
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@modern-edu/api
# Self-contained, production-only deploy papkasi
RUN pnpm deploy --filter=@modern-edu/api --prod /app/deploy

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy ./
# Migratsiyalar + seed deploy paytida `db:migrate`/`db:seed` orqali (Railway release)
EXPOSE 8080
CMD ["node", "dist/main.js"]
