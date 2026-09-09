# ----------------------------------------------------------------- thu vien
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ----------------------------------------------------------------- build
FROM node:22-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dia chi API duoc nhung thang vao ma phia trinh duyet luc build, nen phai truyen vao
# tu day chu khong the doi luc chay. Dia chi nay la dia chi ma *trinh duyet* goi toi.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run build

# ----------------------------------------------------------------- chay
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S rapphim && adduser -S rapphim -G rapphim
USER rapphim

# Ban "standalone" da gom san node_modules can thiet, nho hon han viec chep ca cay.
COPY --from=build --chown=rapphim:rapphim /app/.next/standalone ./
COPY --from=build --chown=rapphim:rapphim /app/.next/static ./.next/static
COPY --from=build --chown=rapphim:rapphim /app/public ./public

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
