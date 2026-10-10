# Onboarding SACI 2026.2 - DevSecOps

## Dados do Candidato
* **Nome:** Gustavo Costa Almeida
* **Curso:** Ciência da Computação
* **Trilha:** DevSecOps

---

## Desafio Técnico Inicial

### Pergunta:
Trilha: DevSecOps
Pergunta Rápida: Escreva uma breve explicação (COM SUAS PALAVRAS) sobre o que são SAST, DAST, SCA e como cada um deles ajuda no desenvolvimento seguro.

### Resposta:
**SAST (Static Application Security Testing)** é a análise do código-fonte *sem executar o programa*. A ferramenta lê o código como um revisor automático e procura padrões perigosos, por exemplo um dado vindo do usuário que chega direto num `eval()`, numa query SQL montada por concatenação ou num comando do sistema operacional. Como pode rodar no editor e a cada commit, ela pega o erro logo depois que ele é escrito, quando corrigir é mais barato, e aponta o arquivo e a linha exatos. Exemplo: Semgrep.

**DAST (Dynamic Application Security Testing)** testa a aplicação *rodando*, de fora para dentro, do jeito que um atacante faria: manda requisições maliciosas (injeções, parâmetros adulterados, rotas escondidas) e observa as respostas. Não precisa do código-fonte, então encontra falhas que só aparecem com tudo funcionando junto, como configuração errada do servidor, autenticação fraca e cabeçalhos de segurança ausentes. Em compensação, roda mais tarde no ciclo e não diz em que linha está o problema. Exemplo: OWASP ZAP.

**SCA (Software Composition Analysis)** analisa o código *de terceiros* que o projeto usa: bibliotecas, pacotes do `package.json` e até os pacotes do sistema dentro da imagem Docker. Ela compara as versões usadas com bases públicas de vulnerabilidades (CVEs) e avisa quando uma dependência tem uma falha conhecida e qual versão corrige. Como a maior parte de um software moderno vem de terceiros, sem SCA a gente herdaria essas falhas sem saber. Exemplos: Trivy, Dependabot.

Os três se complementam: o SAST olha **o nosso código**, o SCA olha **o código dos outros que usamos** e o DAST olha **a aplicação em execução**. Colocando SAST e SCA como gates automáticos na pipeline de CI/CD (*shift-left*) e o DAST num ambiente de testes, as vulnerabilidades são barradas antes de chegar em produção.
