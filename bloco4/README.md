# Bloco 4 — Documentação final da pipeline DevSecOps

**Gustavo Costa Almeida** · Ciência da Computação · Trilha DevSecOps · Onboarding SACI/UFLA 2026.2

| | |
| :--- | :--- |
| **Repositório final** | https://github.com/gustakakkoii/devsecops-trilha-gustavo-almeida |
| **Aplicação publicada** | https://devsecops-trilha-gustavo-almeida.onrender.com (healthcheck: [`/health`](https://devsecops-trilha-gustavo-almeida.onrender.com/health)) |
| **Pipeline** | [`.github/workflows/devsecops-pipeline.yml`](../.github/workflows/devsecops-pipeline.yml) · [execuções](https://github.com/gustakakkoii/devsecops-trilha-gustavo-almeida/actions) |
| **Roteiro da demonstração ao vivo** | [`roteiro-apresentacao.md`](roteiro-apresentacao.md) |
| **Detalhes de cada bloco** | [Bloco 1](../bloco1/README.md) · [Bloco 2](../bloco2/README.md) · [Bloco 3](../bloco3/README.md) · [Relatório PDF](../bloco3/relatorio-viabilidade.pdf) |

---

## 1. Visão geral da pipeline

A cada `push` ou `pull request` na `main`, o GitHub Actions executa a pipeline abaixo. Os quatro primeiros jobs rodam **em paralelo**. O deploy só começa se **todos** passarem e só acontece a partir da `main`.

```
push / PR na main
   │
   ├─► Build & smoke test ──── npm ci · docker build · sobe o container e testa GET /health
   ├─► SAST · Semgrep ──────── falha se houver achado ERROR ou WARNING no código
   ├─► SCA & Container · Trivy ─ falha se dependências/imagem tiverem CVE HIGH/CRITICAL com correção
   └─► Segredos · Gitleaks ─── falha se houver credencial no código atual ou em qualquer commit
            │
            ▼  needs: [os 4 jobs]  (qualquer falha → deploy "skipped")
   Deploy · Render ─────────── Deploy Hook com ref=<SHA> → espera /health responder com esse SHA
            │
            ▼
   https://devsecops-trilha-gustavo-almeida.onrender.com
```

| Job | Ferramenta | Critério de bloqueio | Tempo típico |
| :--- | :--- | :--- | :--- |
| Build & smoke test | Node 24, Docker | `npm ci` falhar, imagem não buildar ou `/health` não responder | ~20 s |
| SAST · Semgrep | Semgrep 1.179.0 (`p/default`) | achado de severidade ERROR ou WARNING | ~20 s |
| SCA & Container · Trivy | Trivy 0.75.0 | vulnerabilidade HIGH/CRITICAL **com correção disponível** nas dependências ou na imagem; misconfiguração HIGH/CRITICAL no Dockerfile | ~30 s |
| Segredos · Gitleaks | Gitleaks 8.30.1 | **qualquer** segredo, no código atual ou no histórico | ~10 s |
| Deploy · Render | Render Deploy Hook | o Render recusar o deploy ou a versão nova não responder em 20 min | ~1–3 min |

**Como a pipeline reage a um achado crítico:** a ferramenta termina com *exit code* 1 → o passo falha → o job falha → o commit/PR recebe um check **vermelho**. O job de deploy tem `needs:` com todos os gates, então fica **skipped** e nada vai para produção. Com a regra de proteção da `main` exigindo os checks, o botão de merge do PR fica bloqueado. Além disso, cada achado vira uma **anotação** com arquivo e linha e entra numa tabela no resumo da execução.

## 2. O que cada gate verifica e por que foi configurado assim

### Semgrep (SAST)
- **Verifica:** o código-fonte, sem executá-lo. Faz o parse para uma árvore sintática e aplica regras (inclusive *taint*: dado do usuário → função perigosa sem sanitização). Cobre JavaScript, Dockerfile e o próprio YAML do GitHub Actions.
- **Configuração:** `semgrep scan --config p/default --severity ERROR --severity WARNING --error`.
  - `p/default`: ruleset curado e mantido pela Semgrep, amplo e com pouco ruído.
  - ERROR **e** WARNING bloqueiam, porque o path traversal (que vazava credenciais) veio como WARNING. INFO não bloqueia, para evitar ruído (ex.: sugestão de CSRF, que não se aplica a uma API JSON sem cookies).
  - `--error` é o que transforma o scan em gate (exit code 1 com achados).
  - Versão fixa: o mesmo commit dá o mesmo resultado.

### Trivy (SCA + container + misconfiguração)
- **Verifica:** (1) o `package-lock.json`, versão por versão, contra as bases de CVEs (NVD, GitHub Advisories, trackers das distribuições); (2) os pacotes do sistema operacional e as bibliotecas **dentro da imagem Docker** buildada no job; (3) más práticas no `Dockerfile`.
- **Configuração:** `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`.
  - HIGH entra no gate porque as CVEs das dependências do app eram HIGH (ex.: injeção de comando no lodash).
  - `--ignore-unfixed` faz o gate bloquear só quando **existe correção** (há uma ação possível). As sem correção continuam no relatório completo, que roda sem esse filtro.
  - O binário é instalado do release oficial com **SHA-256 conferido**, e não pela `trivy-action`, que foi comprometida num ataque de supply chain em março/2026.

### Gitleaks (segredos)
- **Verifica:** credenciais (chaves de nuvem, tokens, chaves privadas, senhas) por regex + palavras-chave + entropia, em duas varreduras: `gitleaks dir .` (arquivos atuais) e `gitleaks git .` (o patch de **todos os commits de todas as branches**, `git log --all`).
- **Configuração:**
  - `fetch-depth: 0` no checkout, sem o qual não há histórico para varrer.
  - `--redact`, porque o log é público e o valor do segredo não pode aparecer nele.
  - `.gitleaks.toml` estende as regras padrão com a regra `hardcoded-credential-assignment`. As regras padrão não detectaram as credenciais do código-base: a chave AWS era a de exemplo da documentação, que o Gitleaks ignora de propósito, e o JWT secret era uma frase de baixa entropia.
  - `.gitleaksignore` registra, por *fingerprint*, os achados antigos já tratados por remoção e rotação.

### Segurança da própria pipeline
Actions fixadas por **SHA de commit**, ferramentas em **versão fixa com checksum**, `GITHUB_TOKEN` **somente leitura** (`permissions: contents: read`), `persist-credentials: false`, gatilho `pull_request` (e não `pull_request_target`), e a URL do Deploy Hook guardada em **GitHub Secret**.

## 3. Vulnerabilidades encontradas e como foram corrigidas

Todas foram confirmadas antes da correção com uma prova de conceito no meu próprio container local.

| # | Ferramenta | Vulnerabilidade | Onde | Impacto comprovado | Correção | Commit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Semgrep | Eval injection (CWE-95) | `tasks.js` `?expr=` | `process.exit(0)` derrubou o servidor (RCE) | `eval` removido; filtro por allowlist de campos (`done`, `owner`, `q`) | `c5a3749` |
| 2 | Semgrep | Injeção de comando (CWE-78) | `network.js` `exec("ping " + host)` | `;id` → `uid=0(root)` | Sem shell: `dns.lookup` nativo + validação do host | `c5a3749` |
| 3 | Semgrep | Path traversal (CWE-22) | `files.js` `path.join` | Leitura do `config.js` com credenciais | `sanitizeFilename` (basename + allowlist) + checagem de prefixo | `c5a3749` |
| 4 | Semgrep | Container como root (CWE-250) | `Dockerfile` sem `USER` | Processo do app com uid 0 | `USER node` (depois `nonroot` na distroless) | `c5a3749` |
| 5 | Revisão manual | Mass assignment (CWE-915), **falso negativo do SAST** | `tasks.js` PATCH | Trocava o `id` da tarefa | PATCH aceita só `title`, `done`, `owner` | `c5a3749` |
| 6 | Trivy | 5 CVEs HIGH em dependências | `lodash 4.17.15`, `jsonwebtoken 8.5.1` | CVE-2021-23337, CVE-2026-4800, CVE-2022-23539... | `lodash 4.18.1`, `jsonwebtoken 9.0.3` | `dcdaccf` |
| 7 | Trivy | Imagem base sem suporte: 23 CRITICAL + 577 HIGH | `node:14` (Debian 10) | Ex.: CVE-2024-32002 (git), CVE-2023-38408 (openssh) | Multi-stage + `distroless/nodejs24-debian13:nonroot` (1,37 GB → 226 MB, 0 HIGH/CRITICAL) | `aea8f90` |
| 8 | Gitleaks | Credenciais em texto puro (JWT secret + chaves AWS) | `config.js`, commit `7bf5c58` | Qualquer pessoa com o repositório lê as credenciais | Removidas do código → variável de ambiente no Render (secret manager); JWT secret rotacionado; histórico registrado no `.gitleaksignore` | `68b9ddf` |

Ciclos vermelho → verde: **Bloco 2** execuções #1 ❌ → #2 ✅ · **Bloco 3** execuções #4 ❌ (deploy pulado) → #5 ✅ (deploy).

## 4. Como o deploy automático no Render foi configurado

| Configuração | Valor |
| :--- | :--- |
| Serviço | Web Service, plano **Free**, conectado ao repositório, branch `main` |
| Build | **Docker**, Root Directory `app` (usa o `app/Dockerfile`) |
| Health Check Path | `/health` |
| Auto-Deploy | **Off**: quem dispara é a pipeline, só depois dos gates |
| Variáveis | `JWT_SECRET` gerado pelo Render (secret manager) |
| Integração | URL do Deploy Hook no secret `RENDER_DEPLOY_HOOK_URL` do GitHub |

**Fluxo:** push na `main` → gates verdes → job `deploy` faz `POST <deploy hook>&ref=<SHA>`. O `ref` garante que vai para produção **exatamente o commit aprovado**. O Render builda a imagem a partir do Dockerfile e só troca a versão quando o `/health` responde. O job então consulta `/health` até ele devolver `"commit": "<SHA>"` (variável `RENDER_GIT_COMMIT`, definida pelo Render) e só então fica verde. O GitHub registra o deploy no ambiente `production`.

**Por que Auto-Deploy Off:** no modo padrão (*On Commit*) o Render publicaria **no momento do push**, sem esperar os gates. O modo *After CI Checks Pass* seria uma alternativa válida. Preferi o deploy como **estágio explícito da pipeline**, com `needs:`, `ref` do SHA aprovado e verificação pós-deploy. Continua 100% automático: nenhum humano aperta botão.

**Plano Free:** o serviço **hiberna após 15 min sem tráfego**, e a primeira requisição depois disso leva **cerca de 1 min** (*cold start*). Isso é esperado, não é falha. O sistema de arquivos é efêmero: as tarefas ficam em memória e reiniciam a cada deploy.

## 5. Limitações conhecidas e próximos passos

- **DAST** ainda não está na pipeline. O próximo passo seria um *OWASP ZAP baseline scan* contra a URL publicada.
- A imagem escaneada no CI é **equivalente**, e não idêntica, à que o Render builda. Melhoria: publicar a imagem escaneada num registry e fazer o Render rodar essa imagem.
- Enviar os resultados em **SARIF** para o GitHub Code Scanning (aba *Security*).
- Automatizar atualização de dependências e de versões das ferramentas (Dependabot/Renovate), sempre passando pelos gates.
- Gitleaks também como *pre-commit hook*, para barrar o segredo antes mesmo do commit (ainda mais *shift-left*).
