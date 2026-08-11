// api/webhooks/mercadopago.js
// Fica acessível em POST /api/webhooks/mercadopago assim que o projeto
// for publicado na Vercel — é essa URL completa que você cadastra no
// painel do Mercado Pago como "notification_url" (o código já monta essa
// URL sozinho a partir de BASE_URL, configurado nas variáveis de ambiente).

const { atualizarStatusReserva } = require("../../lib/googleSheets");
const { consultarPagamento } = require("../../lib/mercadoPago");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const info = await consultarPagamento(data.id);
      const idReserva = info.externalReference;

      if (info.status === "approved") {
        await atualizarStatusReserva(idReserva, "confirmado", data.id, info.metodo);
        // Aqui também é o lugar ideal para:
        // - enviar WhatsApp/e-mail de confirmação ao cliente
        // - notificar a equipe de logística sobre a entrega
      } else if (info.status === "rejected") {
        await atualizarStatusReserva(idReserva, "pagamento_recusado", data.id);
      }
    }

    res.status(200).end(); // Mercado Pago espera 200 rápido, sem lógica pesada aqui
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err.message);
    res.status(200).end(); // evita reenvios em loop; o erro fica no log da Vercel
  }
};
