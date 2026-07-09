// ==============================
// Resumo do Caixa - Nail Dreams
// ==============================

async function api(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const resposta = await fetch(url, { signal: controller.signal });

    if (!resposta.ok) {
      throw new Error("Nao foi possivel conectar com a API. Tente novamente.");
    }

    try {
      return await resposta.json();
    } catch (erro) {
      throw new Error("A API retornou uma resposta invalida. Tente novamente.");
    }
  } catch (erro) {
    if (erro.name === "AbortError") {
      throw new Error("A conexao demorou demais. Verifique a internet e tente novamente.");
    }
    throw erro;
  } finally {
    clearTimeout(timeoutId);
  }
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const formasPagamento = ["Pix", "Dinheiro", "Débito", "Crédito", "Outros"];
const statusResumo = ["Finalizada", "Ausente", "Desistiu", "Cancelada"];

function valorNumerico(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function formatarMoeda(valor) {
  return moeda.format(valorNumerico(valor));
}

function hojeISO() {
  const hoje = new Date();
  const offset = hoje.getTimezoneOffset() * 60000;
  return new Date(hoje.getTime() - offset).toISOString().slice(0, 10);
}

function texto(valor, fallback = "-") {
  return valor === null || valor === undefined || valor === "" ? fallback : String(valor);
}

function escaparHtml(valor) {
  return texto(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}

function normalizarPagamento(valor) {
  if (valor && typeof valor === "object") {
    return {
      quantidade: valorNumerico(valor.quantidade),
      totalBruto: valorNumerico(valor.totalBruto),
      totalTaxas: valorNumerico(valor.totalTaxas),
      totalLiquido: valorNumerico(valor.totalLiquido)
    };
  }

  return {
    quantidade: valorNumerico(valor),
    totalBruto: 0,
    totalTaxas: 0,
    totalLiquido: 0
  };
}

function renderizarTotais(resumo = {}) {
  setTexto("totalAtendidas", valorNumerico(resumo.totalAtendidas));
  setTexto("totalNaoAtendidas", valorNumerico(resumo.totalNaoAtendidas));
  setTexto("totalRegistros", valorNumerico(resumo.totalRegistros));
  setTexto("totalBruto", formatarMoeda(resumo.totalBruto));
  setTexto("totalTaxas", formatarMoeda(resumo.totalTaxas));
  setTexto("totalLiquido", formatarMoeda(resumo.totalLiquido));
}

function renderizarPagamentos(porPagamento = {}) {
  const container = document.getElementById("resumoPagamentos");

  container.innerHTML = formasPagamento.map(forma => {
    const dados = normalizarPagamento(porPagamento[forma]);
    const valores = [
      `Bruto ${formatarMoeda(dados.totalBruto)}`,
      `Taxas ${formatarMoeda(dados.totalTaxas)}`,
      `Líquido ${formatarMoeda(dados.totalLiquido)}`
    ].join(" · ");

    return `<div class="resumo-item">
      <span>${escaparHtml(forma)}</span>
      <strong>${dados.quantidade}</strong>
      <small>${escaparHtml(valores)}</small>
    </div>`;
  }).join("");
}

function renderizarStatus(porStatus = {}) {
  const container = document.getElementById("resumoStatus");

  container.innerHTML = statusResumo.map(status => `<div class="resumo-item">
    <span>${escaparHtml(status)}</span>
    <strong>${valorNumerico(porStatus[status])}</strong>
  </div>`).join("");
}

function renderizarTabela(registros = []) {
  const corpo = document.getElementById("resumoTabela");
  const vazio = document.getElementById("resumoVazio");
  const temRegistros = registros.length > 0;

  vazio.classList.toggle("ativo", !temRegistros);

  corpo.innerHTML = registros.map(item => `<tr>
    <td>${escaparHtml(item.dataBr || item.data)}</td>
    <td>${escaparHtml(item.cliente)}</td>
    <td>${escaparHtml(item.servico)}</td>
    <td>${escaparHtml(item.manicure)}</td>
    <td>${escaparHtml(item.status)}</td>
    <td class="valor">${formatarMoeda(item.valorBruto)}</td>
    <td>${escaparHtml(item.formaPagamento)}</td>
    <td class="valor">${formatarMoeda(item.valorTaxa)}</td>
    <td class="valor">${formatarMoeda(item.valorLiquido)}</td>
  </tr>`).join("");
}

function renderizarResumo(dados) {
  renderizarTotais(dados.resumo || {});
  renderizarPagamentos(dados.porPagamento || {});
  renderizarStatus(dados.porStatus || {});
  renderizarTabela(Array.isArray(dados.registros) ? dados.registros : []);
  const periodo = dados.dataInicioBr && dados.dataFimBr
    ? `${dados.dataInicioBr} a ${dados.dataFimBr}`
    : "";
  setTexto("dataResumoLabel", periodo);
}

function setLoading(carregando) {
  const botao = document.getElementById("btnBuscarResumo");
  botao.disabled = carregando;
  botao.textContent = carregando ? "Carregando..." : "Buscar resumo";
}

function setFeedback(mensagem, tipo = "") {
  const feedback = document.getElementById("resumoFeedback");
  feedback.textContent = mensagem;
  feedback.classList.toggle("erro", tipo === "erro");
}

async function carregarResumo() {
  const dataInicio = document.getElementById("dataInicio").value || hojeISO();
  const dataFim = document.getElementById("dataFim").value || hojeISO();

  if (dataFim < dataInicio) {
    setFeedback("A data final nao pode ser menor que a data inicial.", "erro");
    return;
  }

  setLoading(true);
  setFeedback("Buscando resumo do caixa...");

  try {
    const dados = await api("resumoCaixaPeriodo", { dataInicio, dataFim });

    if (!dados.success) {
      throw new Error(dados.message || "Nao foi possivel carregar o resumo do caixa.");
    }

    renderizarResumo(dados);

    const registros = Array.isArray(dados.registros) ? dados.registros.length : 0;
    const periodo = dados.dataInicioBr && dados.dataFimBr
      ? `${dados.dataInicioBr} a ${dados.dataFimBr}`
      : `${dataInicio} a ${dataFim}`;
    setFeedback(registros ? `Resumo carregado para ${periodo}.` : "Nenhum registro encontrado para este período.");
  } catch (erro) {
    console.error("Erro ao carregar resumo do caixa:", erro);
    setFeedback(erro.message || "Nao foi possivel carregar o resumo do caixa. Tente novamente.", "erro");
    renderizarResumo({
      resumo: {},
      porPagamento: {},
      porStatus: {},
      registros: []
    });
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const hoje = hojeISO();
  document.getElementById("dataInicio").value = hoje;
  document.getElementById("dataFim").value = hoje;
  document.getElementById("btnBuscarResumo").addEventListener("click", carregarResumo);
  carregarResumo();
});
