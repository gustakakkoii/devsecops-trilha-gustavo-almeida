# Aplicação publicada no Render

**URL:** https://devsecops-trilha-gustavo-almeida.onrender.com

| Teste rápido | URL |
| :--- | :--- |
| Healthcheck (mostra o commit publicado) | https://devsecops-trilha-gustavo-almeida.onrender.com/health |
| Lista de endpoints | https://devsecops-trilha-gustavo-almeida.onrender.com/ |
| Tarefas | https://devsecops-trilha-gustavo-almeida.onrender.com/api/tasks |
| Filtro | https://devsecops-trilha-gustavo-almeida.onrender.com/api/tasks/filter?done=true |

> **Plano Free do Render:** o serviço **hiberna após 15 minutos sem receber requisições**. A primeira
> requisição depois disso demora cerca de **1 minuto** para responder, porque o Render precisa subir o
> container de novo (*cold start*). Isso é esperado e não indica falha. As requisições seguintes
> respondem normalmente.
