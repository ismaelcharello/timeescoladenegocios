# TIME Escola de Negócios

## Guia de demonstração para sócios

**Versão:** demonstração do MVP  
**Objetivo:** apresentar a TIME como uma plataforma de conhecimento, conexões e experiências para empresários.

---

## 1. O que a plataforma entrega

O MVP organiza a experiência do membro em quatro frentes:

1. **Conhecimento** — cursos e aulas publicadas pela TIME.
2. **Conexões** — diretório de empresários e busca por necessidade.
3. **Comunidade** — avisos e publicações entre membros.
4. **Eventos** — agenda e inscrições.

O produto não depende de uma conta do ChatGPT para o membro entrar. A autenticação, os perfis e as permissões são controlados pela própria plataforma.

---

## 2. Roteiro sugerido para a demonstração

### A. Página inicial pública

1. Abra a landing da TIME.
2. Explique a proposta: **conhecimento que gera conexões; conexões que geram negócios**.
3. Mostre os atalhos de criar conta e entrar.
4. Mostre a opção de adicionar a TIME à tela inicial do celular.

### B. Entrada e perfil

1. Entre com a conta de demonstração administrativa.
2. Mostre que o acesso inicial é simples.
3. Abra o cadastro de perfil e explique a nota de completude de 0 a 100.
4. Mostre que dados profissionais mais completos melhoram a presença no diretório e as futuras recomendações.

### C. Início da área de membros

1. Mostre a saudação e o progresso real do aluno.
2. Mostre os próximos passos: aprender, aplicar e compartilhar.
3. Mostre o botão **Leve a TIME com você**, que orienta a instalação como aplicativo web.

### D. Cursos

1. Abra **Cursos** na barra inferior.
2. Mostre os filtros e os conteúdos que estiverem publicados.
3. Quando ainda não houver curso publicado, apresente a biblioteca visual **Em breve**.
4. Explique que essas prévias não inventam professores, datas ou cursos: a estrutura está pronta para a equipe publicar os conteúdos reais.
5. Quando houver uma aula real publicada, mostre o player, a marcação de conclusão e o progresso persistido.

### E. Conexões e diretório

1. Abra **Conexões**.
2. Descreva uma necessidade, por exemplo: “preciso de um profissional de tráfego pago para clínica”.
3. Explique que os resultados são buscados somente entre perfis reais e visíveis da TIME.
4. Abra um perfil e use o botão de contato pelo WhatsApp.
5. Mostre o diretório de membros e os filtros por informação profissional quando houver perfis preenchidos.

### F. Comunidade

1. Abra **Comunidade**.
2. Mostre o campo de publicação e o aviso oficial já existente, se houver.
3. Crie uma publicação de demonstração somente se ela puder permanecer no ambiente.
4. Explique que a comunidade é um espaço interno para aprendizados, dúvidas e oportunidades — não uma rede social aberta.

### G. Eventos

1. Abra **Eventos**.
2. Mostre os eventos publicados, suas informações e inscrição.
3. Explique que o administrador cria e acompanha os inscritos no painel.

### H. Administração

1. No menu **Mais**, abra **Painel administrativo**.
2. Mostre as áreas de gestão de membros, cursos, aulas, eventos, inscrições e configurações disponíveis no painel.
3. Explique que o acesso administrativo é determinado por papel no banco de dados, e não por um e-mail digitado no navegador.

---

## 3. Funcionalidades demonstráveis hoje

| Área | O que pode ser mostrado |
| --- | --- |
| Landing | proposta da TIME, entrada, criação de conta e instalação PWA |
| Área do membro | tema claro/escuro, início, progresso e navegação mobile |
| Perfil | preenchimento progressivo e nota de completude |
| Conexões | diretório, busca por necessidade, perfil e contato no WhatsApp |
| Comunidade | publicações e avisos carregados pela plataforma |
| Cursos | catálogo, estrutura de curso/aula e progresso quando houver conteúdo publicado |
| Eventos | agenda, páginas de evento e inscrições quando houver eventos publicados |
| Administração | acesso protegido por papel administrativo |

---

## 4. Limites honestos do MVP atual

- A seção **Em breve** é uma prévia de organização. Não representa cursos, professores, datas ou materiais confirmados.
- O aplicativo é uma **PWA instalável**, não um aplicativo nativo publicado na App Store ou Play Store.
- No iPhone, a instalação é feita no Safari: **Compartilhar → Adicionar à Tela de Início**.
- A qualidade das recomendações depende de perfis empresariais completos e reais cadastrados na comunidade.
- Recursos futuros, como gamificação completa, chat interno, lives e Tutor IA com base completa de conteúdos, devem ser comunicados como evolução — não como funcionalidades já entregues.

---

## 5. Gestão de conteúdo pela TIME

### Cursos

1. Subir o vídeo individual ao canal oficial da TIME como **não listado** (recomendado) ou ao Vimeo/Panda.
2. No painel administrativo, criar o curso e usar **Link externo da aula**.
3. Colar o link individual do YouTube, Vimeo ou Panda, adicionar os metadados e publicar.
4. A TIME não recebe nem armazena o arquivo de vídeo: ela apenas incorpora o player do provedor escolhido. As capas continuam sendo enviadas para o armazenamento da TIME.

### Hospedagem de vídeo: decisão técnica

- **YouTube não listado** é a opção padrão para o lançamento: simples de administrar e incorporado dentro da aula, sem direcionar o membro ao canal.
- **Vimeo e Panda** também são aceitos para vídeos cujo controle de marca, privacidade ou distribuição exija outro provedor.
- Links de vídeo passam por validação no servidor; somente URLs HTTPS dos provedores permitidos são aceitas.
- A TIME não aceita upload de MP4, MOV ou WebM pelo painel. Isso reduz custo de armazenamento e torna a operação de conteúdo mais leve.

### Eventos

1. Criar o evento a partir do modelo administrativo.
2. Preencher informações reais: data, horário, local, descrição e atendimento.
3. Abrir ou encerrar inscrições conforme a operação.
4. Acompanhar os inscritos pelo painel.

### Membros

1. Revisar a completude de perfil.
2. Ativar ou desativar perfis conforme a política da TIME.
3. Manter WhatsApp e informações públicas sob consentimento do membro.

---

## 6. Próximas prioridades após a apresentação

1. Cadastrar os primeiros cursos, professores e vídeos reais.
2. Completar os primeiros perfis empresariais reais.
3. Cadastrar o calendário oficial de eventos.
4. Validar o fluxo de recomendação com membros reais.
5. Fazer uma rodada final de acessibilidade e responsividade com aparelhos reais.
6. Evoluir o Tutor TIME IA somente com materiais autorizados e citações de fonte.

---

## 7. Checklist antes de apresentar

- [ ] Entrar com a conta administrativa de demonstração.
- [ ] Confirmar que o perfil administrativo está completo.
- [ ] Verificar se há ao menos um aviso de comunidade adequado para exibição.
- [ ] Conferir se os eventos e cursos que serão mostrados possuem dados reais e revisados.
- [ ] Abrir a plataforma no Safari do iPhone e testar a navegação inferior.
- [ ] Mostrar a instalação PWA apenas como “Adicionar à Tela de Início”.
- [ ] Não prometer recursos futuros como se já estivessem prontos.
