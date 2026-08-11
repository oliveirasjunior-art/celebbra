// api/reservas.js
// Responde em POST /api/reservas.
// Confirma disponibilidade, grava a reserva na planilha e devolve o link
// de checkout do Mercado Pago para o front-end redirecionar o cliente.

const crypto = require("crypto");
const { checkAvailability, criarReserva } = require("../lib/googleSheets");
const { criarPreferencia } = require("../lib/mercadoPago");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const {
      cliente,
      whatsapp,
      email,
      idItem,
      quantidade,
      dataRetirada,
      dataEntrega,
      valorTotal,
      descricao,
    } = req.body;

    const disponibilidade = await checkAvailability(idItem, dataRetirada, dataEntrega, quantidade);
    if (!disponibilidade.disponivel) {
      return res.status(409).json({ erro: "Item indisponível nas datas selecionadas", ...disponibilidade });
    }

    const idReserva = `RES-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await criarReserva({
      idReserva,
      cliente,
      whatsapp,
      idItem,
      quantidade,
      dataRetirada,
      dataEntrega,
      valorTotal,
    });

    const pagamento = await criarPreferencia({
      idReserva,
      descricao: descricao || `Aluguel - ${idItem}`,
      valorTotal,
      emailCliente: email,
    });

    res.status(200).json({ idReserva, linkPagamento: pagamento.initPoint });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
