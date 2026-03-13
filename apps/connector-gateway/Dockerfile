FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @korean-erp/connector-gateway build

FROM node:20-alpine AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable

WORKDIR /workspace
COPY --from=builder /workspace /workspace

EXPOSE 4200
CMD ["pnpm", "--filter", "@korean-erp/connector-gateway", "start"]
