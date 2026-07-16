// ==============================
// cliente.js HÍBRIDO - Nail Dreams
// ==============================

const params = new URLSearchParams(window.location.search);
const atendimentoId = params.get("id");

let atendimentoAtual = null;

function mostrarErroAtendimento(mensagem) {
  document.getElementById("statusTitulo").textContent = mensagem;
  document.querySelector(".cliente-info").style.display = "none";
  document.querySelector(".cliente-actions").innerHTML = "";
  document.querySelector(".contador-box").innerHTML = `<strong style="font-size: 36px;">--</strong>`;
}

async function carregarAtendimento() {
  if (!atendimentoId) {
    mostrarErroAtendimento("Link de atendimento invalido. Solicite um novo link na recepcao.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}?action=buscarAtendimento&id=${atendimentoId}`);
    if (!resposta.ok) {
      mostrarErroAtendimento("Nao foi possivel carregar seu atendimento agora. Tente novamente em alguns instantes.");
      return;
    }

    const dados = await resposta.json();

    if (!dados.success || !dados.atendimento) {
      mostrarErroAtendimento(dados.message || "Atendimento nao encontrado. Solicite um novo link na recepcao.");
      return;
    }

    atendimentoAtual = dados.atendimento;

    renderizarTela(atendimentoAtual);

  } catch (erro) {
    console.error(erro);
    mostrarErroAtendimento("Nao foi possivel carregar seu atendimento agora. Verifique sua conexao e tente novamente.");
  }
}

function renderizarTela(item) {
  const clienteEl = document.getElementById("cliente");
  const servicoEl = document.getElementById("servico");
  const manicureEl = document.getElementById("manicure");
  const horarioEl = document.getElementById("horario");
  const contadorBox = document.querySelector(".contador-box");
  const clienteActions = document.querySelector(".cliente-actions");
  const statusTitulo = document.getElementById("statusTitulo");
  const horarioBox = horarioEl.closest("div");
  const dataBox = document.getElementById("dataAtendimentoBox");
  const dataEl = document.getElementById("dataAtendimento");
  document.querySelector(".cliente-info").style.display = "";
  contadorBox.classList.remove("resumo-agendado");
  dataBox.hidden = true;

  // Preencher dados básicos
  clienteEl.textContent = item.cliente || "--";
  servicoEl.textContent = item.servico || "--";
  manicureEl.textContent = item.manicure || "--";

  // Limpar os botões antes de renderizar
  clienteActions.innerHTML = "";

  // ------------------------
  // Cliente Ausente
  if (item.status === "Ausente") {
    // Oculta info que não é relevante
    document.querySelector(".cliente-info").style.display = "none";

    // Emoji centralizado e maior
    contadorBox.innerHTML = `<div class="emoji-container" style="font-size:80px;">😢</div>`;

    statusTitulo.textContent = "Sentimos sua ausência. Ficamos tristes por não vê-la hoje, mas teremos prazer em atendê-la em outro momento!";

    // Botões Instagram e Reagendar
    clienteActions.innerHTML = `
      <button type="button" class="btn-instagram" onclick="abrirInstagram()">Instagram</button>
      <button type="button" class="btn-reagendar" onclick="reagendarAusente('${item.id}')">Reagendar</button>
    `;
  }
  // ------------------------
  // Cliente Agendada (o status operacional normalmente continua como Aguardando)
  else if (item.tipoAtendimento === "Agendado" || item.status === "Agendado") {
    const dataFormatada = formatarDataAtendimento(item.dataAtendimento || item.data_atendimento);
    const horaFormatada = item.horaAtendimento || item.hora_atendimento || item.horarioEstimado || "Horário não informado";

    contadorBox.classList.add("resumo-agendado");
    contadorBox.innerHTML = `<span>Agendado para</span>
      <strong>${dataFormatada || "Data não informada"}</strong>
      <span>às ${horaFormatada}</span>`;
    statusTitulo.textContent = "Seu horário está agendado.";
    dataBox.hidden = false;
    dataEl.textContent = dataFormatada || "Data não informada";
    horarioBox.querySelector("span").textContent = "Horário do atendimento";
    horarioEl.textContent = horaFormatada;
    document.getElementById("textoCancelar").textContent = "Essa ação cancelará seu horário agendado. Deseja continuar?";

    clienteActions.innerHTML = `
      <button type="button" class="btn-reagendar" onclick="abrirModalReagendar()">Reagendar</button>
      <button type="button" class="btn-cancelar" onclick="abrirModalCancelar()">Cancelar</button>
    `;
  }
  // ------------------------
  // Fila de Espera
  else {
    const pessoas = item.pessoasNaFrente || 0;
    contadorBox.classList.remove("resumo-agendado");
    contadorBox.style.display = "flex";
    contadorBox.innerHTML = `<strong style="font-size: 54px;">${pessoas}</strong>
                             <span>Pessoas à sua frente</span>`;
    statusTitulo.textContent = "Você está na fila de espera. Acompanhe sua posição na fila.";
    dataBox.hidden = true;
    horarioBox.querySelector("span").textContent = "Tempo restante";
    horarioEl.textContent = item.tempoRestante || "--:--";
    document.getElementById("textoCancelar").textContent = "Essa ação retirará seu nome da fila. Deseja continuar?";

    // Botões Reagendar / Cancelar
    clienteActions.innerHTML = `
      <button type="button" class="btn-reagendar" onclick="abrirModalReagendar()">Reagendar</button>
      <button type="button" class="btn-cancelar" onclick="abrirModalCancelar()">Cancelar</button>
    `;
  }
}

// ------------------------
// Funções gerais
function reagendarAusente(id) {
  const numeroLoja = "5561983740873"; // WhatsApp da loja
  const mensagem = `Olá! Não pude comparecer ao meu atendimento com ID ${id}. Gostaria de reagendar, por favor.`;
  window.open(`https://wa.me/${numeroLoja}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

function abrirInstagram() {
  window.open("https://www.instagram.com/naildreams.bsb/", "_blank");
}

function abrirGoogle() {
  window.open("https://g.page/r/CQGUQrYpI28IEAI/review", "_blank");
}

// Funções Reagendar / Cancelar fila
function abrirModalCancelar() {
  document.getElementById("modalCancelar").classList.add("ativo");
}

function abrirModalReagendar() {
  document.getElementById("modalReagendar").classList.add("ativo");
  carregarHorariosDisponiveis();
}

function fecharModais() {
  document.querySelectorAll(".modal").forEach(modal => modal.classList.remove("ativo"));
}

async function confirmarCancelamento() {
  try {
    await fetch(`${API_URL}?action=atualizarStatus&id=${atendimentoId}&status=Cancelada`);
    alert("Seu atendimento foi cancelado.");
    window.location.reload();
  } catch (erro) {
    console.error(erro);
  }
}

function carregarHorariosDisponiveis() {
  const horarios = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00"];
  const grid = document.getElementById("horariosGrid");
  grid.innerHTML = "";
  horarios.forEach(horario => {
    const button = document.createElement("button");
    button.textContent = horario;
    button.onclick = () => solicitarReagendamento(horario);
    grid.appendChild(button);
  });
}

async function solicitarReagendamento(horario) {
  try {
    await fetch(`${API_URL}?action=reagendar&id=${atendimentoId}&horario=${horario}`);
    alert(`Solicitação de reagendamento enviada para ${horario}.`);
    fecharModais();
    window.location.reload();
  } catch (erro) {
    console.error(erro);
  }
}

// ------------------------
// Atualiza tela a cada 15s
if (atendimentoId) {
  setInterval(carregarAtendimento, 15000);
}

function formatarDataAtendimento(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[1]}/${br[2]}/${br[3]}` : texto;
}

// Inicializa ao carregar a página
carregarAtendimento();
