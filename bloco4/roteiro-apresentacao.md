# Roteiro da demonstração ao vivo (Bloco 4)

Duração-alvo: **15–20 minutos** + perguntas. Toda a demonstração usa **pull requests**, que é o fluxo real de um time e o que a regra de proteção da `main` exige.

---

## 0. Preparação

### Uma vez, antes do dia: proteger a branch `main`
GitHub → repositório → **Settings → Rules → Rulesets → New ruleset → New branch ruleset**:
1. **Ruleset name:** `proteger-main` · **Enforcement status:** `Active`
2. **Target branches:** *Add target* → *Include default branch*
3. Marcar **Require a pull request before merging** (0 aprovações, já que o projeto é individual)
4. Marcar **Require status checks to pass** → *Add checks* e adicionar:
   `Build & smoke test`, `SAST · Semgrep`, `SCA & Container · Trivy`, `Segredos · Gitleaks`
5. Deixar marcados **Restrict deletions** e **Block force pushes** → **Create**

A partir daí, nada entra na `main` sem PR com os 4 checks verdes. É isso que faz o gate **impedir o merge**.

### No dia, 10 minutos antes
- [ ] Abrir https://devsecops-trilha-gustavo-almeida.onrender.com/health para **acordar o serviço**. Se estiver hibernado, leva ~1 min. Aproveitar para explicar a hibernação, se perguntarem.
- [ ] Abas abertas: repositório (aba **Actions**), arquivo do workflow, `/health` da aplicação, dashboard do Render (aba **Events/Deploys**).
- [ ] Terminal na pasta do repositório: `git switch main` e `git pull` (working tree limpo em `git status`).
- [ ] VS Code aberto no repositório.

---

## Etapa 1: fluxo completo ao vivo, do push até a aplicação publicada (~6 min)

**Fala de abertura (30 s):** "Construí uma pipeline no GitHub Actions com quatro verificações em paralelo: build, SAST com Semgrep, SCA e scan de container com Trivy e detecção de segredos com Gitleaks. Só se todas passarem, o deploy no Render é disparado automaticamente para o commit aprovado. Vou mostrar uma mudança indo do meu computador até produção."

1. Mostrar o `/health` atual: anotar o `commit` que está no ar.
2. Criar uma branch e fazer uma mudança **visível**. Em `app/src/db.js`, acrescentar uma tarefa à lista inicial:
   ```js
   { id: 5, title: "Demonstração ao vivo da pipeline", done: true, owner: "gustavo" },
   ```
3. Enviar:
   ```bash
   git switch -c demo/nova-tarefa
   git add app/src/db.js
   git commit -m "feat(app): tarefa de demonstração da pipeline"
   git push -u origin demo/nova-tarefa
   ```
4. No GitHub: **Compare & pull request** → **Create pull request**. Mostrar os 4 checks rodando **em paralelo** dentro do PR.
   - Enquanto rodam, explicar: "em PR a pipeline roda todos os gates, mas **nunca** faz deploy. O deploy só acontece a partir da `main`."
5. Checks verdes → **Squash and merge**. O merge gera um push na `main`, que dispara a pipeline de novo, agora **com** o job de deploy.
6. Na aba **Actions**, abrir a execução da `main` e mostrar o grafo: os 4 gates → **Deploy · Render**.
   - No passo "Disparar deploy" o Render responde HTTP 200.
   - No passo "Verificar publicação" o job espera o `/health` devolver o SHA novo.
7. Quando o deploy ficar verde:
   - `/health` → o `commit` agora é o **mesmo SHA** do merge (comparar com o da aba Actions);
   - `/api/tasks` → a tarefa "Demonstração ao vivo da pipeline" aparece.
   - **Fala:** "O que está no ar é exatamente o commit que passou pelos quatro gates: o deploy usa `ref=<SHA>` e a pipeline só fica verde quando confirma que esse SHA está respondendo."

---

## Etapa 2: como cada gate foi implementado (~6 min)

Abrir o [`devsecops-pipeline.yml`](../.github/workflows/devsecops-pipeline.yml) e percorrer de cima para baixo:

| Trecho | O que dizer |
| :--- | :--- |
| `on:` | push e PR na `main` + `workflow_dispatch` para rodar manualmente. `pull_request` (e não `pull_request_target`), então PR de fork não acessa secrets. |
| `permissions: contents: read` | Menor privilégio: o token da pipeline só lê o repositório. |
| `uses: ...@<SHA> # vX` | Actions fixadas por SHA, porque tag pode ser movida. Caso real: `trivy-action` comprometida em março/2026. |
| Job **build** | `npm ci` (instala exatamente o lockfile), `docker build` e smoke test no `/health`. |
| Job **Semgrep** | `--config p/default`, `--severity ERROR/WARNING` e `--error`, que é a flag que faz o gate falhar. Depois, anotações com arquivo e linha. |
| Job **Trivy** | Binário oficial com SHA-256 conferido. `trivy fs` (lockfile + Dockerfile) e `trivy image` com `HIGH,CRITICAL`, `--ignore-unfixed` e `--exit-code 1`. Depois, relatório completo sem filtro. |
| Job **Gitleaks** | `fetch-depth: 0` para ter o histórico. `gitleaks dir` (código atual) + `gitleaks git` (todos os commits de todas as branches), com `--redact`. Regra própria no `.gitleaks.toml`, exceções tratadas no `.gitleaksignore`. |
| Job **deploy** | `needs:` os 4 jobs (falhou um → *skipped*), só na `main`, Deploy Hook vindo de um secret, `ref=<SHA>` e verificação pelo `/health`. |

Mostrar rapidamente as evidências dos ciclos vermelho → verde: aba **Actions**, execuções **#1 → #2** (Bloco 2) e **#4 → #5** (Bloco 3, com o deploy pulado na #4).

---

## Etapa 3: como a pipeline reage a um achado crítico (~5 min)

1. Introduzir uma vulnerabilidade **de propósito** numa branch. Em `app/src/routes/tasks.js`, antes do `module.exports`:
   ```js
   // DEMO: vulnerabilidade proposital para mostrar o gate (não fazer merge!)
   router.get("/debug", (req, res) => res.json({ result: eval(req.query.code) }));
   ```
   ```bash
   git switch main
   git pull
   git switch -c demo/gate-semgrep
   git add app/src/routes/tasks.js
   git commit -m "demo: código vulnerável para demonstrar o gate"
   git push -u origin demo/gate-semgrep
   ```
2. Abrir o PR. Em ~30 s:
   - **SAST · Semgrep ❌**, enquanto os outros gates ficam verdes;
   - na aba **Files changed**, a anotação aparece **na linha do `eval`**;
   - o botão de merge fica **bloqueado** ("Required statuses must pass before merging").
   - **Fala:** "O Semgrep detectou dado da requisição chegando no `eval`, ou seja, execução remota de código. Terminou com exit code 1, o job falhou, o check ficou vermelho e a regra da `main` bloqueia o merge. Mesmo que alguém forçasse, o deploy depende de todos os gates: nada chegaria em produção."
3. Encerrar: **Close pull request** (sem merge) e limpar:
   ```bash
   git switch main
   git branch -D demo/gate-semgrep
   git push origin --delete demo/gate-semgrep
   ```

> ⚠️ **Não demonstrar o Gitleaks commitando um "segredo de mentira" numa branch.** O `gitleaks git` varre **todas** as branches (`git log --all`), então isso faria a pipeline da `main` falhar enquanto a branch existir. Para mostrar o Gitleaks, use a execução **#4**, que já tem os achados reais (código atual + commit `7bf5c58`).

**Extra (shift-left na máquina do desenvolvedor), se sobrar tempo:** rodar localmente, antes do commit,
```bash
semgrep scan --config p/default --severity ERROR --severity WARNING --error .
```
e mostrar que o mesmo achado aparece no terminal antes mesmo do push.

---

## Plano B (imprevistos)

| Problema | O que fazer |
| :--- | :--- |
| `/health` demorando | Cold start do plano Free (~1 min após 15 min sem tráfego). Esperar e explicar: é esperado. O job de deploy aguarda até 20 min. |
| Fila do GitHub Actions lenta | Mostrar as execuções já registradas (#1, #2, #4, #5) e os prints em `bloco2/prints` e `bloco3/prints`. |
| Deploy falhou com "secret não configurado" | Conferir **Settings → Secrets and variables → Actions → `RENDER_DEPLOY_HOOK_URL`**. |
| Deploy falhou com HTTP 401 | O Deploy Hook foi regenerado no Render: atualizar o secret com a URL nova. |
| Build no Render falhou | Abrir os logs do deploy no dashboard do Render. Os gates do GitHub continuam valendo como evidência. |
| Sem internet | Apresentar pelos prints e READMEs dos blocos 2 e 3. |

---

## Cola rápida

| Item | Valor |
| :--- | :--- |
| Repositório | https://github.com/gustakakkoii/devsecops-trilha-gustavo-almeida |
| Aplicação | https://devsecops-trilha-gustavo-almeida.onrender.com |
| Versões | Semgrep 1.179.0 · Trivy 0.75.0 · Gitleaks 8.30.1 · Node 24 |
| Semgrep no código-base | 6 achados (3 ERROR, 3 WARNING) → 0 |
| Trivy dependências | 5 HIGH (lodash, jsonwebtoken) → 0 |
| Trivy imagem | `node:14`/Debian 10: 23 CRITICAL + 577 HIGH, 1,37 GB → distroless Debian 13: 0 + 0, 226 MB |
| Gitleaks | 3 credenciais (código + commit `7bf5c58`) → removidas, JWT rotacionado, histórico no `.gitleaksignore` |
| Plano Free do Render | hiberna após **15 min** sem tráfego; cold start **~1 min**; disco efêmero; 750 h/mês |
| Execuções-chave | #1 ❌ / #2 ✅ (Bloco 2) · #4 ❌ deploy pulado / #5 ✅ deploy (Bloco 3) |
