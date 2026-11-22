# 🎀 Sistema Web de Pedidos e Agendamentos de Laços Artesanais

![Status](https://img.shields.io/badge/status-Em%20desenvolvimento-yellow)
![Versão](https://img.shields.io/badge/vers%C3%A3o-0.1.0-blue)
![Idioma](https://img.shields.io/badge/idioma-Portugu%C3%AAs-green)
![Projeto](https://img.shields.io/badge/tipo-MVP-purple)

## 📌 1. Sobre o projeto

O projeto consiste no desenvolvimento de um sistema web para gerenciamento de pedidos, personalização de produtos e agendamento de retiradas de laços artesanais e acessórios de cabelo.

A aplicação tem como objetivo digitalizar e simplificar o processo de compra, proporcionando aos clientes uma experiência intuitiva, rápida e organizada, enquanto oferece à artesã maior controle sobre os produtos, encomendas e horários de atendimento.

A solução será desenvolvida inicialmente como um **MVP (Minimum Viable Product)**, priorizando as funcionalidades essenciais para validar o produto e atender às necessidades dos usuários.

## Configuração do aplicativo

O aplicativo usa o Supabase Auth e o banco de dados Supabase para autenticação, catálogo e pedidos.

1. Crie um projeto Supabase e execute, em ordem, os arquivos SQL de `supabase/migrations/` no SQL Editor. Se o schema antigo já tiver sido aplicado, revise no painel os produtos demonstrativos que ele possa ter inserido; esta refatoração não apaga dados existentes.
2. Crie o arquivo `.env.local` na raiz com as variáveis públicas do projeto:

   ```dotenv
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica
   VITE_SELLER_WHATSAPP=
   ```

   Preencha `VITE_SELLER_WHATSAPP` com o número internacional da vendedora, somente dígitos, incluindo código do país e DDD. Sem essa configuração, o checkout informa que não está disponível.
3. Configure no Supabase Auth a URL do aplicativo e as URLs de redirecionamento para desenvolvimento e produção. Configure o envio de e-mails para que recuperação de senha funcione. A migração cria a tabela de opções de produtos e o bucket público de imagens; o upload e a gestão ficam protegidos por RLS.
4. Crie a conta administrativa uma única vez. No PowerShell, defina `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL` e `ADMIN_INITIAL_PASSWORD` no ambiente local e execute `npm run bootstrap:admin`. Use a senha inicial solicitada pela administração. A chave `SUPABASE_SERVICE_ROLE_KEY` é secreta: nunca use uma variável `VITE_` para ela nem a compartilhe.
5. A conta administrativa será identificada no aplicativo como **TasianeM** e deverá trocar a senha no primeiro acesso. Para entrar, use o e-mail associado à conta.

Clientes navegam e compram sem conta. O acesso administrativo é exclusivo, validado pelo perfil no Supabase Auth e pelas políticas RLS; não há cadastro público. A finalização registra o pedido e abre o WhatsApp em outra aba. Na tela de pedidos, a administração confirma manualmente os pagamentos recebidos; a loja consulta essa confirmação e remove somente os itens daquele pedido do carrinho. Itens enviados não podem ser alterados enquanto aguardam pagamento; se o pedido for cancelado, voltam a ficar editáveis.

O acompanhamento do carrinho depende do armazenamento local do mesmo navegador e dispositivo. Ao limpar os dados do site, esse acompanhamento é perdido, mas os pedidos permanecem no histórico administrativo. Caso o envio ao WhatsApp falhe, use a opção de reabrir a mensagem no carrinho; o mesmo pedido não será duplicado.

Para instalações existentes, execute a nova migração `20261121220000_guest_orders_and_product_gallery.sql` no SQL Editor antes de usar esses recursos. Ela preserva os produtos e pedidos existentes, adiciona a galeria de fotos e permite registrar pedidos de visitantes sem abrir a leitura dos pedidos para o público. A administração pode adicionar ou remover fotos ao editar um produto; a primeira foto é a capa.

## 🎯 2. Objetivos do projeto

- Disponibilizar um catálogo digital de produtos artesanais.
- Permitir a personalização de laços conforme as opções disponíveis.
- Facilitar a criação e o gerenciamento de pedidos.
- Disponibilizar agendamento de retirada de encomendas.
- Permitir o acompanhamento da situação dos pedidos.
- Notificar clientes sobre novos modelos disponíveis.
- Reduzir a dependência de atendimento manual pelo WhatsApp.
- Melhorar a organização operacional do pequeno negócio.

## 👥 3. Público-alvo

O sistema é direcionado principalmente a consumidores de produtos artesanais, especialmente mães, responsáveis por crianças e pessoas interessadas em acessórios personalizados.

### Persona 01 — Mariana Oliveira

- Idade: 29 anos.
- Profissão: Professora.
- Cidade: Lages - SC.
- Familiaridade tecnológica: Alta.
- Perfil: Mãe que compra laços personalizados para a filha.

**Principais necessidades:**
- Encontrar produtos facilmente.
- Visualizar modelos, cores e preços.
- Personalizar os produtos.
- Agendar retiradas sem depender de conversas.
- Receber novidades sobre novos modelos.

### Persona 02 — Patrícia Fernandes

- Idade: 42 anos.
- Profissão: Comerciante.
- Cidade: Curitiba - PR.
- Familiaridade tecnológica: Média.
- Perfil: Compradora que valoriza organização e pontualidade.

**Principais necessidades:**
- Consultar informações dos pedidos.
- Receber confirmações.
- Consultar datas de entrega e retirada.
- Ter acesso ao histórico de encomendas.

### Persona 03 — Camila Rodrigues

- Idade: 21 anos.
- Profissão: Estudante universitária.
- Cidade: Florianópolis - SC.
- Familiaridade tecnológica: Muito alta.
- Perfil: Consumidora de acessórios personalizados e tendências de moda.

**Principais necessidades:**
- Navegar por um catálogo visual.
- Personalizar produtos rapidamente.
- Conhecer novidades.
- Realizar pedidos pelo celular.

## ⚙️ 4. Requisitos funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RF01 | Catálogo de produtos | Exibir produtos com fotos, descrições, modelos e preços. |
| RF02 | Personalização | Permitir selecionar cores, tamanhos e quantidades. |
| RF03 | Cadastro de pedidos | Registrar pedidos com os produtos e personalizações escolhidos. |
| RF04 | Agendamento | Permitir selecionar datas e horários disponíveis para retirada. |
| RF05 | Consulta de pedidos | Permitir consultar pedidos, confirmações e respectivos status. |
| RF06 | Notificações | Notificar clientes inscritos sobre novos modelos disponíveis. |

## 🔒 5. Requisitos não funcionais

| ID | Requisito | Descrição |
|---|---|---|
| RNF01 | Usabilidade | Interface intuitiva, responsiva e adaptada para dispositivos móveis. |
| RNF02 | Desempenho | Carregamento das páginas principais em até 3 segundos em condições normais de conexão. |
| RNF03 | Segurança | Proteção dos dados pessoais, autenticação segura e conformidade com a LGPD. |
| RNF04 | Disponibilidade | Disponibilidade mínima de 99% ao mês, exceto manutenções programadas. |

## 📖 6. Histórias de usuário

### US01 — Visualizar e personalizar produtos

**Prioridade: MUST HAVE**

Como cliente, quero visualizar o catálogo de laços artesanais e personalizar os modelos disponíveis, para escolher produtos que atendam às minhas preferências e necessidades.

**Critérios de aceitação:**

- AC01: Exibir catálogo com fotos, nomes, descrições e preços.
- AC02: Permitir visualizar os detalhes de cada produto.
- AC03: Permitir selecionar cores e tamanhos disponíveis.
- AC04: Permitir informar a quantidade desejada.
- AC05: Exibir resumo das escolhas e valor correspondente.

### US02 — Realizar pedido e agendar retirada

**Prioridade: MUST HAVE**

Como cliente, quero realizar meus pedidos e selecionar uma data e horário disponíveis para retirada, para organizar minhas compras sem precisar negociar manualmente pelo WhatsApp.

**Critérios de aceitação:**

- AC01: Permitir adicionar produtos personalizados ao pedido.
- AC02: Apresentar resumo dos produtos, quantidades e valores.
- AC03: Disponibilizar datas e horários para retirada.
- AC04: Impedir solicitações para horários indisponíveis.
- AC05: Gerar identificação do pedido após sua solicitação.
- AC06: Informar quando o pedido for confirmado ou recusado.

### US03 — Receber novidades de produtos

**Prioridade: SHOULD HAVE**

Como cliente, quero receber notificações quando novos modelos de laços forem disponibilizados para venda, para conhecer as novidades e ter a oportunidade de realizar novos pedidos.

**Critérios de aceitação:**

- AC01: Permitir habilitar ou desabilitar notificações.
- AC02: Gerar notificações quando novos produtos forem publicados.
- AC03: Apresentar nome e imagem do novo produto.
- AC04: Permitir acessar diretamente o produto no catálogo.
- AC05: Respeitar a preferência de recebimento de cada cliente.

## 📊 7. Priorização MoSCoW

| Prioridade | Funcionalidade | Classificação |
|---|---|---|
| Catálogo de produtos | RF01 | MUST HAVE |
| Personalização | RF02 | MUST HAVE |
| Cadastro de pedidos | RF03 | MUST HAVE |
| Agendamento de retirada | RF04 | MUST HAVE |
| Consulta de pedidos | RF05 | SHOULD HAVE |
| Notificações de novidades | RF06 | SHOULD HAVE |

**Legenda:**

- MUST HAVE: indispensável para o funcionamento do MVP.
- SHOULD HAVE: importante, mas pode ser implementado em uma segunda entrega.
- COULD HAVE: desejável, caso exista tempo e orçamento.
- WON'T HAVE: fora do escopo da versão atual.

## 🧭 8. Fluxo principal da aplicação

O fluxo principal de utilização será:

1. Cliente acessa o sistema.
2. Cliente visualiza o catálogo.
3. Cliente seleciona um produto.
4. Cliente escolhe as opções de personalização.
5. Cliente informa a quantidade desejada.
6. Sistema apresenta o resumo do pedido.
7. Cliente seleciona uma data e horário disponíveis.
8. Cliente envia a solicitação.
9. Sistema registra o pedido.
10. Artesã analisa e confirma ou recusa a solicitação.
11. Cliente acompanha a situação do pedido.

## 🏗️ 9. Estrutura funcional prevista

O sistema será dividido em duas áreas principais.

### Área do cliente

- Página inicial.
- Catálogo de produtos.
- Detalhes dos produtos.
- Personalização de produtos.
- Carrinho ou resumo do pedido.
- Agendamento de retirada.
- Histórico de pedidos.
- Consulta de status.
- Preferências de notificações.
- Cadastro e autenticação de usuários.

### Área administrativa

- Dashboard administrativo.
- Cadastro, edição e exclusão de produtos.
- Gerenciamento de categorias.
- Gerenciamento de cores e tamanhos.
- Gerenciamento de pedidos.
- Confirmação e recusa de solicitações.
- Gerenciamento de disponibilidade de horários.
- Consulta de clientes.
- Publicação de novos modelos.

**Observação:** a área administrativa é necessária para viabilizar a operação do negócio e deverá ser detalhada durante a especificação técnica.

## 🗃️ 10. Entidades principais do domínio

A modelagem inicial deverá considerar as seguintes entidades:

| Entidade | Responsabilidade |
|---|---|
| Usuario | Armazenar informações dos clientes e administradores. |
| Produto | Armazenar os dados dos laços disponíveis. |
| Categoria | Organizar os produtos por categoria. |
| Personalizacao | Registrar opções de personalização. |
| Pedido | Representar uma solicitação de compra. |
| ItemPedido | Registrar os produtos e quantidades de cada pedido. |
| Agendamento | Armazenar data, horário e situação da retirada. |
| Notificacao | Registrar notificações destinadas aos clientes. |

A estrutura poderá ser refinada durante a modelagem do banco de dados, respeitando normalização, integridade referencial e regras de negócio.

## 🔐 11. Segurança e privacidade

O desenvolvimento deverá considerar:

- Autenticação segura de usuários.
- Armazenamento de senhas utilizando algoritmos apropriados de hash.
- Controle de acesso baseado em perfis e permissões.
- Validação dos dados no frontend e backend.
- Proteção contra SQL Injection.
- Proteção contra XSS e CSRF, conforme a arquitetura adotada.
- Comunicação protegida por HTTPS em produção.
- Tratamento adequado de erros e exceções.
- Proteção de informações pessoais conforme a LGPD.
- Registro de operações administrativas relevantes.

## 📱 12. Diretrizes de UX/UI

A experiência do usuário deverá priorizar simplicidade, clareza e facilidade de navegação.

Diretrizes:

- Design responsivo com prioridade para dispositivos móveis.
- Catálogo com imagens de boa qualidade.
- Navegação intuitiva.
- Informações de preços claramente apresentadas.
- Personalização visual e objetiva.
- Processo de pedido com poucas etapas.
- Feedback visual para ações realizadas.
- Confirmação explícita dos agendamentos.
- Identificação clara de pedidos pendentes, confirmados e recusados.

## 🧪 13. Estratégia de testes

O projeto deverá contemplar:

**Testes unitários**
- Validação de regras de negócio.
- Cálculo dos valores dos pedidos.
- Validação de personalizações.
- Validação de disponibilidade de horários.

**Testes de integração**
- Comunicação entre frontend e backend.
- Persistência de pedidos.
- Integração com banco de dados.
- Processamento de agendamentos.

**Testes funcionais**
- Cadastro e autenticação.
- Consulta de produtos.
- Personalização.
- Criação de pedidos.
- Agendamento.
- Consulta de status.

**Testes de segurança**
- Validação de autenticação e autorização.
- Verificação de permissões.
- Validação de entradas.
- Proteção de dados.

## 🚀 14. Planejamento de desenvolvimento

### Fase 1 — Estrutura inicial

- Definição da arquitetura.
- Configuração dos ambientes.
- Criação do banco de dados.
- Configuração do repositório.
- Implementação da autenticação.

### Fase 2 — Catálogo e produtos

- Cadastro de produtos.
- Cadastro de categorias.
- Exibição do catálogo.
- Implementação da personalização.

### Fase 3 — Pedidos e agendamentos

- Implementação do carrinho ou resumo do pedido.
- Cadastro de pedidos.
- Gerenciamento de horários.
- Confirmação de agendamentos.
- Consulta de pedidos.

### Fase 4 — Notificações e melhorias

- Implementação de notificações.
- Publicação de novidades.
- Preferências de comunicação.
- Melhorias de experiência do usuário.

### Fase 5 — Validação e publicação

- Testes funcionais.
- Testes de segurança.
- Correção de problemas.
- Implantação em ambiente de produção.

## 📁 15. Estrutura de diretórios sugerida

A estrutura definitiva dependerá da tecnologia escolhida.

```text
lacos-artesanais/
│
├── docs/
│   ├── requisitos/
│   ├── historias-usuario/
│   ├── diagramas/
│   └── arquitetura/
│
├── frontend/
│
├── backend/
│
├── database/
│   ├── migrations/
│   └── scripts/
│
├── tests/
│
├── .gitignore
├── README.md
└── LICENSE
```

## 🛠️ 16. Tecnologias

O MVP disponível neste repositório usa React 18, TypeScript e Vite no frontend, com Supabase Auth, Postgres/RLS e Storage no backend. O fluxo implementado inclui catálogo público, administração de produtos, personalização, carrinho e checkout pelo WhatsApp, sem cadastro para clientes ou pagamento online.

As próximas decisões e extensões deverão considerar:

- Facilidade de manutenção.
- Segurança.
- Escalabilidade.
- Desempenho.
- Separação de responsabilidades.
- Facilidade de integração.
- Disponibilidade de ferramentas e documentação.


## 📈 17. Indicadores de sucesso

O sucesso do MVP será avaliado por indicadores como:

- Tempo médio para concluir um pedido.
- Taxa de conversão de visitantes em pedidos.
- Quantidade de pedidos registrados.
- Percentual de pedidos confirmados.
- Quantidade de agendamentos realizados sem intervenção manual.
- Taxa de utilização das notificações de novidades.
- Satisfação dos clientes.

**Meta inicial de experiência:** permitir que um cliente consiga selecionar e solicitar um pedido personalizado em até 5 minutos.

## 🤝 18. Contribuição

Contribuições são bem-vindas.

Para contribuir:

1. Faça um fork do repositório.
2. Crie uma branch para sua funcionalidade.
3. Implemente as alterações.
4. Execute os testes.
5. Envie um Pull Request descrevendo as modificações.

## 📄 19. Licença

A licença do projeto será definida antes da disponibilização pública da aplicação.

---

**Projeto:** Sistema Web de Pedidos e Agendamentos de Laços Artesanais.


Link para conexão e visualização do Projeto

https://isababy-laces-manage-piv3.bolt.host

**Versão:** 0.1.0

**Status:** MVP em desenvolvimento com administração e catálogo conectados ao Supabase e finalização de pedidos pelo WhatsApp.

**Idioma:** Português (Brasil).

**Região de operação:** Brasil.

Para configurar o Supabase e executar a aplicação localmente, consulte [MANUAL.md](MANUAL.md).
