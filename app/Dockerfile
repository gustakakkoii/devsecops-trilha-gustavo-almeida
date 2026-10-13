FROM node:14

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

# Correção (Semgrep: missing-user): o processo roda com o usuário sem
# privilégios "node", que já existe na imagem oficial, em vez de root
USER node

CMD ["node", "src/server.js"]
