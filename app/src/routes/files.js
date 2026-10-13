const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads");

// Nome de arquivo simples: letras, números, "_", "-" e "."; não pode começar
// com ponto (bloqueia "..", ".env" e outros arquivos ocultos).
const SAFE_FILENAME = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,254}$/;

// Devolve um nome de arquivo seguro ou null se o nome for inválido.
function sanitizeFilename(name) {
  const base = path.basename(String(name));
  return SAFE_FILENAME.test(base) ? base : null;
}

// GET /api/files/:filename - lê e devolve o conteúdo de um arquivo da pasta uploads/
//
// Correção (Semgrep: path-join-resolve-traversal): antes o nome recebido ia
// direto para path.join, então ../src/config.js (ou ..%2Fsrc%2Fconfig.js)
// saía da pasta uploads/ e lia qualquer arquivo do servidor (path traversal).
// Agora:
//   1. sanitizeFilename descarta diretórios (path.basename) e só aceita
//      caracteres de uma allowlist;
//   2. o caminho final é resolvido e conferido: precisa continuar dentro de
//      uploads/ (defesa em profundidade, caso a primeira barreira falhe).
router.get("/:filename", (req, res) => {
  const filename = sanitizeFilename(req.params.filename);
  if (!filename) return res.status(400).json({ error: "Nome de arquivo inválido" });

  const filePath = path.resolve(UPLOADS_DIR, filename);
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return res.status(400).json({ error: "Nome de arquivo inválido" });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(404).json({ error: "Arquivo não encontrado" });
    res.type("text/plain").send(data);
  });
});

module.exports = router;
