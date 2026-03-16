FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile=false --filter @korean-erp/web... --network-concurrency=8 --child-concurrency=4
RUN pnpm --filter @korean-erp/web build

FROM node:20-alpine AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN corepack enable

WORKDIR /workspace
COPY --from=builder /workspace /workspace

EXPOSE 3000
CMD ["pnpm", "--filter", "@korean-erp/web", "start"]
