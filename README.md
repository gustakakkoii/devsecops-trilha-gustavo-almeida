# devsecops-trilha-gustavo-almeida

Repositório de entregas da **Trilha de DevSecOps — Onboarding SACI/UFLA 2026.2**.

Ao longo da trilha este repositório evolui de um código-base vulnerável até uma
**pipeline de CI/CD segura de ponta a ponta**: análise estática (SAST), análise de
dependências e de container (SCA), detecção de segredos e deploy automático —
tudo rodando a cada `push`, no espírito de *shift-left security*.

## Estrutura

| Pasta | Conteúdo | Bloco |
| :--- | :--- | :--- |
| [`app/`](app/) | Código-base fornecido pela mentoria (API de tarefas em Node.js + Express, com `Dockerfile`). É o projeto-alvo dos Blocos 2 e 3. | 1 → 3 |
| [`bloco1/`](bloco1/) | Ficha do candidato + explicação de SAST, DAST e SCA. | 1 |
| [`bloco2/`](bloco2/) | Pipeline do GitHub Actions com gate de SAST (Semgrep) + prints da pipeline falhando e passando. | 2 |
| [`bloco3/`](bloco3/) | Pipeline evoluída (Semgrep + Trivy + Gitleaks + deploy no Render), relatório em PDF, link da aplicação e prints. | 3 |

Cada pasta de bloco tem um `README.md` explicando **o que foi feito, por quê e como funciona** —
é o material de estudo para a defesa oral.

## Cronograma da trilha

| Bloco | Semanas | Tema |
| :--- | :--- | :--- |
| 1 | 1 e 2 | Fundamentos de DevSecOps e onboarding de Git |
| 2 | 3 e 4 | Pipeline segura no GitHub Actions + SAST com Semgrep |
| 3 | 5 e 6 | SCA e container (Trivy), segredos (Gitleaks) e deploy automático (Render) |
| 4 | 7 e 8 | Desafio final: demonstração ao vivo e defesa técnica |
