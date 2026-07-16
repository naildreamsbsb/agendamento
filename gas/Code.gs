const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = e.parameter.action;
  const id = e.parameter.id;

  let resultado;

  if (action === "ping") {
    resultado = {
      success: true,
      message: "API Nail Dreams funcionando"
    };
  }

  else if (action === "listarFila") {
  recalcularFila();
  resultado = listarFila();
}

  else if (action === "buscarAtendimento") {
  recalcularFila();
  resultado = buscarAtendimentoPorId(id);
}

  else if (action === "atualizarStatus") {
    resultado = atualizarStatusAtendimento(
      e.parameter.id,
      e.parameter.status
    );
  }

  else if (action === "cadastrarAtendimento") {
    resultado = cadastrarAtendimento({
      cliente: e.parameter.cliente,
      telefone: e.parameter.telefone,
      servico: e.parameter.servico,
      manicure: e.parameter.manicure,
      tempoUsado: e.parameter.tempoUsado,
      horarioManual: e.parameter.horarioManual,
      aceitaAntecipacao: e.parameter.aceitaAntecipacao,
      observacoes: e.parameter.observacoes,
      tipoAtendimento: e.parameter.tipoAtendimento
    });
  }

  else if (action === "listarServicos") {
    resultado = getSheetData("Serviços");
  }

  else if (action === "listarManicures") {
    resultado = getSheetData("Manicures");
  }

  else if (action === "iniciarAtendimento") {
  resultado = atualizarInicioAtendimento(e.parameter.id);
}

  else if (action === "editarAtendimento") {
  resultado = editarAtendimento({
    id: e.parameter.id,
    cliente: e.parameter.cliente,
    telefone: e.parameter.telefone,
    servico: e.parameter.servico,
    manicure: e.parameter.manicure,
    horario: e.parameter.horario,
    tempoUsado: e.parameter.tempoUsado,
    aceitaAntecipacao: e.parameter.aceitaAntecipacao,
    observacoes: e.parameter.observacoes,
    tipoAtendimento: e.parameter.tipoAtendimento
  });
}

  else if (action === "finalizarAtendimento") {
  resultado = finalizarAtendimentoCaixa({
    id: e.parameter.id,
    valorBruto: e.parameter.valorBruto,
    formaPagamento: e.parameter.formaPagamento,
    bandeiraTipo: e.parameter.bandeiraTipo,
    parcelas: e.parameter.parcelas,
    taxaPercentual: e.parameter.taxaPercentual,
    valorTaxa: e.parameter.valorTaxa,
    valorLiquido: e.parameter.valorLiquido
  });
}

  else if (action === "resumoCaixaDia") {
  resultado = resumoCaixaDia(e.parameter.data);
}

  else if (action === "resumoCaixaPeriodo") {
  resultado = resumoCaixaPeriodo(
    e.parameter.dataInicio,
    e.parameter.dataFim
  );
}

  else {
    resultado = {
      success: false,
      message: "Ação não reconhecida."
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return {
      success: false,
      message: `Aba "${sheetName}" não encontrada.`
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const rows = data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  return {
    success: true,
    sheet: sheetName,
    data: rows
  };
}

function testarServicos() {
  Logger.log(getSheetData("Serviços"));
}

function testarManicures() {
  Logger.log(getSheetData("Manicures"));
}


function gerarIdAtendimento() {
  const agora = new Date();
  const data = Utilities.formatDate(agora, Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const aleatorio = Math.floor(Math.random() * 900 + 100);
  return `ND-${data}-${aleatorio}`;
}

function buscarServicoPorNome(nomeServico) {
  const servicos = getSheetData("Serviços").data;

  return servicos.find(servico =>
    String(servico["Serviço"]).trim().toLowerCase() === String(nomeServico).trim().toLowerCase()
  );
}

function calcularHorarioPrevisto(manicure, tempoNovoAtendimento) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");
  const dados = sheet.getDataRange().getValues();

  if (dados.length <= 1) {
    return new Date();
  }

  const cabecalhos = dados[0];
  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxTempo = cabecalhos.indexOf("Tempo usado (min)");
  const idxHorarioPrevisto = cabecalhos.indexOf("Horário previsto");

  let horarioBase = new Date();

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    const mesmaManicure = linha[idxManicure] === manicure;
    const status = linha[idxStatus];

    const estaNaFila =
      status === "Aguardando" ||
      status === "Chamada" ||
      status === "Confirmou retorno" ||
      status === "Em atendimento";

    if (mesmaManicure && estaNaFila) {
      const horarioPrevisto = linha[idxHorarioPrevisto]
        ? new Date(linha[idxHorarioPrevisto])
        : horarioBase;

      const tempo = Number(linha[idxTempo]) || 60;
      const fimPrevisto = new Date(horarioPrevisto.getTime() + tempo * 60000);

      if (fimPrevisto > horarioBase) {
        horarioBase = fimPrevisto;
      }
    }
  }

  return horarioBase;
}

function cadastrarAtendimento(dadosCliente) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  const servico = buscarServicoPorNome(dadosCliente.servico);

  if (!servico) {
    return {
      success: false,
      message: "Serviço não encontrado."
    };
  }

  const id = gerarIdAtendimento();
  const agora = new Date();

  const data = Utilities.formatDate(agora, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const horaCadastro = Utilities.formatDate(agora, Session.getScriptTimeZone(), "HH:mm:ss");

  const tempoPadrao = Number(servico["Tempo padrão (min)"]) || 60;
  const tempoUsado = Number(dadosCliente.tempoUsado) || tempoPadrao;

  const valorBruto = Number(servico["Valor bruto"]) || 0;
let horarioEstimado;

if (dadosCliente.horarioManual) {
  horarioEstimado = dadosCliente.horarioManual;
} else {
  const horarioCalculado = calcularHorarioPrevisto(dadosCliente.manicure, tempoUsado);
  horarioEstimado = Utilities.formatDate(
    horarioCalculado,
    "America/Sao_Paulo",
    "HH:mm"
  );
}

  const novaLinha = [
    id,                              // ID
    data,                            // Data
    horaCadastro,                    // Hora cadastro
    dadosCliente.cliente,            // Cliente
    dadosCliente.telefone,           // WhatsApp
    dadosCliente.servico,            // Serviço
    dadosCliente.manicure,           // Manicure
    dadosCliente.aceitaAntecipacao || "Sim", // Aceita antecipação?
    "Aguardando",                   // Status
    valorBruto,                      // Valor bruto
    tempoPadrao,                     // Tempo padrão (min)
    tempoUsado,                      // Tempo usado (min)
    horarioEstimado,                 // Horário estimado
    "",                             // Forma pagamento
    "",                             // Bandeira/Tipo
    "",                             // Parcelas
    "",                             // Taxa %
    "",                             // Valor taxa
    "",                             // Valor líquido
    "",                             // Link cliente
    "",                             // WhatsApp cadastro
    "",                             // WhatsApp próximo
    "",                             // WhatsApp antecipação
    dadosCliente.observacoes || "" ,  // Observações
    dadosCliente.tipoAtendimento || "Fila de espera"
  ];

  sheet.appendRow(novaLinha);

  recalcularFila();

  return {
    success: true,
    message: "Atendimento cadastrado com sucesso.",
    atendimento: {
      id,
      cliente: dadosCliente.cliente,
      telefone: dadosCliente.telefone,
      servico: dadosCliente.servico,
      manicure: dadosCliente.manicure,
      tempoPadrao,
      tempoUsado,
      valorBruto,
      status: "Aguardando",
      horarioEstimado
    }
  };
}

function testarCadastroAtendimento() {
  const resultado = cadastrarAtendimento({
    cliente: "Cliente Teste",
    telefone: "61999999999",
    servico: "Manicure russa",
    manicure: "Celyne",
    tempoUsado: 60,
    aceitaAntecipacao: "Sim",
    observacoes: "Cadastro de teste"
  });

  Logger.log(resultado);
}


function listarFila() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  const dados = sheet.getDataRange().getValues();
  const exibidos = sheet.getDataRange().getDisplayValues();

  if (dados.length <= 1) {
    return {
      success: true,
      filas: {}
    };
  }

  const cabecalhos = dados[0];

  const idxCliente = cabecalhos.indexOf("Cliente");
  const idxWhatsapp = cabecalhos.indexOf("WhatsApp");
  const idxServico = cabecalhos.indexOf("Serviço");
  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxHorario = cabecalhos.indexOf("Horário estimado");
  const idxTempo = cabecalhos.indexOf("Tempo usado (min)");
  const idxTempoRestante = cabecalhos.indexOf("Tempo restante");
  const idxTipoAtendimento = cabecalhos.indexOf("Tipo atendimento");
  const idxId = cabecalhos.indexOf("ID");

  const filas = {};

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const linhaExibida = exibidos[i];

    const status = linha[idxStatus];

    const statusValidos = [
      "Aguardando",
      "Antecipação oferecida",
      "Recusou antecipação",
      "Confirmou retorno",
      "Chamada",
      "Em atendimento"
    ];

    if (!statusValidos.includes(status)) {
      continue;
    }

    const manicure = linha[idxManicure];

    if (!filas[manicure]) {
      filas[manicure] = [];
    }

    filas[manicure].push({
      id: linha[idxId],
      cliente: linha[idxCliente],
      whatsapp: linhaExibida[idxWhatsapp],
      servico: linha[idxServico],
      status: status,
      horarioEstimado: linhaExibida[idxHorario],
      tempoRestante: linhaExibida[idxTempoRestante],
      tipoAtendimento: linhaExibida[idxTipoAtendimento],
      tempoUsado: linha[idxTempo]
    });
  }

  Object.keys(filas).forEach(manicure => {
    filas[manicure] = filas[manicure].map((item, index) => ({
      posicao: index + 1,
      ...item
    }));
  });

  return {
    success: true,
    filas
  };
}

function testarFila() {
  Logger.log(JSON.stringify(listarFila(), null, 2));
}


function buscarAtendimentoPorId(idBuscado) {
  const fila = listarFila();

  if (!fila.success) {
    return {
      success: false,
      message: "Não foi possível carregar a fila."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");
  const dados = sheet.getDataRange().getValues();
  const exibidos = sheet.getDataRange().getDisplayValues();
  const cabecalhos = dados[0];

  const idxId = cabecalhos.indexOf("ID");
  const idxCliente = cabecalhos.indexOf("Cliente");
  const idxWhatsapp = cabecalhos.indexOf("WhatsApp");
  const idxServico = cabecalhos.indexOf("Serviço");
  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxValor = cabecalhos.indexOf("Valor bruto");
  const idxTempo = cabecalhos.indexOf("Tempo usado (min)");
  const idxHorario = cabecalhos.indexOf("Horário estimado");
  const idxTempoRestante = cabecalhos.indexOf("Tempo restante");
  const idxTipoAtendimento = cabecalhos.indexOf("Tipo atendimento");
  const idxAceita = cabecalhos.indexOf("Aceita antecipação?");

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const linhaExibida = exibidos[i];

    if (String(linha[idxId]) === String(idBuscado)) {
      const manicure = linha[idxManicure];
      const filaDaManicure = fila.filas[manicure] || [];

      const itemNaFila = filaDaManicure.find(item =>
        String(item.id) === String(idBuscado)
      );

      const posicao = itemNaFila ? itemNaFila.posicao : null;
      const pessoasNaFrente = posicao ? posicao - 1 : 0;

      return {
        success: true,
        atendimento: {
          id: linha[idxId],
          cliente: linha[idxCliente],
          whatsapp: linha[idxWhatsapp],
          servico: linha[idxServico],
          manicure: linha[idxManicure],
          status: linha[idxStatus],
          valorBruto: linha[idxValor],
          tempoUsado: linha[idxTempo],
          horarioEstimado: linhaExibida[idxHorario],
          tempoRestante: linhaExibida[idxTempoRestante],
          tipoAtendimento: linhaExibida[idxTipoAtendimento],
          aceitaAntecipacao: linha[idxAceita],
          posicao,
          pessoasNaFrente
        }
      };
    }
  }

  return {
    success: false,
    message: "Atendimento não encontrado."
  };
}

function testarBuscarAtendimento() {
  const resultado = buscarAtendimentoPorId("ND-20260516151932-321");
  Logger.log(JSON.stringify(resultado, null, 2));
}

function atualizarStatusAtendimento(idBuscado, novoStatus) {
  const statusPermitidos = [
    "Aguardando",
    "Antecipação oferecida",
    "Recusou antecipação",
    "Confirmou retorno",
    "Chamada",
    "Em atendimento",
    "Finalizada",
    "Ausente",
    "Desistiu",
    "Cancelada"
  ];

  if (!statusPermitidos.includes(novoStatus)) {
    return {
      success: false,
      message: "Status inválido."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");
  const dados = sheet.getDataRange().getValues();
  const cabecalhos = dados[0];

  const idxId = cabecalhos.indexOf("ID");
  const idxStatus = cabecalhos.indexOf("Status");

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    if (String(linha[idxId]) === String(idBuscado)) {
      sheet.getRange(i + 1, idxStatus + 1).setValue(novoStatus);

      recalcularFila();

      return {
        success: true,
        message: "Status atualizado com sucesso.",
        id: idBuscado,
        novoStatus: novoStatus
      };
    }
  }

  return {
    success: false,
    message: "Atendimento não encontrado."
  };
}

function testarAtualizarStatus() {
  const resultado = atualizarStatusAtendimento(
    "ND-20260516151932-321",
    "Chamada"
  );

  Logger.log(JSON.stringify(resultado, null, 2));
}


function testarDoGet() {
  const resultado = doGet({
    parameter: {
      action: "listarFila"
    }
  });

  Logger.log(resultado.getContent());
}

function editarAtendimento(dadosEdicao) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  const dados = sheet.getDataRange().getValues();
  const cabecalhos = dados[0];

  const idxId = cabecalhos.indexOf("ID");

  const campos = {
    "Cliente": dadosEdicao.cliente,
    "WhatsApp": dadosEdicao.telefone,
    "Serviço": dadosEdicao.servico,
    "Manicure": dadosEdicao.manicure,
    "Horário estimado": dadosEdicao.horario,
    "Tempo usado (min)": dadosEdicao.tempoUsado,
    "Aceita antecipação?": dadosEdicao.aceitaAntecipacao,
    "Observações": dadosEdicao.observacoes,
    "Tipo atendimento": dadosEdicao.tipoAtendimento
  };

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    if (String(linha[idxId]) === String(dadosEdicao.id)) {
      Object.keys(campos).forEach(nomeColuna => {
        const idx = cabecalhos.indexOf(nomeColuna);

        if (idx !== -1) {
          sheet.getRange(i + 1, idx + 1).setValue(campos[nomeColuna]);
        }
      });

      recalcularFila();

      return {
        success: true,
        message: "Atendimento atualizado com sucesso."
      };
    }
  }

  return {
    success: false,
    message: "Atendimento não encontrado."
  };
}

function atualizarInicioAtendimento(idBuscado) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");
  const dados = sheet.getDataRange().getValues();
  const cabecalhos = dados[0];

  const idxId = cabecalhos.indexOf("ID");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxInicio = cabecalhos.indexOf("Início atendimento");
  const idxFimPrevisto = cabecalhos.indexOf("Fim previsto");
  const idxTempo = cabecalhos.indexOf("Tempo usado (min)");

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][idxId]) === String(idBuscado)) {
      const tempo = Number(dados[i][idxTempo]) || 60;

      sheet.getRange(i + 1, idxStatus + 1).setValue("Em atendimento");
      sheet.getRange(i + 1, idxInicio + 1).setValue(agoraBrasilia());
      sheet.getRange(i + 1, idxFimPrevisto + 1).setValue(somarMinutosBrasilia(tempo));

      recalcularFila();

      return {
        success: true,
        message: "Atendimento iniciado com sucesso."
      };
    }
  }

  return {
    success: false,
    message: "Atendimento não encontrado."
  };
}

function parseDataBrasilia(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return valor;
  }

  const texto = String(valor);

  const partes = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
  );

  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]) - 1;
  const ano = Number(partes[3]);
  const hora = Number(partes[4]);
  const minuto = Number(partes[5]);
  const segundo = Number(partes[6]);

  return new Date(ano, mes, dia, hora, minuto, segundo);
}

function formatarTempoRestante(minutos) {
  const total = Math.max(0, Math.ceil(minutos));
  const horas = Math.floor(total / 60);
  const mins = total % 60;

  return `${String(horas).padStart(2, "0")}h${String(mins).padStart(2, "0")}`;
}

function recalcularFila() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");
  const dados = sheet.getDataRange().getValues();
  const exibidos = sheet.getDataRange().getDisplayValues();

  if (dados.length <= 1) {
    return {
      success: true,
      message: "Sem atendimentos para recalcular."
    };
  }

  const cabecalhos = dados[0];

  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxTempo = cabecalhos.indexOf("Tempo usado (min)");
  const idxInicio = cabecalhos.indexOf("Início atendimento");
  const idxTempoRestante = cabecalhos.indexOf("Tempo restante");
  const idxOrdem = cabecalhos.indexOf("Ordem fila");

  const statusAtivos = [
    "Aguardando",
    "Antecipação oferecida",
    "Confirmou retorno",
    "Chamada",
    "Em atendimento"
  ];

  const acumuladoPorManicure = {};
  const agora = new Date();

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const linhaExibida = exibidos[i];

    const status = linha[idxStatus];
    const manicure = linha[idxManicure];

    if (!statusAtivos.includes(status)) {
      if (idxTempoRestante !== -1) {
        sheet.getRange(i + 1, idxTempoRestante + 1).setValue("");
      }

      if (idxOrdem !== -1) {
        sheet.getRange(i + 1, idxOrdem + 1).setValue("");
      }

      continue;
    }

    if (!acumuladoPorManicure[manicure]) {
      acumuladoPorManicure[manicure] = 0;
    }

    const acumuladoAntes = acumuladoPorManicure[manicure];

    let tempoParaSomar = Number(linha[idxTempo]) || 60;

    if (status === "Em atendimento") {
      const inicio = parseDataBrasilia(linhaExibida[idxInicio]);
      const tempoTotal = Number(linha[idxTempo]) || 60;

      if (inicio) {
        const fim = new Date(inicio.getTime() + tempoTotal * 60000);
        tempoParaSomar = Math.max(
          0,
          Math.ceil((fim.getTime() - agora.getTime()) / 60000)
        );
      }
    }

    const tempoRestanteCliente =
      status === "Em atendimento"
        ? tempoParaSomar
        : acumuladoAntes;

    acumuladoPorManicure[manicure] += tempoParaSomar;

    if (idxTempoRestante !== -1) {
      sheet
        .getRange(i + 1, idxTempoRestante + 1)
        .setValue(formatarTempoRestante(tempoRestanteCliente));
    }

    if (idxOrdem !== -1) {
      sheet.getRange(i + 1, idxOrdem + 1).setValue(i);
    }
  }

  return {
    success: true,
    message: "Fila recalculada com sucesso."
  };
}

function agoraBrasilia() {
  const agora = new Date();

  return Utilities.formatDate(
    agora,
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
}

function somarMinutosBrasilia(minutos) {
  const agora = new Date();
  const futuro = new Date(agora.getTime() + minutos * 60000);

  return Utilities.formatDate(
    futuro,
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
}

function finalizarAtendimentoCaixa(dadosCaixa) {
  if (!dadosCaixa.id) {
    return {
      success: false,
      message: "ID do atendimento não informado."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  if (!sheet) {
    return {
      success: false,
      message: 'Aba "Atendimentos" não encontrada.'
    };
  }

  const dados = sheet.getDataRange().getValues();
  const cabecalhos = dados[0];

  const idxId = cabecalhos.indexOf("ID");
  const idxStatus = cabecalhos.indexOf("Status");

  if (idxId === -1 || idxStatus === -1) {
    return {
      success: false,
      message: "Colunas obrigatórias ID ou Status não encontradas."
    };
  }

  const formaPagamento = dadosCaixa.formaPagamento || "";
  const valorBruto = Number(String(dadosCaixa.valorBruto || "0").replace(",", "."));
  const taxaPercentual = Number(String(dadosCaixa.taxaPercentual || "0").replace(",", "."));
  const valorTaxa = Number(String(dadosCaixa.valorTaxa || "0").replace(",", "."));

  let valorLiquido = Number(String(dadosCaixa.valorLiquido || "0").replace(",", "."));

  if (!valorLiquido && valorBruto) {
    valorLiquido = valorBruto - valorTaxa;
  }

  const camposParaAtualizar = {
    "Status": "Finalizada",
    "Valor bruto": valorBruto,
    "Forma pagamento": formaPagamento,
    "Bandeira/Tipo": dadosCaixa.bandeiraTipo || "",
    "Parcelas": dadosCaixa.parcelas || "",
    "Taxa %": taxaPercentual,
    "Valor taxa": valorTaxa,
    "Valor líquido": valorLiquido
  };

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];

    if (String(linha[idxId]) === String(dadosCaixa.id)) {
      Object.keys(camposParaAtualizar).forEach(nomeColuna => {
        const idx = cabecalhos.indexOf(nomeColuna);

        if (idx !== -1) {
          sheet.getRange(i + 1, idx + 1).setValue(camposParaAtualizar[nomeColuna]);
        }
      });

      recalcularFila();

      return {
        success: true,
        message: "Atendimento finalizado com sucesso.",
        id: dadosCaixa.id,
        status: "Finalizada",
        caixa: {
          valorBruto,
          formaPagamento,
          taxaPercentual,
          valorTaxa,
          valorLiquido
        }
      };
    }
  }

  return {
    success: false,
    message: "Atendimento não encontrado."
  };
}


function testarFinalizarAtendimentoCaixa() {
  const resultado = finalizarAtendimentoCaixa({
    id: "ND-20260523173219-690",
    valorBruto: "100",
    formaPagamento: "Pix",
    bandeiraTipo: "",
    parcelas: "",
    taxaPercentual: "0",
    valorTaxa: "0",
    valorLiquido: "100"
  });

  Logger.log(JSON.stringify(resultado, null, 2));
}

function resumoCaixaDia(dataParametro) {
  const dataFiltro = normalizarDataResumo(dataParametro);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  if (!sheet) {
    return {
      success: false,
      message: 'Aba "Atendimentos" não encontrada.'
    };
  }

  const dados = sheet.getDataRange().getValues();
  const exibidos = sheet.getDataRange().getDisplayValues();

  if (dados.length <= 1) {
    return montarResumoVazio(dataFiltro);
  }

  const cabecalhos = dados[0];

  const idxData = cabecalhos.indexOf("Data");
  const idxId = cabecalhos.indexOf("ID");
  const idxCliente = cabecalhos.indexOf("Cliente");
  const idxServico = cabecalhos.indexOf("Serviço");
  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxValorBruto = cabecalhos.indexOf("Valor bruto");
  const idxFormaPagamento = cabecalhos.indexOf("Forma pagamento");
  const idxValorTaxa = cabecalhos.indexOf("Valor taxa");
  const idxValorLiquido = cabecalhos.indexOf("Valor líquido");

  const colunasObrigatorias = {
    Data: idxData,
    ID: idxId,
    Cliente: idxCliente,
    Serviço: idxServico,
    Manicure: idxManicure,
    Status: idxStatus,
    "Valor bruto": idxValorBruto,
    "Forma pagamento": idxFormaPagamento,
    "Valor taxa": idxValorTaxa,
    "Valor líquido": idxValorLiquido
  };

  const colunaFaltando = Object.keys(colunasObrigatorias).find(nome => colunasObrigatorias[nome] === -1);

  if (colunaFaltando) {
    return {
      success: false,
      message: `Coluna obrigatória não encontrada: ${colunaFaltando}`
    };
  }

  const statusAtendida = "Finalizada";
  const statusNaoAtendidas = ["Ausente", "Desistiu", "Cancelada"];
  const statusConsiderados = [statusAtendida, ...statusNaoAtendidas];

  const resumo = {
    totalAtendidas: 0,
    totalNaoAtendidas: 0,
    totalRegistros: 0,
    totalBruto: 0,
    totalTaxas: 0,
    totalLiquido: 0
  };

  const porPagamento = {
    Pix: criarResumoPagamento(),
    Dinheiro: criarResumoPagamento(),
    Débito: criarResumoPagamento(),
    Crédito: criarResumoPagamento(),
    Outros: criarResumoPagamento()
  };

  const porStatus = {
    Finalizada: 0,
    Ausente: 0,
    Desistiu: 0,
    Cancelada: 0
  };

  const registros = [];

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const linhaExibida = exibidos[i];

    const dataLinha = String(linhaExibida[idxData]).trim();
    const status = String(linha[idxStatus]).trim();

    if (dataLinha !== dataFiltro.br) {
      continue;
    }

    if (!statusConsiderados.includes(status)) {
      continue;
    }

    const valorBruto = parseNumeroResumo(linha[idxValorBruto]);
    const valorTaxa = parseNumeroResumo(linha[idxValorTaxa]);
    const valorLiquido = parseNumeroResumo(linha[idxValorLiquido]);

    const formaPagamentoOriginal = String(linha[idxFormaPagamento] || "").trim();
    const formaPagamento = normalizarFormaPagamentoResumo(formaPagamentoOriginal);

    if (status === statusAtendida) {
      resumo.totalAtendidas++;
      resumo.totalBruto += valorBruto;
      resumo.totalTaxas += valorTaxa;
      resumo.totalLiquido += valorLiquido;

      porPagamento[formaPagamento].quantidade++;
      porPagamento[formaPagamento].totalBruto += valorBruto;
      porPagamento[formaPagamento].totalTaxas += valorTaxa;
      porPagamento[formaPagamento].totalLiquido += valorLiquido;
    }

    if (statusNaoAtendidas.includes(status)) {
      resumo.totalNaoAtendidas++;
    }

    porStatus[status]++;
    resumo.totalRegistros++;

    registros.push({
      id: linha[idxId],
      cliente: linha[idxCliente],
      servico: linha[idxServico],
      manicure: linha[idxManicure],
      status,
      valorBruto,
      formaPagamento: formaPagamentoOriginal || "",
      valorTaxa,
      valorLiquido
    });
  }

  return {
    success: true,
    data: dataFiltro.iso,
    dataBr: dataFiltro.br,
    resumo,
    porPagamento,
    porStatus,
    registros
  };
}

function criarResumoPagamento() {
  return {
    quantidade: 0,
    totalBruto: 0,
    totalTaxas: 0,
    totalLiquido: 0
  };
}

function montarResumoVazio(dataFiltro) {
  return {
    success: true,
    data: dataFiltro.iso,
    dataBr: dataFiltro.br,
    resumo: {
      totalAtendidas: 0,
      totalNaoAtendidas: 0,
      totalRegistros: 0,
      totalBruto: 0,
      totalTaxas: 0,
      totalLiquido: 0
    },
    porPagamento: {
      Pix: criarResumoPagamento(),
      Dinheiro: criarResumoPagamento(),
      Débito: criarResumoPagamento(),
      Crédito: criarResumoPagamento(),
      Outros: criarResumoPagamento()
    },
    porStatus: {
      Finalizada: 0,
      Ausente: 0,
      Desistiu: 0,
      Cancelada: 0
    },
    registros: []
  };
}

function normalizarDataResumo(dataParametro) {
  const timezone = "America/Sao_Paulo";

  if (!dataParametro) {
    const hoje = new Date();

    return {
      iso: Utilities.formatDate(hoje, timezone, "yyyy-MM-dd"),
      br: Utilities.formatDate(hoje, timezone, "dd/MM/yyyy")
    };
  }

  const texto = String(dataParametro).trim();

  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const ano = isoMatch[1];
    const mes = isoMatch[2];
    const dia = isoMatch[3];

    return {
      iso: `${ano}-${mes}-${dia}`,
      br: `${dia}/${mes}/${ano}`
    };
  }

  const brMatch = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const dia = brMatch[1];
    const mes = brMatch[2];
    const ano = brMatch[3];

    return {
      iso: `${ano}-${mes}-${dia}`,
      br: `${dia}/${mes}/${ano}`
    };
  }

  return {
    iso: texto,
    br: texto
  };
}

function parseNumeroResumo(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  let texto = String(valor).trim();

  texto = texto.replace(/[^\d,.-]/g, "");

  if (!texto) {
    return 0;
  }

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : 0;
}

function normalizarFormaPagamentoResumo(formaPagamento) {
  const forma = String(formaPagamento || "").trim().toLowerCase();

  if (forma === "pix") return "Pix";
  if (forma === "dinheiro") return "Dinheiro";
  if (forma === "débito" || forma === "debito") return "Débito";
  if (forma === "crédito" || forma === "credito") return "Crédito";

  return "Outros";
}

function testarResumoCaixaDia() {
  const resultado = resumoCaixaDia("2026-07-09");
  Logger.log(JSON.stringify(resultado, null, 2));
}

function resumoCaixaPeriodo(dataInicioParametro, dataFimParametro) {
  const dataInicio = normalizarDataResumo(dataInicioParametro);
  const dataFim = normalizarDataResumo(dataFimParametro || dataInicioParametro);

  if (dataFim.iso < dataInicio.iso) {
    return {
      success: false,
      message: "A data final não pode ser menor que a data inicial."
    };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Atendimentos");

  if (!sheet) {
    return {
      success: false,
      message: 'Aba "Atendimentos" não encontrada.'
    };
  }

  const dados = sheet.getDataRange().getValues();
  const exibidos = sheet.getDataRange().getDisplayValues();

  if (dados.length <= 1) {
    return montarResumoPeriodoVazio(dataInicio, dataFim);
  }

  const cabecalhos = dados[0];

  const idxData = cabecalhos.indexOf("Data");
  const idxId = cabecalhos.indexOf("ID");
  const idxCliente = cabecalhos.indexOf("Cliente");
  const idxServico = cabecalhos.indexOf("Serviço");
  const idxManicure = cabecalhos.indexOf("Manicure");
  const idxStatus = cabecalhos.indexOf("Status");
  const idxValorBruto = cabecalhos.indexOf("Valor bruto");
  const idxFormaPagamento = cabecalhos.indexOf("Forma pagamento");
  const idxValorTaxa = cabecalhos.indexOf("Valor taxa");
  const idxValorLiquido = cabecalhos.indexOf("Valor líquido");

  const colunasObrigatorias = {
    Data: idxData,
    ID: idxId,
    Cliente: idxCliente,
    Serviço: idxServico,
    Manicure: idxManicure,
    Status: idxStatus,
    "Valor bruto": idxValorBruto,
    "Forma pagamento": idxFormaPagamento,
    "Valor taxa": idxValorTaxa,
    "Valor líquido": idxValorLiquido
  };

  const colunaFaltando = Object.keys(colunasObrigatorias).find(nome => {
    return colunasObrigatorias[nome] === -1;
  });

  if (colunaFaltando) {
    return {
      success: false,
      message: `Coluna obrigatória não encontrada: ${colunaFaltando}`
    };
  }

  const statusAtendida = "Finalizada";
  const statusNaoAtendidas = ["Ausente", "Desistiu", "Cancelada"];
  const statusConsiderados = [statusAtendida, ...statusNaoAtendidas];

  const resumo = {
    totalAtendidas: 0,
    totalNaoAtendidas: 0,
    totalRegistros: 0,
    totalBruto: 0,
    totalTaxas: 0,
    totalLiquido: 0
  };

  const porPagamento = {
    Pix: criarResumoPagamento(),
    Dinheiro: criarResumoPagamento(),
    Débito: criarResumoPagamento(),
    Crédito: criarResumoPagamento(),
    Outros: criarResumoPagamento()
  };

  const porStatus = {
    Finalizada: 0,
    Ausente: 0,
    Desistiu: 0,
    Cancelada: 0
  };

  const registros = [];

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const linhaExibida = exibidos[i];

    const dataLinhaBr = String(linhaExibida[idxData]).trim();
    const dataLinha = normalizarDataResumo(dataLinhaBr);
    const status = String(linha[idxStatus]).trim();

    if (dataLinha.iso < dataInicio.iso || dataLinha.iso > dataFim.iso) {
      continue;
    }

    if (!statusConsiderados.includes(status)) {
      continue;
    }

    const valorBruto = parseNumeroResumo(linha[idxValorBruto]);
    const valorTaxa = parseNumeroResumo(linha[idxValorTaxa]);
    const valorLiquido = parseNumeroResumo(linha[idxValorLiquido]);

    const formaPagamentoOriginal = String(linha[idxFormaPagamento] || "").trim();
    const formaPagamento = normalizarFormaPagamentoResumo(formaPagamentoOriginal);

    if (status === statusAtendida) {
      resumo.totalAtendidas++;
      resumo.totalBruto += valorBruto;
      resumo.totalTaxas += valorTaxa;
      resumo.totalLiquido += valorLiquido;

      porPagamento[formaPagamento].quantidade++;
      porPagamento[formaPagamento].totalBruto += valorBruto;
      porPagamento[formaPagamento].totalTaxas += valorTaxa;
      porPagamento[formaPagamento].totalLiquido += valorLiquido;
    }

    if (statusNaoAtendidas.includes(status)) {
      resumo.totalNaoAtendidas++;
    }

    porStatus[status]++;
    resumo.totalRegistros++;

    registros.push({
      id: linha[idxId],
      data: dataLinha.iso,
      dataBr: dataLinha.br,
      cliente: linha[idxCliente],
      servico: linha[idxServico],
      manicure: linha[idxManicure],
      status,
      valorBruto,
      formaPagamento: formaPagamentoOriginal || "",
      valorTaxa,
      valorLiquido
    });
  }

  return {
    success: true,
    dataInicio: dataInicio.iso,
    dataFim: dataFim.iso,
    dataInicioBr: dataInicio.br,
    dataFimBr: dataFim.br,
    resumo,
    porPagamento,
    porStatus,
    registros
  };
}

function montarResumoPeriodoVazio(dataInicio, dataFim) {
  return {
    success: true,
    dataInicio: dataInicio.iso,
    dataFim: dataFim.iso,
    dataInicioBr: dataInicio.br,
    dataFimBr: dataFim.br,
    resumo: {
      totalAtendidas: 0,
      totalNaoAtendidas: 0,
      totalRegistros: 0,
      totalBruto: 0,
      totalTaxas: 0,
      totalLiquido: 0
    },
    porPagamento: {
      Pix: criarResumoPagamento(),
      Dinheiro: criarResumoPagamento(),
      Débito: criarResumoPagamento(),
      Crédito: criarResumoPagamento(),
      Outros: criarResumoPagamento()
    },
    porStatus: {
      Finalizada: 0,
      Ausente: 0,
      Desistiu: 0,
      Cancelada: 0
    },
    registros: []
  };
}

function testarResumoCaixaPeriodo() {
  const resultado = resumoCaixaPeriodo("2026-07-04", "2026-07-09");
  Logger.log(JSON.stringify(resultado, null, 2));
}