// email.js
// Envia o e-mail de notificação toda vez que alguém preenche o formulário
// "Fale conosco" do site. Usa SMTP (funciona com Gmail, Outlook, ou qualquer
// provedor transacional como SendGrid/Amazon SES/Resend).
//
// Para usar com Gmail: ative a verificação em 2 etapas na conta e gere uma
// "Senha de app" em https://myaccount.google.com/apppasswords — não use a
// senha normal da conta, o Gmail bloqueia login direto de apps por segurança.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true apenas para porta 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function notificarNovoContato({ nome, whatsapp, email, assunto, mensagem }) {
  await transporter.sendMail({
    from: `"Site Celebbra" <${process.env.SMTP_USER}>`,
    to: process.env.EMAIL_DESTINO_CONTATOS, // e-mail da equipe/atendimento
    replyTo: email, // responder já vai direto para o cliente
    subject: `Novo contato pelo site — ${assunto}`,
    text:
      `Nome: ${nome}\n` +
      `WhatsApp: ${whatsapp}\n` +
      `E-mail: ${email}\n` +
      `Assunto: ${assunto}\n\n` +
      `Mensagem:\n${mensagem}`,
    html: `
      <div style="font-family:sans-serif; font-size:14px; color:#1C2B4A;">
        <h2 style="color:#E8543E;">Novo contato pelo site</h2>
        <p><b>Nome:</b> ${nome}</p>
        <p><b>WhatsApp:</b> ${whatsapp}</p>
        <p><b>E-mail:</b> ${email}</p>
        <p><b>Assunto:</b> ${assunto}</p>
        <p><b>Mensagem:</b><br>${mensagem}</p>
      </div>
    `,
  });
}

module.exports = { notificarNovoContato };
