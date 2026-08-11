// googleSheets.js
// Integração com Google Sheets funcionando como banco de dados de:
//  - Estoque (aba "Estoque")
//  - Agendamentos / reservas (aba "Agendamentos")
//
// Estrutura sugerida da planilha (ver README.md para o modelo completo):
//
// Aba "Estoque"
// | id_item | nome | categoria | quantidade_total | preco_diaria |
//
// Aba "Agendamentos"
// | id_reserva | cliente | whatsapp | id_item | quantidade | data_retirada | data_entrega | status | id_pagamento | valor_total | forma_pagamento |
//
// Aba "Contatos" (formulário "Fale conosco")
// | id_contato | data_hora | nome | whatsapp | email | assunto | mensagem | status | consentimento_lgpd |

const { google } = require("googleapis");

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

// Lê todas as linhas de uma aba e devolve como array de objetos,
// usando a primeira linha como cabeçalho.
async function readSheet(sheetName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  const [header, ...rows] = res.data.values || [[]];
  if (!header) return [];
  return rows.map((row) => {
    const obj = {};
    header.forEach((key, i) => (obj[key] = row[i] ?? ""));
    return obj;
  });
}

// Adiciona uma nova linha (usado para criar reserva)
async function appendRow(sheetName, rowValuesInHeaderOrder) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [rowValuesInHeaderOrder] },
  });
}

// Atualiza uma célula específica (ex: mudar status da reserva após pagamento)
async function updateCell(sheetName, rowNumber, columnLetter, value) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${columnLetter}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

// Verifica se um item tem quantidade disponível no intervalo de datas pedido.
// Soma as reservas já confirmadas/pendentes que se sobrepõem ao intervalo
// e compara com a quantidade total em estoque.
async function checkAvailability(idItem, dataRetirada, dataEntrega, quantidadeDesejada) {
  const estoque = await readSheet("Estoque");
  const item = estoque.find((i) => i.id_item === idItem);
  if (!item) throw new Error(`Item ${idItem} não encontrado no estoque`);

  const agendamentos = await readSheet("Agendamentos");
  const inicio = new Date(dataRetirada);
  const fim = new Date(dataEntrega);

  const reservado = agendamentos
    .filter((a) => a.id_item === idItem && a.status !== "cancelado")
    .filter((a) => {
      const rIni = new Date(a.data_retirada);
      const rFim = new Date(a.data_entrega);
      // sobreposição de intervalos de datas
      return rIni <= fim && rFim >= inicio;
    })
    .reduce((soma, a) => soma + Number(a.quantidade || 0), 0);

  const disponivel = Number(item.quantidade_total) - reservado;
  return {
    disponivel: disponivel >= Number(quantidadeDesejada),
    quantidadeDisponivel: disponivel,
    quantidadeTotal: Number(item.quantidade_total),
  };
}

// Cria a reserva na aba "Agendamentos" com status "aguardando_pagamento"
async function criarReserva({
  idReserva,
  cliente,
  whatsapp,
  idItem,
  quantidade,
  dataRetirada,
  dataEntrega,
  valorTotal,
}) {
  await appendRow("Agendamentos", [
    idReserva,
    cliente,
    whatsapp,
    idItem,
    quantidade,
    dataRetirada,
    dataEntrega,
    "aguardando_pagamento",
    "",
    valorTotal,
    "", // forma_pagamento — preenchido quando o webhook confirmar o pagamento
  ]);
}

// Atualiza o status da reserva (ex: "confirmado", "cancelado"), o id do
// pagamento e a forma de pagamento usada (pix, master, visa, etc. —
// devolvida pelo Mercado Pago no momento da confirmação)
async function atualizarStatusReserva(idReserva, novoStatus, idPagamento, formaPagamento) {
  const agendamentos = await readSheet("Agendamentos");
  const index = agendamentos.findIndex((a) => a.id_reserva === idReserva);
  if (index === -1) throw new Error(`Reserva ${idReserva} não encontrada`);

  const rowNumber = index + 2; // +2 porque a linha 1 é cabeçalho e o array é 0-indexed
  await updateCell("Agendamentos", rowNumber, "H", novoStatus); // coluna status
  if (idPagamento) {
    await updateCell("Agendamentos", rowNumber, "I", idPagamento); // coluna id_pagamento
  }
  if (formaPagamento) {
    await updateCell("Agendamentos", rowNumber, "K", formaPagamento); // coluna forma_pagamento
  }
}

// Registra uma mensagem do formulário "Fale conosco" na aba "Contatos",
// com status inicial "novo" — a equipe muda para "respondido" manualmente
// (ou por um painel interno futuro) depois de dar retorno ao cliente.
async function registrarContato({ idContato, nome, whatsapp, email, assunto, mensagem, consentimentoLgpd }) {
  await appendRow("Contatos", [
    idContato,
    new Date().toISOString(),
    nome,
    whatsapp,
    email,
    assunto,
    mensagem,
    "novo",
    consentimentoLgpd ? "sim" : "nao",
  ]);
}

module.exports = {
  readSheet,
  appendRow,
  checkAvailability,
  criarReserva,
  atualizarStatusReserva,
  registrarContato,
};
