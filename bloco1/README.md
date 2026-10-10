# Bloco 1 — Fundamentos de DevSecOps & Onboarding de Git

> **Entrega oficial:** [`gustavo-almeida.md`](gustavo-almeida.md) (ficha + resposta sobre SAST, DAST e SCA).
> Este README é o meu material de estudo do bloco: explica o que foi feito e os conceitos por trás.

## 1. O que o bloco pedia e o que foi feito

| Passo da missão | Como foi feito |
| :--- | :--- |
| Criar um repositório público para as entregas | `github.com/gustakakkoii/devsecops-trilha-gustavo-almeida` |
| Clonar o repositório na máquina local | `git clone https://github.com/gustakakkoii/devsecops-trilha-gustavo-almeida.git` |
| Organizar as pastas espelhando os blocos | `app/`, `bloco1/`, `bloco2/`, `bloco3/` e `README.md` na raiz |
| Adicionar o código-base da mentoria em `app/` | API de tarefas em Node.js/Express, com `Dockerfile` |
| Copiar `Trilhas/DevSecOps/seu-nome.md` do repositório `SACI-UFLA/onboarding-2026-2` | Copiado e renomeado para `bloco1/gustavo-almeida.md` |
| Preencher com dados e com a resposta sobre SAST/DAST/SCA | Feito, com as minhas palavras |
| Commit e push | Commits pequenos, um por etapa (estrutura → código-base → ficha) |

## 2. Por que essa estrutura de repositório

- **Uma pasta por bloco** (`bloco1/`, `bloco2/`, `bloco3/`): a mentoria acompanha o progresso pela **data dos commits em cada pasta**, então cada entrega fica isolada e fácil de auditar.
- **`app/` separado**: é o *projeto-alvo*. A pipeline (Blocos 2 e 3) analisa e publica essa pasta. Separar o código da aplicação da documentação de entregas evita que um arquivo de documentação "suje" o build.
- **`.gitignore` desde o primeiro commit**: impede que `node_modules/`, arquivos `.env` (onde ficam segredos locais) e relatórios gerados entrem no repositório. Segredo que entra no Git fica no histórico para sempre (isso volta no Bloco 3, com o Gitleaks).
- **Pastas vazias com `.gitkeep`**: o Git não versiona pasta vazia, só arquivos. O `.gitkeep` é só um arquivo vazio por convenção para a pasta existir no GitHub antes de ter conteúdo.

## 3. DevSecOps e *shift-left security*

**DevOps** juntou desenvolvimento e operação: automação, entregas pequenas e frequentes, pipeline de CI/CD.
**DevSecOps** acrescenta a segurança **dentro** desse fluxo, em vez de deixá-la como uma auditoria isolada no final.

Ideias centrais:

1. **Shift-left:** mover as verificações de segurança para a "esquerda" da linha do tempo do desenvolvimento
   (planejar → codar → build → testar → deploy → operar). Quanto mais cedo uma falha é encontrada, mais barata ela é de corrigir:
   no editor custa minutos, em produção pode custar um incidente.
2. **Automação:** as checagens rodam sozinhas a cada `push`/`pull request`. Ninguém precisa "lembrar" de rodar.
3. **Gates de segurança:** uma etapa da pipeline que **falha o job** (pipeline vermelha) quando encontra algo grave, impedindo o merge/deploy.
   É o que transforma a ferramenta de "relatório que ninguém lê" em **controle**.
4. **Feedback rápido para o desenvolvedor:** o alerta aparece no próprio commit/PR, com arquivo e linha.
5. **Segurança como responsabilidade de todos**, e não só de um time de segurança no fim do projeto.

**CI/CD** em uma frase:
- **CI (Continuous Integration):** todo código enviado é automaticamente instalado, testado e analisado.
- **CD:** *Continuous Delivery* = o artefato fica sempre pronto para ir para produção; *Continuous Deployment* = ele vai para produção automaticamente se passar em tudo. No Bloco 3 a trilha faz **Continuous Deployment** (deploy automático no Render depois dos gates).

## 4. SAST, DAST e SCA (e os "primos")

| | **SAST** | **DAST** | **SCA** |
| :--- | :--- | :--- | :--- |
| O que analisa | Código-fonte **nosso** | Aplicação **rodando** | **Dependências** de terceiros (pacotes e imagem base) |
| Precisa executar o app? | Não | Sim | Não |
| Quando roda | Editor, commit, PR (bem cedo) | Ambiente de teste/homologação (mais tarde) | Commit, PR, build da imagem |
| O que encontra | Injeção (SQL, comando, `eval`), path traversal, uso inseguro de API, configs ruins no Dockerfile | Falhas de runtime: configuração do servidor, autenticação, cabeçalhos, injeções exploráveis de fato | CVEs conhecidas em bibliotecas e pacotes do SO, licenças |
| Ponto forte | Mostra arquivo e linha; barato e rápido | Poucos falsos positivos (testa o comportamento real) | Cobre o código que não escrevemos (a maior parte do software) |
| Limitação | Falsos positivos; não vê configuração de runtime | Não aponta a linha; cobre só o que consegue alcançar | Só conhece vulnerabilidades **já publicadas**; não sabe se o trecho vulnerável é usado |
| Ferramenta na trilha | **Semgrep** (Bloco 2) | — (melhoria futura: OWASP ZAP contra o Render) | **Trivy** (Bloco 3) |

Outras categorias que aparecem na trilha:

- **Secret scanning:** procura credenciais no código **e no histórico do Git** (chaves de API, tokens, senhas). Ferramenta: **Gitleaks** (Bloco 3).
- **Container scanning:** SCA aplicado à imagem Docker — verifica os pacotes do sistema operacional da imagem base e as bibliotecas instaladas nela. Ferramenta: **Trivy** (Bloco 3).
- **IaC/misconfiguration scanning:** procura configurações inseguras em `Dockerfile`, Kubernetes, Terraform (ex.: container rodando como root).
- **IAST/RASP:** instrumentação dentro da aplicação em execução (fora do escopo da trilha).

**Falso positivo × falso negativo** (pergunta clássica):
- *Falso positivo* = a ferramenta acusa algo que não é vulnerável → gera ruído e "cansaço de alerta". Tratamento: analisar e, se for o caso, suprimir **com justificativa registrada**.
- *Falso negativo* = existe vulnerabilidade e a ferramenta não acusa → é o mais perigoso, por isso se combinam várias técnicas (defesa em profundidade).

## 5. Primeiro olhar sobre o código-base (`app/`)

O próprio `package.json` avisa que o app tem vulnerabilidades plantadas para fins didáticos. Lendo o código, dá para prever qual tipo de ferramenta pega cada uma:

| Onde | O que parece errado | Quem deve detectar |
| :--- | :--- | :--- |
| `src/routes/tasks.js` | Filtro usa `eval()` com texto vindo da URL → execução de código | SAST |
| `src/routes/network.js` | `exec("ping -c 2 " + host)` → injeção de comando no shell | SAST |
| `src/routes/files.js` | `path.join(UPLOADS_DIR, nomeDoUsuario)` → `../` permite ler qualquer arquivo | SAST |
| `src/config.js` | Credenciais (JWT e AWS) escritas direto no código | Secret scanning |
| `package.json` | `lodash` e `jsonwebtoken` em versões antigas | SCA |
| `Dockerfile` | `node:14` (sem suporte desde 2023) e container rodando como root | SCA de container + SAST/misconfig |

Os Blocos 2 e 3 vão confirmar (ou não) essas suspeitas com as ferramentas, corrigir e documentar.

## 6. Git usado neste bloco

```bash
git clone https://github.com/gustakakkoii/devsecops-trilha-gustavo-almeida.git
cd devsecops-trilha-gustavo-almeida
# ...cria/edita arquivos...
git status                      # o que mudou
git add bloco1/gustavo-almeida.md
git commit -m "docs(bloco1): ..."
git push origin main
```

- **Commits pequenos e com mensagem clara** (padrão *Conventional Commits*: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`). Cada commit conta uma etapa — é exatamente o que a mentoria usa para acompanhar o progresso.
- **`git add` seletivo**: adicionar só o que faz parte daquele commit, para não versionar sem querer um `.env` ou um relatório.
- **Histórico é permanente**: tudo que já foi commitado continua acessível em commits antigos, mesmo apagado depois. Por isso segredo nunca deve entrar num commit.

## 7. Perguntas prováveis na defesa

**O que é DevSecOps, numa frase?**
Integrar segurança em todas as etapas do ciclo de desenvolvimento, de forma automatizada, em vez de deixar para uma auditoria no final.

**O que significa *shift-left*?**
Trazer a segurança para mais cedo no ciclo (para a esquerda da linha do tempo). Encontrar a falha no commit custa muito menos do que em produção.

**Qual a diferença principal entre SAST e DAST?**
O SAST lê o código sem executá-lo (caixa-branca) e aponta a linha. O DAST ataca a aplicação rodando (caixa-preta) e vê o comportamento real, mas não diz onde está o erro no código.

**Se eu já tenho SAST, por que preciso de SCA?**
Porque o SAST analisa o código que eu escrevi, e a maior parte da aplicação é código de terceiros (`node_modules`, imagem base). Uma versão vulnerável do `lodash` não aparece no meu código: aparece no `package-lock.json`.

**O que é um "gate" de segurança?**
Uma etapa da pipeline configurada para **falhar** quando encontra um achado acima de um limite de severidade. A pipeline fica vermelha e o merge/deploy é bloqueado até a correção.

**Por que a pipeline não deve depender de alguém rodar a ferramenta manualmente?**
Porque o que é manual é esquecido. Automatizado, toda mudança passa pela mesma verificação, sempre.

**O que é um falso positivo e como tratar?**
Um alerta que não representa risco real. Analisa-se o caso e, se confirmado, suprime-se com justificativa registrada (por exemplo, um comentário `nosemgrep` explicando o motivo), nunca desligando a regra inteira "no escuro".
