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
// Aba "Agendamentos" (uma linha por PEDIDO, podendo ter vários itens)
// | id_reserva | cliente | whatsapp | itens | itens_json | data_retirada | data_entrega | status | id_pagamento | valor_total | forma_pagamento |
//
// "itens" é o texto legível pra abrir a planilha e entender o pedido de relance
// (ex: "Kit Mesa Quadrada x6, Pula-pula Castelo x1"). "itens_json" guarda a
// mesma informação em formato estruturado, usado pelo sistema para calcular
// disponibilidade — não apague essa coluna, mesmo que pareça redundante.
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
// (olhando dentro de "itens_json" de cada pedido) e compara com o estoque.
async function checkAvailability(idItem, dataRetirada, dataEntrega, quantidadeDesejada) {
  const estoque = await readSheet("Estoque");
  const item = estoque.find((i) => i.id_item === idItem);
  if (!item) throw new Error(`Item ${idItem} não encontrado no estoque`);

  const agendamentos = await readSheet("Agendamentos");
  const inicio = new Date(dataRetirada);
  const fim = new Date(dataEntrega);

  let reservado = 0;
  for (const pedido of agendamentos) {
    if (pedido.status === "cancelado") continue;
    const rIni = new Date(pedido.data_retirada);
    const rFim = new Date(pedido.data_entrega);
    if (!(rIni <= fim && rFim >= inicio)) continue; // sem sobreposição de datas

    let itens = [];
    try {
      itens = JSON.parse(pedido.itens_json || "[]");
    } catch {
      itens = [];
    }
    const match = itens.find((it) => it.idItem === idItem);
    if (match) reservado += Number(match.quantidade || 0);
  }

  const disponivel = Number(item.quantidade_total) - reservado;
  return {
    disponivel: disponivel >= Number(quantidadeDesejada),
    quantidadeDisponivel: disponivel,
    quantidadeTotal: Number(item.quantidade_total),
  };
}

// Cria o pedido na aba "Agendamentos" com status "aguardando_pagamento".
// `itens` é um array: [{ idItem, nome, quantidade }, ...]
async function criarReserva({
  idReserva,
  cliente,
  whatsapp,
  itens,
  dataRetirada,
  dataEntrega,
  valorTotal,
}) {
  const itensTexto = itens.map((it) => `${it.nome} x${it.quantidade}`).join(", ");
  const itensJson = JSON.stringify(itens.map((it) => ({ idItem: it.idItem, quantidade: it.quantidade })));

  await appendRow("Agendamentos", [
    idReserva,
    cliente,
    whatsapp,
    itensTexto,
    itensJson,
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
