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
  document.querySelector(".cliente-info").style.display = "";

  // Preencher dados básicos
  clienteEl.textContent = item.cliente || "--";
  servicoEl.textContent = item.servico || "--";
  manicureEl.textContent = item.manicure || "--";

  // Limpar os botões antes de renderizar
  clienteActions.innerHTML = "";

  // ------------------------
  // Cliente Agendada
  if (item.status === "Agendado") {
    contadorBox.innerHTML = `<strong style="font-size: 68px;">❤️</strong>`;
    statusTitulo.textContent = "Seu horário está confirmado. Prepare-se para uma experiência incrível! 💅";
    horarioBox.querySelector("span").textContent = "Horário agendado";
    horarioEl.textContent = item.horarioEstimado || "--:--";

    // Botões: Instagram e Reagendar
    clienteActions.innerHTML = `
      <button type="button" class="btn-instagram" onclick="abrirInstagram()">Instagram</button>
      <button type="button" class="btn-reagendar" onclick="abrirGoogle()">Avaliar no Google</button>
    `;
  }
  // ------------------------
  // Cliente Ausente
  else if (item.status === "Ausente") {
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
  // Fila de Espera
  else {
    const pessoas = item.pessoasNaFrente || 0;
    contadorBox.style.display = "flex";
    contadorBox.innerHTML = `<strong style="font-size: 54px;">${pessoas}</strong>
                             <span>Pessoas à sua frente</span>`;
    statusTitulo.textContent =
      pessoas === 0
        ? "Seu atendimento está próximo."
        : "Acompanhe sua fila em tempo real.";
    horarioBox.querySelector("span").textContent = "Tempo restante";
    horarioEl.textContent = item.tempoRestante || "--:--";

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

// Inicializa ao carregar a página
carregarAtendimento();
