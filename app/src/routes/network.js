const express = require("express");
const router = express.Router();
const dns = require("dns").promises;
const net = require("net");

// Um rótulo de nome de host (RFC 1123): letras, números e hífen, até 63 caracteres.
const HOST_LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

function isValidHost(host) {
  if (net.isIP(host)) return true;
  return host.length <= 253 && host.split(".").every((label) => HOST_LABEL.test(label));
}

// GET /api/ping?host=<endereço> - diagnóstico de rede (resolução de DNS)
//
// Correção (Semgrep: detect-child-process): a versão anterior executava
// "ping -c 2 " + host num shell, então ?host=8.8.8.8;cat /etc/passwd rodava
// qualquer comando no servidor (command injection). Agora:
//   1. não existe mais chamada a processo externo nem shell: o diagnóstico usa
//      a API nativa de DNS do Node;
//   2. o host é validado (allowlist de formato: nome de domínio ou IP) antes
//      de qualquer uso.
router.get("/ping", async (req, res) => {
  const { host } = req.query;
  if (typeof host !== "string" || host === "") {
    return res.status(400).json({ error: "Parâmetro 'host' é obrigatório" });
  }
  if (!isValidHost(host)) {
    return res.status(400).json({ error: "Host inválido: use um nome de domínio ou um endereço IP" });
  }

  const startedAt = Date.now();
  try {
    const addresses = await dns.lookup(host, { all: true });
    res.json({ host, resolved: true, addresses, durationMs: Date.now() - startedAt });
  } catch (err) {
    res.status(502).json({ host, resolved: false, error: "Não foi possível resolver o host", code: err.code });
  }
});

module.exports = router;
