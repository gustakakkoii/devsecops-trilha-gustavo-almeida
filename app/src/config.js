// Configuração da aplicação, lida de variáveis de ambiente.
//
// Correção (Gitleaks): as credenciais (JWT secret e chaves AWS) estavam
// escritas direto neste arquivo, ou seja, versionadas no Git e visíveis para
// qualquer um com acesso ao repositório. Agora:
//   - o valor real fica fora do código: em produção, nas Environment Variables
//     do Render (que fazem o papel de secret manager); localmente, num arquivo
//     .env que o .gitignore impede de versionar (modelo em .env.example);
//   - as chaves AWS foram removidas, porque a aplicação não usa AWS;
//   - o JWT secret antigo foi considerado vazado e substituído (rotacionado)
//     por um valor novo gerado no Render.
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
};
