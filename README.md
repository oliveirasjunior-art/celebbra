# Celebbra — Site + Sistema de Agendamento (pronto para Vercel)

Este pacote contém:

- `index.html` e páginas institucionais (`sobre.html`, `termos.html`, `privacidade.html`, `cancelamento.html`) — o site completo, publicado como arquivos estáticos.
- `assets/estilo.css` — estilo visual compartilhado por todas as páginas (edite aqui para mudar cor/fonte em todo o site de uma vez).
- `imagens/` — pasta onde entram as fotos reais dos produtos.
- `api/` — funções serverless (a "API") que conectam o site ao Google Sheets, ao Mercado Pago e ao WhatsApp. Esse é o formato que a Vercel entende nativamente: cada arquivo dentro de `api/` já vira uma rota sozinho, sem precisar de servidor rodando o tempo todo.
- `lib/` — a lógica compartilhada entre as funções (conexão com o Sheets, com o Mercado Pago, envio de e-mail), reaproveitada pelas rotas em `api/`.

Isso já está estruturado no mesmo padrão dos outros projetos seus na Vercel — **é só publicar tudo de uma vez, site e API juntos, sem precisar de outro serviço de hospedagem**. O que ainda falta são as suas credenciais (Google, Mercado Pago) — que entram como variáveis de ambiente direto no painel da Vercel, e não como um arquivo `.env` publicado junto (isso será explicado na seção 2).

---

## 0. Árvore de pastas do projeto

```
celebbra/
├── index.html                  ← página inicial (catálogo, agendamento, contato)
├── sobre.html                  ← página "Sobre nós"
├── termos.html                 ← Termos de Uso
├── privacidade.html            ← Política de Privacidade (LGPD)
├── cancelamento.html           ← Política de Cancelamento
├── package.json
├── .env.example                 ← modelo das variáveis — NÃO subir o .env real pro Git
├── README.md                    ← este arquivo
│
├── assets/                      ← CSS compartilhado por todas as páginas
│   └── estilo.css
│
├── imagens/                     ← fotos reais dos produtos (ver imagens/LEIA-ME.md)
│   ├── LEIA-ME.md
│   ├── mesa-cadeira-kit.jpg            (adicionar)
│   ├── kit-4-mesas-redondas.jpg        (adicionar)
│   ├── pula-pula-castelo.jpg           (adicionar)
│   ├── toto-profissional.jpg           (adicionar)
│   ├── galpao-tenda-6x6.jpg            (adicionar)
│   ├── piscina-bolinhas.jpg            (adicionar)
│   └── cadeira-tiffany.jpg             (adicionar)
│
├── api/                          ← cada arquivo aqui = uma rota automática na Vercel
│   ├── disponibilidade.js        → POST /api/disponibilidade
│   ├── reservas.js               → POST /api/reservas
│   ├── contato.js                → POST /api/contato  (já é o que o formulário do site chama)
│   └── webhooks/
│       ├── mercadopago.js        → POST /api/webhooks/mercadopago
│       └── whatsapp.js           → GET+POST /api/webhooks/whatsapp (Nível 2, opcional)
│
└── lib/                          ← lógica compartilhada, usada pelas rotas acima
    ├── googleSheets.js           ← leitura/escrita na planilha
    ├── mercadoPago.js            ← geração do link de pagamento
    ├── email.js                  ← e-mail de notificação do formulário de contato
    └── whatsappBot.js            ← regras do bot de WhatsApp (Nível 2, opcional)
```

**Para testar localmente antes de publicar:**

1. Baixe todos os arquivos mantendo essa estrutura exatamente assim.
2. Instale a CLI da Vercel uma vez: `npm install -g vercel`.
3. Copie `.env.example` para `.env.local` e preencha com suas credenciais (seção 2).
4. Rode `vercel dev` na pasta do projeto — ele sobe o site **e** as funções de `api/` juntos, em `http://localhost:3000`, já simulando exatamente o comportamento da Vercel em produção. Não precisa mais rodar `node server.js` nem configurar CORS — front e API ficam na mesma origem.

---

## 1. Estrutura da planilha no Google Sheets

Crie uma planilha com duas abas:

### Aba `Estoque`
| id_item | nome | categoria | quantidade_total | preco_diaria |
|---|---|---|---|---|
| KIT-MESA-CAD-QUAD | Kit Mesa Quadrada + 4 Cadeiras | Mesas e Cadeiras | 18 | 30 |
| KIT-4-MESAS-RED | Kit 4 Mesas Redondas | Mesas e Cadeiras | 10 | 100 |
| PULA-01 | Pula-pula Castelo Médio | Brinquedos | 3 | 180 |
| TOTO-01 | Totó Profissional | Brinquedos | 5 | 90 |
| GALPAO-6X6 | Galpão/Tenda 6x6m | Estruturas | 2 | 320 |

### Aba `Agendamentos` (preenchida automaticamente pelo sistema)
| id_reserva | cliente | whatsapp | id_item | quantidade | data_retirada | data_entrega | status | id_pagamento | valor_total | forma_pagamento |
|---|---|---|---|---|---|---|---|---|---|---|

Essa é a planilha central do pedido: nome do cliente, telefone de contato, item, datas, valor e, assim que o Mercado Pago confirma o pagamento, a forma usada (pix, cartão de crédito, débito) é preenchida automaticamente na última coluna — sem precisar de nenhuma anotação manual.

O campo `status` evolui assim: `aguardando_pagamento` → `confirmado` (ou `pagamento_recusado` / `cancelado`).

### Aba `Contatos` (formulário "Fale conosco")
| id_contato | data_hora | nome | whatsapp | email | assunto | mensagem | status | consentimento_lgpd |
|---|---|---|---|---|---|---|---|---|

Toda mensagem enviada pelo site cai aqui automaticamente com `status = novo`, e ao mesmo tempo dispara um e-mail para a equipe (ver `lib/email.js`). Quando alguém responde o cliente, é só mudar o `status` para `respondido` na planilha — dá pra ver de relance quem ainda não foi atendido.

**Importante:** compartilhe a planilha com o e-mail da service account do Google Cloud (permissão de Editor) — é assim que a API escreve e lê os dados sem você precisar abrir a planilha manualmente.

---

## 2. Publicar tudo na Vercel (site + API juntos)

**Passo a passo:**

1. **Suba o projeto para um repositório no GitHub** (mesmo fluxo que você já usa nos outros sites) — a Vercel importa direto de lá e publica de novo sozinha a cada vez que você atualizar o repositório. Dá pra fazer via upload direto na CLI também, mas o repositório é mais prático a partir do segundo deploy.
2. Em vercel.com, **"Add New Project"** → selecione o repositório da Celebbra. A Vercel detecta sozinha que é um projeto com arquivos estáticos na raiz + funções em `api/` — não precisa configurar build command nem output directory, pode deixar em branco/padrão.
3. **Antes de clicar em Deploy**, adicione as variáveis de ambiente (aba "Environment Variables" na tela de configuração do projeto, ou depois em Project Settings → Environment Variables). São as mesmas do `.env.example`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (cole a chave inteira, com as quebras de linha — o campo da Vercel aceita multi-linha, não precisa escapar como `\n`)
   - `GOOGLE_SHEET_ID`
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_DESTINO_CONTATOS`
   - `BASE_URL` e `FRONTEND_URL` — depois do primeiro deploy você vai saber a URL real (algo como `https://celebbra.vercel.app`); pode publicar uma vez, copiar a URL gerada, voltar aqui e atualizar essas duas variáveis, e publicar de novo.
   - `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN` — só preencha se for ativar o bot Nível 2; pode deixar em branco por enquanto.
4. Clique em **Deploy**. Em cerca de um minuto o site e a API já estão no ar juntos, no mesmo domínio.
5. Depois de publicado, atualize as URLs de webhook nos painéis externos:
   - No Mercado Pago, a `notification_url` já é montada automaticamente pelo código a partir de `BASE_URL` — só garanta que essa variável está com a URL certa da Vercel.
   - Se for ativar o WhatsApp Nível 2, cadastre `https://SEUPROJETO.vercel.app/api/webhooks/whatsapp` no painel da Meta.

**Gerando as credenciais que faltam:**

1. **Google Sheets API**: crie um projeto no Google Cloud Console → ative "Google Sheets API" → crie uma Service Account → gere uma chave JSON → copie `client_email` e `private_key` para as variáveis de ambiente.
2. **Mercado Pago**: crie uma aplicação em https://www.mercadopago.com.br/developers/panel → copie o Access Token de produção (ou teste) para as variáveis de ambiente.
3. **E-mail (formulário de contato)**: se for usar Gmail, ative a verificação em 2 etapas na conta e gere uma "senha de app" em https://myaccount.google.com/apppasswords — o Gmail bloqueia login direto de aplicativos por segurança, então a senha normal da conta não funciona aqui. Para volume maior de e-mails, prefira um serviço transacional (SendGrid, Amazon SES, Resend), que tem menos chance de cair em spam do que uma conta Gmail comum.

**Um detalhe técnico que vale saber:** funções serverless da Vercel "dormem" entre uma chamada e outra (não ficam um processo ligado o tempo todo como um servidor tradicional) — isso não muda nada no seu uso nem custa mais caro em volume baixo/médio, é só a explicação de por que essa arquitetura é diferente da que eu tinha entregado antes com Express.

---

## 3. O que provavelmente falta pensar (detalhado)

### Operacional / logística

**Cálculo de frete por distância.** Hoje o protótipo usa uma taxa fixa de entrega (R$ 60). Na prática, entregar a 3km do depósito e a 40km custa combustível e tempo de equipe muito diferentes. Duas formas de resolver: (a) tabela simples por faixa de CEP/bairro, mantida numa aba `Fretes` no mesmo Sheets; (b) calcular a distância automaticamente via API de geolocalização (Google Distance Matrix, por exemplo) a partir do CEP informado no agendamento. A opção (a) é mais simples de manter no começo.

**Buffer de manutenção entre eventos.** A planilha hoje libera um item assim que a `data_entrega` de uma reserva passa. Na vida real, um pula-pula que volta sujo às 22h de domingo não pode sair de novo às 8h de segunda sem higienização. Vale adicionar um "tempo de buffer" (ex: +1 dia) na checagem de disponibilidade — isso é uma mudança pequena em `checkAvailability()`, somando esse buffer à `data_entrega` antes de comparar com a próxima reserva.

**Rota do dia.** Quando o número de entregas por dia crescer, vale ter uma visão (pode ser só um filtro na planilha por `data_retirada`) agrupando todas as entregas/coletas daquele dia, para montar a rota do caminhão com antecedência — evita prometer horário que a logística não cobre.

**Checklist fotográfico de saída e volta.** Tirar 3-4 fotos de cada item na saída (estado de conservação) e na volta, salvando o link (Google Drive, por exemplo) numa coluna extra da aba `Agendamentos`. Isso é sua principal defesa em caso de disputa sobre avaria — sem isso, é "sua palavra contra a do cliente".

### Financeiro / jurídico

**Caução (depósito de segurança).** Cobrar um valor à parte, devolvido após conferência do item, é comum no setor — especialmente para itens caros ou eletrônicos. O Mercado Pago permite fazer isso como uma segunda cobrança separada, ou reter um valor a mais no pagamento e estornar a diferença depois (estorno parcial). É preciso deixar essa regra clara no contrato antes de cobrar.

**Contrato de locação digital.** Um PDF simples com os termos (o que é alugado, prazo, valor de multa por dano/atraso, responsabilidade sobre o uso do brinquedo) gerado automaticamente a partir dos dados da reserva, com assinatura eletrônica (serviços como Clicksign, Autentique, ou até um "aceite" registrado com timestamp e IP já ajuda). Reduz muito discussão em caso de problema.

**Política de cancelamento e reembolso.** Hoje só existe o link no rodapé, sem regra de fato. Defina algo como: cancelamento com X dias de antecedência = reembolso total; menos que isso = reembolso parcial ou crédito para uso futuro. Essa regra deveria estar visível *antes* do cliente pagar, não só no rodapé.

**Nota fiscal.** Se a empresa for formalizada (MEI, ME, etc.), a emissão de NF-e/NFS-e pode ser automatizada via serviços como NFE.io ou eNotas, disparados no mesmo momento em que o pagamento é confirmado pelo webhook do Mercado Pago.

**Taxa de atraso na devolução.** Regra e valor por hora/dia de atraso, cobrada automaticamente (ou pelo menos calculada automaticamente, mesmo que a cobrança seja manual no início).

### Cliente / confiança

**Notificações automáticas.** Confirmação da reserva assim que o pagamento é aprovado, lembrete 1 dia antes do evento, e aviso quando a equipe estiver a caminho. WhatsApp tem taxa de abertura muito maior que e-mail — dá pra fazer isso via API oficial do WhatsApp Business (mais formal, exige aprovação da Meta) ou serviços como Twilio/Z-API (mais rápido de configurar, mas verifique os termos de uso).

**Avaliação pós-evento.** Um link enviado 1-2 dias após o evento pedindo nota e comentário. Além de gerar prova social para novos clientes, ajuda a identificar rapidinho se algum item específico (ex: um totó com problema mecânico) está gerando reclamação repetida.

**Política para chuva/mau tempo.** Para itens usados ao ar livre (infláveis, tendas), decidir com antecedência: reagendamento sem custo? Cancelamento com reembolso? Isso evita negociação de última hora, no dia do evento, sob pressão.

### Administração

**Painel interno da equipe.** Separado do site do cliente — pode ser bem simples no início (até a própria planilha, com abas organizadas), mas conforme o volume crescer vale ter uma tela só para a equipe: agenda do dia, itens fora de uso por manutenção, edição rápida de preço/estoque sem editar célula por célula.

**Estoque mínimo de segurança.** Não reservar 100% do estoque disponível — manter uma margem (ex: 1 unidade a menos do que o total real) para imprevistos como um item que quebra e não tem tempo de conserto antes do próximo evento.

**Histórico de clientes recorrentes.** Uma aba ou coluna marcando clientes que já alugaram antes agiliza orçamento (você já sabe o CEP, já sabe o que costumam pedir) e é uma base natural para oferecer desconto de fidelidade.

### LGPD

O sistema guarda nome, WhatsApp, e-mail, CEP e histórico de eventos de cada cliente — isso é dado pessoal de verdade, sujeito à LGPD. O checkbox de consentimento que já entra no formulário de contato é o começo, mas vale ter uma página de privacidade real (não só um link vazio) explicando o que é coletado, por quanto tempo é guardado, e como o cliente pode pedir exclusão dos dados.

---

## 4. Fotos reais dos produtos — vale a pena?

Sim, e eu colocaria isso entre as primeiras prioridades, não como "depois eu melhoro". Alguns motivos práticos, não só estéticos:

- **Conversão.** Em locação de festa, o cliente está comprando "vai ficar bonito no meu evento?" — imagem genérica (como as usadas no protótipo) não responde isso. Foto real do pula-pula montado, da mesa posta, do totó no ambiente, converte mais que ícone ou banco de imagens.
- **Reduz disputa.** Foto real mostra o estado real do item (um pula-pula com 2 anos de uso não é o mesmo que a foto de catálogo do fabricante). Isso evita cliente reclamar "não era isso que eu vi" — e reforça a ideia do checklist fotográfico que mencionei acima: as mesmas fotos de "saída" do item podem, com o tempo, alimentar o catálogo do site.
- **Ajuda a vender o que você realmente tem.** Se você tem 2 modelos de pula-pula, mostrar as duas fotos reais deixa claro a diferença de tamanho/tema, e evita o cliente pedir o errado.

Recomendações práticas:
- Várias fotos por item (mínimo 3): close, item completo, e um "com gente/objeto ao lado" pra dar noção de escala — isso é comum faltar e gera muita dúvida por WhatsApp tipo "cabe quantas crianças?".
- Fotografar limpo e montado, com boa luz natural — não precisa ser produção profissional, celular com luz do dia já resolve bem.
- Comprimir as imagens antes de subir no site (formato WebP, poucas centenas de KB cada) — fotos pesadas deixam o site lento em conexão de celular, que é de onde a maior parte do tráfego de eventos vem.
- Evitar foto de banco de imagens misturada com foto real no mesmo catálogo — a diferença de qualidade/realismo salta aos olhos e passa desconfiança.

Se quiser, no próximo passo eu já deixo o `index.html` preparado para receber essas fotos reais (troco os blocos de emoji por `<img>` com lazy loading e um fallback caso a foto ainda não exista para aquele item).

---

## 5. Onde colocar as fotos no site

O `index.html` já está preparado: cada card do catálogo tem uma tag `<img>` apontando para uma pasta `imagens/` (crie essa pasta na mesma pasta onde está o `index.html`). Se o arquivo esperado não existir, o site volta a mostrar o emoji automaticamente — nada quebra.

Nomes de arquivo esperados (detalhes e recomendações técnicas de tamanho/peso em `imagens/LEIA-ME.md`):

```
imagens/
├── mesa-cadeira-kit.jpg
├── pula-pula-castelo.jpg
├── toto-profissional.jpg
├── galpao-tenda-6x6.jpg
├── piscina-bolinhas.jpg
└── cadeira-tiffany.jpg
```

Ao adicionar um item novo no catálogo, siga o padrão: escolha um nome de arquivo, use-o no `src` da nova tag `<img>`, e salve a foto com esse mesmo nome na pasta.

---

## 6. Checklist para ativar o pagamento (Mercado Pago)

1. Conta Mercado Pago em nome do CNPJ da empresa (não pessoal).
2. Verificação de identidade (KYC) concluída — sem isso, valores maiores podem ficar retidos.
3. Credenciais de teste (sandbox) e de produção geradas em developers.mercadopago.com.br.
4. Site publicado em domínio próprio com HTTPS — obrigatório para o webhook e para o Pix funcionarem direito.
5. Fluxo completo testado em sandbox: criar reserva → pagar com cartão de teste → conferir se o status muda para "confirmado" na planilha via webhook.
6. Prazo de repasse do dinheiro mapeado (Pix costuma cair na hora; cartão de crédito leva mais dias).
7. Troca do Access Token de teste pelo de produção no `.env` — é o último passo, o que efetivamente liga o pagamento real.

## 7. WhatsApp com atendimento inicial em bot

Dois níveis, dá pra escalar depois:

**Nível 1 — link inteligente (já ativo no site).** O botão flutuante de WhatsApp abre a conversa com uma mensagem-menu pré-preenchida (orçamento / dúvida / reserva existente / falar com atendente). Ainda é um humano respondendo, mas já organiza o primeiro contato. Troque o número `5521900000000` no `index.html` pelo número real da empresa antes de publicar.

**Nível 2 — bot automático de verdade.** Já deixei a lógica pronta em `lib/whatsappBot.js` (exposta pela rota `api/webhooks/whatsapp.js`), usando a WhatsApp Cloud API oficial (Meta) — não é serviço terceirizado, é a própria API do WhatsApp Business. Pré-requisitos para ativar:
- Conta Meta Business verificada.
- Um número dedicado ao WhatsApp Business (não pode ser um número já usado no WhatsApp pessoal).
- Criar um app em developers.facebook.com/apps, adicionar o produto "WhatsApp", pegar o `Phone Number ID` e o `Access Token`.
- Configurar o webhook apontando para `SEU_DOMINIO/webhooks/whatsapp`, usando o `WHATSAPP_VERIFY_TOKEN` que você definir no `.env`.

O bot responde ao menu automaticamente e, quando o cliente escolhe "orçamento" ou "dúvida", já registra o contato na aba `Contatos` do Sheets — mesmo fluxo do formulário do site. A opção "falar com atendente" está com um comentário no código marcando onde entraria a lógica de transferir a conversa para uma pessoa (hoje é só um aviso; se o volume crescer, vale ter uma fila de verdade).

Minha sugestão prática: comece com o Nível 1 agora (já está pronto), valide se o volume de contato justifica automação total, e migre para o Nível 2 quando fizer sentido — a configuração da Cloud API da Meta tem alguma burocracia de aprovação, então não é um passo instantâneo.
