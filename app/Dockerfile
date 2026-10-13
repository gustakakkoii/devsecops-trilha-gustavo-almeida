# -----------------------------------------------------------------------------
# Estágio 1 (deps): instala só as dependências de produção, exatamente as
# versões do package-lock.json. Este estágio tem npm e shell, mas NÃO vai para
# a imagem final.
# -----------------------------------------------------------------------------
FROM node:24-trixie-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# -----------------------------------------------------------------------------
# Estágio 2 (runtime): imagem distroless, que contém só o runtime do Node e as
# bibliotecas mínimas do sistema. Sem shell, sem npm e sem gerenciador de
# pacotes, sobra bem menos para ter CVE e para um atacante usar.
#
# Correção (Trivy): a base antiga node:14 (Debian 10, sem suporte desde 2023)
# tinha 21 CVEs CRITICAL e 545 HIGH só nos pacotes do sistema.
# -----------------------------------------------------------------------------
FROM gcr.io/distroless/nodejs24-debian13:nonroot

WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY uploads ./uploads

EXPOSE 3000

# Usuário sem privilégios (uid 65532) da imagem distroless
USER nonroot

# O ENTRYPOINT da imagem distroless já é o binário do node
CMD ["src/server.js"]
