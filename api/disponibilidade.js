// api/disponibilidade.js
// Na Vercel, cada arquivo dentro de /api vira automaticamente uma rota:
// este arquivo responde em POST /api/disponibilidade — não precisa de
// nenhuma configuração extra de rotas.

const { checkAvailability } = require("../lib/googleSheets");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const { idItem, dataRetirada, dataEntrega, quantidade } = req.body;
    const resultado = await checkAvailability(idItem, dataRetirada, dataEntrega, quantidade);
    res.status(200).json(resultado);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
};
