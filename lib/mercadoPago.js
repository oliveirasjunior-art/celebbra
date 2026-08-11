// mercadoPago.js
// Integração com Mercado Pago usando "Checkout Pro" (preferência de pagamento).
// O Checkout Pro já entrega, na mesma tela, as opções de Pix, cartão de débito
// e cartão de crédito — não é necessário implementar cada meio separadamente.

const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Cria uma preferência de pagamento para uma reserva.
// Retorna a URL (init_point) para redirecionar o cliente ao checkout.
async function criarPreferencia({ idReserva, descricao, valorTotal, emailCliente }) {
  const preference = new Preference(client);

  const resultado = await preference.create({
    body: {
      items: [
        {
          id: idReserva,
          title: descricao,
          quantity: 1,
          unit_price: Number(valorTotal),
          currency_id: "BRL",
        },
      ],
      payer: emailCliente ? { email: emailCliente } : undefined,
      external_reference: idReserva, // usado para casar o webhook com a reserva
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pagamento/sucesso`,
        pending: `${process.env.FRONTEND_URL}/pagamento/pendente`,
        failure: `${process.env.FRONTEND_URL}/pagamento/erro`,
      },
      auto_return: "approved",
      notification_url: `${process.env.BASE_URL}/webhooks/mercadopago`,
      payment_methods: {
        // Deixa disponível pix, débito e crédito; exclui boleto se não for usado
        excluded_payment_types: [{ id: "ticket" }],
      },
    },
  });

  return {
    preferenceId: resultado.id,
    initPoint: resultado.init_point,
  };
}

// Consulta o status de um pagamento específico (usado ao receber o webhook)
async function consultarPagamento(paymentId) {
  const payment = new Payment(client);
  const resultado = await payment.get({ id: paymentId });
  return {
    status: resultado.status, // approved, pending, rejected, etc.
    externalReference: resultado.external_reference, // id_reserva
    metodo: resultado.payment_method_id, // pix, master, visa, etc.
  };
}

module.exports = { criarPreferencia, consultarPagamento };
