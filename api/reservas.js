// api/reservas.js
// Responde em POST /api/reservas.
// Recebe um pedido com um ou mais itens (carrinho), confirma disponibilidade
// de cada item, grava o pedido na planilha e devolve o link de checkout do
// Mercado Pago para o front-end redirecionar o cliente.

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
      itens, // [{ idItem, nome, quantidade, precoUnitario }]
      dataRetirada,
      dataEntrega,
      taxaEntrega,
    } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: "O pedido precisa ter pelo menos um item." });
    }

    // Checa disponibilidade de cada item antes de confirmar o pedido inteiro
    for (const it of itens) {
      const disponibilidade = await checkAvailability(it.idItem, dataRetirada, dataEntrega, it.quantidade);
      if (!disponibilidade.disponivel) {
        return res.status(409).json({
          erro: `"${it.nome}" está indisponível nas datas selecionadas (restam ${disponibilidade.quantidadeDisponivel}).`,
          idItem: it.idItem,
          ...disponibilidade,
        });
      }
    }

    const idReserva = `RES-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const valorItens = itens.reduce((soma, it) => soma + Number(it.precoUnitario) * Number(it.quantidade), 0);
    const valorTotal = valorItens + Number(taxaEntrega || 0);

    await criarReserva({
      idReserva,
      cliente,
      whatsapp,
      itens,
      dataRetirada,
      dataEntrega,
      valorTotal,
    });

    const pagamento = await criarPreferencia({
      idReserva,
      itens,
      taxaEntrega,
      emailCliente: email,
    });

    res.status(200).json({ idReserva, linkPagamento: pagamento.initPoint });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
