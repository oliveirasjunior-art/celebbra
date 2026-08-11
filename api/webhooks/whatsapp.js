// api/webhooks/whatsapp.js
// Fica acessível em GET/POST /api/webhooks/whatsapp.
// Só é necessário configurar isso se e quando você ativar o bot oficial
// da Meta (Nível 2) — enquanto isso, o site usa só o link direto (Nível 1),
// que já funciona sem nenhuma configuração adicional.

const { verificarWebhook, receberMensagem } = require("../../lib/whatsappBot");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    return verificarWebhook(req, res);
  }
  if (req.method === "POST") {
    return receberMensagem(req, res);
  }
  res.status(405).end();
};
