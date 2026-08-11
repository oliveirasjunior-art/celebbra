// whatsappBot.js
// Bot de primeiro atendimento usando a WhatsApp Cloud API (oficial, da Meta).
//
// Pré-requisitos antes de ativar isso:
//  1. Conta Meta Business verificada.
//  2. Um número de telefone dedicado ao WhatsApp Business (não pode ser um
//     número que já use no WhatsApp pessoal comum).
//  3. Criar um app em https://developers.facebook.com/apps → adicionar o
//     produto "WhatsApp" → pegar o Phone Number ID e o Access Token.
//  4. Configurar o webhook (URL pública HTTPS) apontando para
//     BASE_URL/webhooks/whatsapp, com o Verify Token definido abaixo.
//
// Fluxo deste bot: responde automaticamente ao primeiro contato com um menu.
// Conforme o cliente escolhe uma opção, direciona a mensagem certa — e, no
// caso de "orçamento" ou "dúvida", já registra o contato na aba "Contatos"
// do Sheets, do mesmo jeito que o formulário do site faz.

const axios = require("axios");
const { registrarContato } = require("./googleSheets");

const WHATSAPP_API = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

async function enviarMensagem(para, texto) {
  await axios.post(
    WHATSAPP_API,
    {
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
  );
}

const MENU_PRINCIPAL =
  "Olá! 👋 Bem-vindo(a) à Celebbra.\n\n" +
  "Escolha uma opção digitando o número:\n" +
  "1️⃣ Fazer um orçamento\n" +
  "2️⃣ Tirar dúvida sobre disponibilidade\n" +
  "3️⃣ Falar sobre uma reserva existente\n" +
  "4️⃣ Falar com um atendente";

// Verificação do webhook (a Meta chama esse GET uma vez, ao configurar)
function verificarWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

// Recebe as mensagens dos clientes
async function receberMensagem(req, res) {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const mensagem = change?.value?.messages?.[0];

    if (!mensagem) return res.sendStatus(200); // pode ser evento de status, ignora

    const de = mensagem.from; // número do cliente
    const texto = (mensagem.text?.body || "").trim();

    if (texto === "1") {
      await enviarMensagem(
        de,
        "Ótimo! Me conta rapidinho: qual a data do evento e quais itens você tem interesse (mesas, cadeiras, pula-pula, totó, tenda)? Já registro aqui e um atendente confirma a disponibilidade e o valor com você."
      );
      await registrarContato({
        idContato: `WA-${Date.now()}`,
        nome: "Contato via WhatsApp",
        whatsapp: de,
        email: "",
        assunto: "Orçamento (WhatsApp)",
        mensagem: "Cliente iniciou pedido de orçamento pelo bot do WhatsApp.",
        consentimentoLgpd: true,
      });
    } else if (texto === "2") {
      await enviarMensagem(de, "Sem problema! Qual item e qual data você quer confirmar? Vou checar direto no nosso estoque.");
    } else if (texto === "3") {
      await enviarMensagem(de, "Pode me passar o número da sua reserva (começa com RES-) ou o nome usado no agendamento?");
    } else if (texto === "4") {
      await enviarMensagem(de, "Certo, já vou chamar um atendente humano para continuar por aqui. Só um instante 🙂");
      // Aqui entraria a lógica de "handoff": marcar a conversa como
      // "aguardando humano" em algum lugar (ex: coluna extra no Sheets,
      // ou uma fila real se o volume crescer) para a equipe assumir.
    } else {
      await enviarMensagem(de, MENU_PRINCIPAL);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no bot do WhatsApp:", err.message);
    res.sendStatus(200); // sempre 200 para a Meta não ficar reenviando
  }
}

module.exports = { verificarWebhook, receberMensagem };
