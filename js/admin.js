// ==============================
// Admin.js final completo - Nail Dreams
// ==============================

// API helper
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

// ------------------------------
// Função genérica para travar botões
async function executarBotao(botao, callback) {
  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = "Carregando...";
  try { await callback(); } 
  catch(e) {
    console.error(e);
    alert(e.message || "Nao foi possivel concluir a acao. Tente novamente.");
  }
  finally { 
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

function montarLinkWhatsApp(telefone, mensagem) {
  const numero = String(telefone || "").replace(/\D/g, "");
  if (!numero) return "";

  const numeroComPais = numero.startsWith("55") ? numero : `55${numero}`;
  return `https://wa.me/${numeroComPais}?text=${encodeURIComponent(mensagem)}`;
}

function montarLinkCliente(id) {
  return `${window.location.origin}${window.location.pathname.replace("admin.html", "cliente.html")}?id=${encodeURIComponent(id)}`;
}

function montarMensagemConfirmacao(atendimento, linkCliente) {
  const agendado = atendimento.tipoAtendimento === "Agendado";
  const linhas = [
    `Olá, ${atendimento.cliente}!`,
    agendado
      ? "Seu atendimento Nail Dreams foi agendado com sucesso."
      : "Seu atendimento Nail Dreams foi registrado na fila de espera.",
    "",
    `Serviço: ${atendimento.servico}`,
    `Manicure: ${atendimento.manicure}`
  ];

  if (agendado) {
    linhas.push(`Data: ${formatarDataAtendimento(atendimento.dataAtendimento) || "Não informada"}`);
    linhas.push(`Horário: ${atendimento.horaAtendimento || atendimento.horarioEstimado || "Não informado"}`);
  }

  linhas.push("", "Acompanhe seu atendimento aqui:", linkCliente);
  return linhas.join("\n");
}

function normalizarDataInput(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

function formatarDataAtendimento(valor) {
  const data = normalizarDataInput(valor);
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function atualizarCamposAgendamento(prefixo = "") {
  const editando = prefixo === "edit";
  const tipo = document.getElementById(editando ? "editTipoAtendimento" : "tipoAtendimento").value;
  const bloco = document.getElementById(editando ? "editCamposAgendamento" : "camposAgendamento");
  const data = document.getElementById(editando ? "editDataAtendimento" : "dataAtendimento");
  const hora = document.getElementById(editando ? "editHoraAtendimento" : "horaAtendimento");
  const agendado = tipo === "Agendado";
  bloco.hidden = !agendado;
  data.required = agendado;
  hora.required = agendado;
  if (!agendado) { data.value = ""; hora.value = ""; }
}

function validarAgendamento(tipo, data, hora, mensagemId) {
  const mensagem = document.getElementById(mensagemId);
  mensagem.hidden = true;
  mensagem.textContent = "";
  if (tipo !== "Agendado") return true;
  if (!data) mensagem.textContent = "Informe a data do atendimento agendado.";
  else if (!hora) mensagem.textContent = "Informe o horário do atendimento agendado.";
  else return true;
  mensagem.hidden = false;
  return false;
}

// ------------------------------
// Carregar serviços e manicures
async function carregarServicos() {
  const dados = await api("listarServicos");
  const select = document.getElementById("servico");
  const editSelect = document.getElementById("editServico");
  select.innerHTML = `<option value="">Selecione o serviço</option>`;
  editSelect.innerHTML = `<option value="">Selecione o serviço</option>`;
  dados.data.filter(s => s.Status === "Ativo").forEach(s => {
    const option = document.createElement("option");
    option.value = s.Serviço;
    option.textContent = `${s.Serviço} — R$ ${s["Valor bruto"]}`;
    option.dataset.tempo = s["Tempo padrão (min)"];
    select.appendChild(option);
    editSelect.appendChild(option.cloneNode(true));
  });
  select.addEventListener("change", () => {
    const opt = select.options[select.selectedIndex];
    document.getElementById("tempoUsado").value = opt.dataset.tempo || 60;
  });
}

async function carregarManicures() {
  const dados = await api("listarManicures");
  const select = document.getElementById("manicure");
  const editSelect = document.getElementById("editManicure");
  select.innerHTML = `<option value="">Selecione a manicure</option>`;
  editSelect.innerHTML = `<option value="">Selecione a manicure</option>`;
  dados.data.filter(m => m.Status === "Disponível").forEach(m => {
    const option = document.createElement("option");
    option.value = m.Nome;
    option.textContent = m.Nome;
    select.appendChild(option);
    editSelect.appendChild(option.cloneNode(true));
  });
}

// ------------------------------
// Alternar card (dropdown)
function alternarCard(botao) {
  const card = botao.closest(".fila-card");
  if (!card) return;
  card.classList.toggle("aberto");
}

// ------------------------------
// Criar card de atendimento
function criarCardAtendimento(item) {
  const dataAtendimento = item.dataAtendimento || item.data_atendimento || "";
  const horaAtendimento = item.horaAtendimento || item.hora_atendimento || item.horarioEstimado || "";
  const dataFormatada = formatarDataAtendimento(dataAtendimento);
  const indicador = item.tipoAtendimento === "Agendado" ? horaAtendimento || "--:--" : item.tempoRestante || "--:--";
  const legenda = item.tipoAtendimento === "Agendado" ? "Agendado" : "Restante";
  const detalheAgendamento = item.tipoAtendimento === "Agendado"
    ? `<p class="fila-agendamento"><strong>Agendado para ${dataFormatada || "data não informada"} às ${horaAtendimento || "--:--"}</strong></p>`
    : "";

  return `<article class="fila-card" data-id="${item.id}">
    <button class="fila-resumo" onclick="alternarCard(this)">
      <span>${item.posicao}. ${item.cliente}</span>
      <strong class="fila-indicador"><small>${legenda}</small>${indicador}</strong>
    </button>
    <div class="fila-detalhes">
      <p class="fila-servico">${item.servico}</p>
      ${detalheAgendamento}
      <div class="fila-status">${item.status}</div>
      <div class="fila-actions">
        <button onclick="editarAtendimento('${item.id}', this)">Editar</button>
        <button onclick="enviarWhatsApp('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}', '${item.status}', '${item.horarioEstimado}')">WhatsApp</button>
        <button onclick="copiarLink('${item.id}')">Copiar link</button>
        <button onclick="anteciparCliente('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}')">Antecipar</button>
        <button onclick="chamarCliente('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}')">Chamar</button>
        <button onclick="iniciarAtendimento('${item.id}', this)">Atender</button>
        <button onclick="finalizarAtendimento('${item.id}','${item.whatsapp}','${item.cliente}','${item.servico}', this)">Finalizar</button>
        <button onclick="marcarAusente('${item.id}','${item.whatsapp}','${item.cliente}', this)">Ausente</button>
        <button onclick="mudarStatus('${item.id}','Desistiu','${item.whatsapp}','${item.cliente}', this)">Desistiu</button>
        <button onclick="mudarStatus('${item.id}','Cancelada','${item.whatsapp}','${item.cliente}', this)">Cancelar</button>
      </div>
    </div>
  </article>`;
}

// ------------------------------
// Editar Atendimento
async function editarAtendimento(id, botao) {
  await executarBotao(botao, async () => {
    try {
      const dados = await api("buscarAtendimento", { id });
      if(!dados.success){
        alert("Não foi possível carregar os dados do atendimento.");
        return;
      }
      const item = dados.atendimento;
      document.getElementById("editId").value = item.id;
      document.getElementById("editCliente").value = item.cliente || "";
      document.getElementById("editTelefone").value = item.whatsapp || "";
      document.getElementById("editServico").value = item.servico || "";
      document.getElementById("editManicure").value = item.manicure || "";
      document.getElementById("editTempoUsado").value = item.tempoUsado || "";
      document.getElementById("editTipoAtendimento").value = item.tipoAtendimento || "Fila de espera";
      document.getElementById("editDataAtendimento").value = normalizarDataInput(item.dataAtendimento || item.data_atendimento || "");
      document.getElementById("editHoraAtendimento").value = item.horaAtendimento || item.hora_atendimento || item.horarioEstimado || "";
      atualizarCamposAgendamento("edit");
      document.getElementById("editAceitaAntecipacao").value = item.aceitaAntecipacao || "Sim";
      document.getElementById("editObservacoes").value = item.observacoes || "";
      document.getElementById("modalEditar").classList.add("ativo");
    } catch(erro){
      console.error("Erro ao abrir modal de edição:", erro);
      alert("Ocorreu um erro ao tentar abrir o modal de edição.");
    }
  });
}
function fecharModalEditar(){document.getElementById("modalEditar").classList.remove("ativo");}

// ------------------------------
// Carregar Fila
async function carregarFila(){
  const container = document.getElementById("filas");
  try {
    const dados = await api("listarFila");
    container.innerHTML="";
    if(!dados.success||!dados.filas||Object.keys(dados.filas).length===0){
      container.innerHTML=`<p class="empty">Nenhuma cliente na fila no momento.</p>`;
      return;
    }
    Object.keys(dados.filas).forEach(manicure=>{
      const lista = dados.filas[manicure];
      const bloco = document.createElement("div");
      bloco.className="fila-bloco";
      bloco.innerHTML=`<h3>${manicure}</h3>${lista.map(criarCardAtendimento).join("")}`;
      container.appendChild(bloco);
    });
  } catch (erro) {
    console.error("Erro ao carregar fila:", erro);
    container.innerHTML=`<p class="empty">Nao foi possivel carregar a fila. Tente atualizar novamente.</p>`;
  }
}

// ------------------------------
// Mudar status
async function mudarStatus(id, status, whatsapp, cliente, botao) {
  const mensagens = {
    Ausente: `Oi, ${cliente}! Sentimos sua falta no seu atendimento na Nail Dreams. Entendemos que imprevistos acontecem e ficaremos felizes em te atender em outro momento. Quando quiser, é só chamar a gente.`,
    Desistiu: `Oi, ${cliente}! Tudo bem, entendemos sua desistência. Agradecemos por avisar e ficaremos felizes em te atender em uma próxima oportunidade.`,
    Cancelada: `Oi, ${cliente}! Seu atendimento foi cancelado por agora. Esperamos te receber em outro momento. Quando quiser remarcar, é só chamar a gente.`
  };

  await executarBotao(botao, async () => {
    const resultado = await api("atualizarStatus", { id, status });

    if (resultado && resultado.success === false) {
      throw new Error(resultado.message || "Nao foi possivel atualizar o status. Tente novamente.");
    }

    await carregarFila();

    const link = montarLinkWhatsApp(whatsapp, mensagens[status] || "");
    if (!link) {
      alert("Status atualizado, mas o WhatsApp da cliente nao foi informado.");
      return;
    }

    window.open(link, "_blank");
  });
}

async function iniciarAtendimento(id, botao){
  await executarBotao(botao, async () => {
    const resultado = await api("iniciarAtendimento", { id });

    if (!resultado.success) {
      alert(resultado.message || "Nao foi possivel iniciar o atendimento. Tente novamente.");
      return;
    }

    await carregarFila();
  });
}

// ------------------------------
// Formulário Cadastro
// ------------------------------
document.getElementById("formCadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const botao = e.target.querySelector("button[type='submit']");

  await executarBotao(botao, async () => {
    // Pegando os dados do formulário
    const cliente = document.getElementById("cliente").value;
    const telefone = document.getElementById("telefone").value;
    const servico = document.getElementById("servico").value;
    const manicure = document.getElementById("manicure").value;
    const tipoAtendimento = document.getElementById("tipoAtendimento").value;
    const dataAtendimento = tipoAtendimento === "Agendado" ? document.getElementById("dataAtendimento").value : "";
    const horaAtendimento = tipoAtendimento === "Agendado" ? document.getElementById("horaAtendimento").value : "";
    const aceitaAntecipacao = document.getElementById("aceitaAntecipacao").value;
    const tempoUsado = document.getElementById("tempoUsado").value;
    const observacoes = document.getElementById("observacoes").value;

    if (!validarAgendamento(tipoAtendimento, dataAtendimento, horaAtendimento, "mensagemCadastro")) return;
    const dados = {
      cliente,
      telefone,
      servico,
      manicure,
      dataAtendimento,
      horaAtendimento,
      horarioManual: horaAtendimento,
      tipoAtendimento,
      aceitaAntecipacao,
      tempoUsado,
      observacoes
    };

    // Chamada API para cadastrar
    const resultado = await api("cadastrarAtendimento", dados);

    if (resultado.success) {
      // Monta a mensagem do WhatsApp
      const atendimentoCriado = {
        ...resultado.atendimento,
        cliente,
        servico,
        manicure,
        tipoAtendimento,
        dataAtendimento,
        horaAtendimento
      };
      const mensagem = montarMensagemConfirmacao(atendimentoCriado, montarLinkCliente(resultado.atendimento.id));

      // Envia WhatsApp
      window.open(montarLinkWhatsApp(telefone, mensagem), "_blank");

      // Mensagem de alerta
      alert("Atendimento cadastrado e mensagem enviada com sucesso!");

      // Limpar formulário
      e.target.reset();
      atualizarCamposAgendamento();

      // Atualizar fila
      await carregarFila();
    } else {
      alert(resultado.message || "Erro ao cadastrar atendimento.");
    }
  });
});

// ------------------------------
// Formulário Edição
document.getElementById("formEditar").addEventListener("submit",async(e)=>{
  e.preventDefault();
  const botao = document.querySelector("#formEditar button[type='submit']");
  await executarBotao(botao, async ()=>{
    const tipoAtendimento = document.getElementById("editTipoAtendimento").value;
    const dataAtendimento = tipoAtendimento === "Agendado" ? document.getElementById("editDataAtendimento").value : "";
    const horaAtendimento = tipoAtendimento === "Agendado" ? document.getElementById("editHoraAtendimento").value : "";
    if (!validarAgendamento(tipoAtendimento, dataAtendimento, horaAtendimento, "mensagemEdicao")) return;
    const dados={
      id: document.getElementById("editId").value,
      cliente: document.getElementById("editCliente").value,
      telefone: document.getElementById("editTelefone").value,
      servico: document.getElementById("editServico").value,
      manicure: document.getElementById("editManicure").value,
      dataAtendimento,
      horaAtendimento,
      horario: horaAtendimento,
      tempoUsado: document.getElementById("editTempoUsado").value,
      tipoAtendimento,
      aceitaAntecipacao: document.getElementById("editAceitaAntecipacao").value,
      observacoes: document.getElementById("editObservacoes").value
    };
    const resultado = await api("editarAtendimento",dados);
    if(resultado.success){
      alert("Atendimento atualizado com sucesso!");
      fecharModalEditar();
      await carregarFila();
    }else{alert(resultado.message||"Erro ao atualizar atendimento.");}
  });
});

// ------------------------------
// Botão Enviar WhatsApp

async function enviarWhatsApp(id, whatsapp, cliente, servico, status, horarioEstimado) {
  const botao = document.querySelector(`.fila-card[data-id='${id}'] button`);
  await executarBotao(botao, async () => {
    try {
      if (!String(whatsapp || "").replace(/\D/g, "")) {
        alert("Número de WhatsApp inválido ou não informado.");
        return;
      }

      const resultado = await api("buscarAtendimento", { id });
      if (!resultado.success || !resultado.atendimento) {
        throw new Error("Não foi possível carregar os dados do atendimento.");
      }

      const mensagem = montarMensagemConfirmacao(resultado.atendimento, montarLinkCliente(id));
      window.open(montarLinkWhatsApp(whatsapp, mensagem), "_blank");
    } catch (erro) {
      console.error("Erro ao enviar WhatsApp:", erro);
      alert("Não foi possível abrir o WhatsApp.");
    }
  });
}

// ------------------------------
// Botão antecipar

async function anteciparCliente(id, whatsapp, cliente, servico) {
  const botao = document.querySelector(`.fila-card[data-id='${id}'] button`);
  await executarBotao(botao, async () => {
    try {
      const numero = String(whatsapp || "").replace(/\D/g,"");
      if (!numero) {
        alert("Número de WhatsApp inválido ou não informado.");
        return;
      }

      const mensagem = `Olá, ${cliente}!\nSeu atendimento Nail Dreams está agendado para ${servico}. Você gostaria de antecipar seu atendimento se houver oportunidade?`;

      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");
    } catch (erro) {
      console.error("Erro ao enviar WhatsApp de antecipação:", erro);
      alert("Não foi possível abrir o WhatsApp.");
    }
  });
}

// ------------------------------
//Botão Copiar Link

async function copiarLink(id) {
  const botao = document.querySelector(`.fila-card[data-id='${id}'] button`);
  
  await executarBotao(botao, async () => {
    try {
      const link = window.location.origin + window.location.pathname.replace("admin.html","cliente.html") + "?id=" + encodeURIComponent(id);
      await navigator.clipboard.writeText(link);
      alert("Link copiado com sucesso!");
    } catch (erro) {
      console.error("Erro ao copiar link:", erro);
      alert("Não foi possível copiar o link.");
    }
  });
}

// ------------------------------
//Botão Chamar

async function chamarCliente(id, whatsapp, cliente, servico) {
  const botao = document.querySelector(`.fila-card[data-id='${id}'] button`);
  
  await executarBotao(botao, async () => {
    try {
      const numero = String(whatsapp || "").replace(/\D/g,"");
      if (!numero) {
        alert("Número de WhatsApp inválido ou não informado.");
        return;
      }

      const mensagem = `Olá, ${cliente}!\nSeu atendimento Nail Dreams está chegando. Você está sendo chamada para ser atendida agora!`;

      // Abrir WhatsApp
      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");

      // Atualiza status na API para "Cliente chamada"
      await api("atualizarStatus", { id, status: "Chamada" });

      // Atualiza a fila no painel
      await carregarFila();

    } catch (erro) {
      console.error("Erro ao chamar cliente:", erro);
      alert("Não foi possível enviar o WhatsApp de chamada.");
    }
  });
}

// ------------------------------
// Botão Finalizar Atendimento
// ------------------------------

async function finalizarAtendimento(id, whatsapp, cliente, servico, botao) {
  await executarBotao(botao, async () => {
    try {
      const resultado = await api("buscarAtendimento", { id });
      if (!resultado.success) {
        alert("Não foi possível carregar os dados do atendimento.");
        return;
      }
      const atendimento = resultado.atendimento;
      const valorBruto = atendimento.valorBruto || 0; // <-- aqui pegamos o valor da tabela

      // Remove modal antigo se existir
      const modalExistente = document.getElementById('modalCaixa');
      if (modalExistente) modalExistente.remove();

      // Cria modal estilizado
      const modalHTML = `
        <div class="modal" id="modalCaixa">
          <div class="modal-card modal-editar-card">
            <h2>Finalizar Atendimento - Caixa</h2>
            <form id="formCaixa" class="admin-form">
              <label>Valor</label>
              <input type="text" id="caixaValor" value="${valorBruto}" inputmode="decimal" pattern="[0-9,.]*" required> <!-- valor pré-preenchido -->
              
              <label>Forma de pagamento</label>
              <select id="caixaForma" required>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
              </select>
              
              <label>Valor líquido</label>
              <input type="number" id="caixaLiquido" value="${valorBruto}" readonly>
              
              <div class="modal-actions modal-actions-full">
                <button type="submit">Confirmar</button>
                <button type="button" onclick="document.getElementById('modalCaixa').remove()">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Atualiza valor líquido quando o valor ou a forma de pagamento mudar
      const inputValor = document.getElementById('caixaValor');
      const selectForma = document.getElementById('caixaForma');
      const inputLiquido = document.getElementById('caixaLiquido');

      function normalizarValorCaixa(valor) {
        const texto = String(valor || "").trim();
        if (!texto) return NaN;
        const normalizado = texto.includes(",")
          ? texto.replace(/\./g, "").replace(",", ".")
          : texto;
        return Number(normalizado);
      }

      function calcularCaixa() {
        const valorAtual = normalizarValorCaixa(inputValor.value);
        const forma = selectForma.value;
        const taxasPorForma = {
          Pix: 0,
          Dinheiro: 0,
          Débito: 1.99,
          Crédito: 4.98
        };
        const taxaPercentual = taxasPorForma[forma] || 0;

        if (!Number.isFinite(valorAtual)) {
          inputLiquido.value = "";
          return null;
        }

        const valorTaxa = valorAtual * (taxaPercentual / 100);
        const valorLiquido = valorAtual - valorTaxa;

        inputLiquido.value = valorLiquido.toFixed(2);

        return {
          valorBruto: valorAtual.toFixed(2),
          formaPagamento: forma,
          bandeiraTipo: taxaPercentual === 0 ? "" : forma,
          parcelas: 1,
          taxaPercentual: taxaPercentual.toFixed(2),
          valorTaxa: valorTaxa.toFixed(2),
          valorLiquido: valorLiquido.toFixed(2)
        };
      }

      inputValor.addEventListener('input', calcularCaixa);
      selectForma.addEventListener('change', calcularCaixa);
      calcularCaixa();
      let finalizandoCaixa = false;

      // Submissão do form, envio do WhatsApp e atualização da fila
      document.getElementById('formCaixa').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (finalizandoCaixa) return;

        const botaoConfirmar = e.target.querySelector("button[type='submit']");
        const valorInformado = normalizarValorCaixa(inputValor.value);

        if (inputValor.value.trim() === "" || !Number.isFinite(valorInformado) || valorInformado <= 0) {
          alert("Informe um valor maior que zero para finalizar o atendimento.");
          inputValor.focus();
          return;
        }

        finalizandoCaixa = true;
        await executarBotao(botaoConfirmar, async () => {
          try {
            const dadosCaixa = calcularCaixa();
            if (!dadosCaixa) {
              alert("Informe um valor valido para finalizar o atendimento.");
              finalizandoCaixa = false;
              inputValor.focus();
              return;
            }

            const resposta = await api("finalizarAtendimento", {
              id,
              valorBruto: dadosCaixa.valorBruto,
              formaPagamento: dadosCaixa.formaPagamento,
              bandeiraTipo: dadosCaixa.bandeiraTipo,
              parcelas: dadosCaixa.parcelas,
              taxaPercentual: dadosCaixa.taxaPercentual,
              valorTaxa: dadosCaixa.valorTaxa,
              valorLiquido: dadosCaixa.valorLiquido
            });

            if (!resposta.success) {
              alert(resposta.message || "Não foi possível finalizar o atendimento. Confira os dados e tente novamente.");
              finalizandoCaixa = false;
              return;
            }

            document.getElementById('modalCaixa').remove();
            await carregarFila();
          } catch (erro) {
            console.error("Erro ao finalizar atendimento:", erro);
            alert("Não foi possível finalizar o atendimento agora. Tente novamente.");
            finalizandoCaixa = false;
          }
        });
      });

      // Mostra o modal
      document.getElementById('modalCaixa').classList.add('ativo');

    } catch (erro) {
      console.error("Erro ao abrir modal de finalização:", erro);
      alert("Não foi possível abrir o modal de finalização.");
    }
  });
}

// ------------------------------
//Botão ausente

async function marcarAusente(id, whatsapp, cliente, botao) {
  await mudarStatus(id, "Ausente", whatsapp, cliente, botao);
}

// ------------------------------
// Inicialização
document.getElementById("btnAtualizar").addEventListener("click", async (e) => {
  await executarBotao(e.currentTarget, carregarFila);
});

document.getElementById("tipoAtendimento").addEventListener("change", () => atualizarCamposAgendamento());
document.getElementById("editTipoAtendimento").addEventListener("change", () => atualizarCamposAgendamento("edit"));

[
  ["dataAtendimento", "mensagemCadastro", "Informe a data do atendimento agendado."],
  ["horaAtendimento", "mensagemCadastro", "Informe o horário do atendimento agendado."],
  ["editDataAtendimento", "mensagemEdicao", "Informe a data do atendimento agendado."],
  ["editHoraAtendimento", "mensagemEdicao", "Informe o horário do atendimento agendado."]
].forEach(([campoId, mensagemId, texto]) => {
  const campo = document.getElementById(campoId);
  const mensagem = document.getElementById(mensagemId);
  campo.addEventListener("invalid", () => {
    mensagem.textContent = texto;
    mensagem.hidden = false;
  });
  campo.addEventListener("input", () => {
    mensagem.textContent = "";
    mensagem.hidden = true;
  });
});

atualizarCamposAgendamento();
atualizarCamposAgendamento("edit");

carregarServicos();
carregarManicures();
carregarFila();
setInterval(carregarFila,30000);
