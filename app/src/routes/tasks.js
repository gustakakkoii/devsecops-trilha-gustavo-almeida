const express = require("express");
const router = express.Router();
const db = require("../db");

// Campos que o cliente pode alterar via PATCH. Qualquer outro campo do corpo
// (id, __proto__, etc.) é ignorado.
const EDITABLE_FIELDS = ["title", "done", "owner"];

// GET /api/tasks - lista todas as tarefas
router.get("/", (req, res) => {
  res.json(db.listTasks());
});

// GET /api/tasks/filter?done=true&owner=mentoria&q=pipeline - filtro de tarefas
//
// Correção (Semgrep: code-string-concat / eval-detected): a versão anterior
// executava com eval() a expressão recebida em ?expr=, então qualquer pessoa
// podia rodar código JavaScript no servidor (RCE). Agora o filtro só aceita
// campos conhecidos e compara valores; nenhum texto do usuário é executado.
router.get("/filter", (req, res) => {
  const { done, owner, q } = req.query;

  if (done === undefined && owner === undefined && q === undefined) {
    return res.status(400).json({ error: "Informe ao menos um filtro: done, owner ou q" });
  }
  if (done !== undefined && done !== "true" && done !== "false") {
    return res.status(400).json({ error: "O filtro 'done' aceita apenas true ou false" });
  }

  const result = db.listTasks().filter(
    (t) =>
      (done === undefined || t.done === (done === "true")) &&
      (owner === undefined || t.owner === String(owner)) &&
      (q === undefined || t.title.toLowerCase().includes(String(q).toLowerCase()))
  );
  res.json(result);
});

// GET /api/tasks/:id - busca uma tarefa pelo id
router.get("/:id", (req, res) => {
  const task = db.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
  res.json(task);
});

// POST /api/tasks - cria uma nova tarefa
router.post("/", (req, res) => {
  const { title, owner } = req.body;
  if (!title) return res.status(400).json({ error: "Campo 'title' é obrigatório" });
  const task = db.createTask({ title, owner });
  res.status(201).json(task);
});

// PATCH /api/tasks/:id - atualiza uma tarefa (ex: marcar como concluída)
//
// Correção (revisão manual, não apontada pelo Semgrep): antes o corpo inteiro
// da requisição era copiado para a tarefa (mass assignment), permitindo trocar
// o id ou injetar propriedades. Agora só os campos de EDITABLE_FIELDS passam.
router.patch("/:id", (req, res) => {
  const body = req.body || {};
  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) changes[field] = body[field];
  }
  const task = db.updateTask(req.params.id, changes);
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada" });
  res.json(task);
});

// DELETE /api/tasks/:id - remove uma tarefa
router.delete("/:id", (req, res) => {
  const ok = db.deleteTask(req.params.id);
  if (!ok) return res.status(404).json({ error: "Tarefa não encontrada" });
  res.status(204).end();
});

module.exports = router;
