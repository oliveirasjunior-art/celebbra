// api/contato.js
// Responde em POST /api/contato — é o endpoint que o formulário
// "Fale conosco" do index.html já chama via fetch('/api/contato').

const crypto = require("crypto");
const { registrarContato } = require("../lib/googleSheets");
const { notificarNovoContato } = require("../lib/email");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const { nome, whatsapp, email, assunto, mensagem, consentimentoLgpd } = req.body;

    if (!nome || !email || !mensagem || !consentimentoLgpd) {
      return res.status(400).json({ erro: "Nome, e-mail, mensagem e consentimento LGPD são obrigatórios." });
    }

    const idContato = `CONT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await registrarContato({ idContato, nome, whatsapp, email, assunto, mensagem, consentimentoLgpd });
    await notificarNovoContato({ nome, whatsapp, email, assunto, mensagem });

    res.status(200).json({ idContato, ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
