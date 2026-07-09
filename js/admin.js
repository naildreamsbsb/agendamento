// ==============================
// Admin.js final completo - Nail Dreams
// ==============================

// API helper
async function api(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
  const resposta = await fetch(url);
  return resposta.json();
}

// ------------------------------
// Função genérica para travar botões
async function executarBotao(botao, callback) {
  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = "Carregando...";
  try { await callback(); } 
  catch(e) { console.error(e); } 
  finally { 
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
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
  const indicador = item.tipoAtendimento === "Agendado" ? item.horarioEstimado || "--:--" : item.tempoRestante || "--:--";
  const legenda = item.tipoAtendimento === "Agendado" ? "Agendado" : "Restante";

  return `<article class="fila-card" data-id="${item.id}">
    <button class="fila-resumo" onclick="alternarCard(this)">
      <span>${item.posicao}. ${item.cliente}</span>
      <strong class="fila-indicador"><small>${legenda}</small>${indicador}</strong>
    </button>
    <div class="fila-detalhes">
      <p class="fila-servico">${item.servico}</p>
      <div class="fila-status">${item.status}</div>
      <div class="fila-actions">
        <button onclick="editarAtendimento('${item.id}', this)">Editar</button>
        <button onclick="enviarWhatsApp('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}', '${item.status}', '${item.horarioEstimado}')">WhatsApp</button>
        <button onclick="copiarLink('${item.id}')">Copiar link</button>
        <button onclick="anteciparCliente('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}')">Antecipar</button>
        <button onclick="chamarCliente('${item.id}', '${item.whatsapp}', '${item.cliente}', '${item.servico}')">Chamar</button>
        <button onclick="iniciarAtendimento('${item.id}')">Atender</button>
        <button onclick="finalizarAtendimento('${item.id}','${item.whatsapp}','${item.cliente}','${item.servico}', this)">Finalizar</button>
        <button onclick="marcarAusente('${item.id}','${item.whatsapp}','${item.cliente}','${item.servico}', this)">Ausente</button>
        <button onclick="mudarStatus('${item.id}','Desistiu')">Desistiu</button>
        <button onclick="mudarStatus('${item.id}','Cancelada')">Cancelar</button>
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
      document.getElementById("editHorario").value = item.horarioEstimado || "";
      document.getElementById("editTempoUsado").value = item.tempoUsado || "";
      document.getElementById("editTipoAtendimento").value = item.tipoAtendimento || "Fila de espera";
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
async function mudarStatus(id,status){
  await api("atualizarStatus",{id,status});
  await carregarFila();
}

async function iniciarAtendimento(id){
  await mudarStatus(id,"Em atendimento");
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
    const horario = document.getElementById("horarioManual").value;
    const tipoAtendimento = document.getElementById("tipoAtendimento").value;
    const aceitaAntecipacao = document.getElementById("aceitaAntecipacao").value;
    const tempoUsado = document.getElementById("tempoUsado").value;
    const observacoes = document.getElementById("observacoes").value;

    const dados = {
      cliente,
      telefone,
      servico,
      manicure,
      horarioManual: horario,
      tipoAtendimento,
      aceitaAntecipacao,
      tempoUsado,
      observacoes
    };

    // Chamada API para cadastrar
    const resultado = await api("cadastrarAtendimento", dados);

    if (resultado.success) {
      // Monta a mensagem do WhatsApp
      const numero = String(telefone || "").replace(/\D/g,"");
      const emojiAviso = "\u2728"; // ✨
      const horarioFormatado = horario || resultado.atendimento.horarioEstimado || "--:--";
      const mensagem = `Olá, ${cliente}! ${emojiAviso}\nSeu atendimento Nail Dreams foi confirmado.\nServiço: ${servico}\nHorário: ${horarioFormatado}\nManicure: ${manicure}`;

      // Envia WhatsApp
      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");

      // Mensagem de alerta
      alert("Atendimento cadastrado e mensagem enviada com sucesso!");

      // Limpar formulário
      e.target.reset();

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
    const dados={
      id: document.getElementById("editId").value,
      cliente: document.getElementById("editCliente").value,
      telefone: document.getElementById("editTelefone").value,
      servico: document.getElementById("editServico").value,
      manicure: document.getElementById("editManicure").value,
      horario: document.getElementById("editHorario").value,
      tempoUsado: document.getElementById("editTempoUsado").value,
      tipoAtendimento: document.getElementById("editTipoAtendimento").value,
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
      const numero = String(whatsapp || "").replace(/\D/g,"");
      if (!numero) {
        alert("Número de WhatsApp inválido ou não informado.");
        return;
      }
      
      const emojiAviso = "\u2728"; // ✨
      const horario = horarioEstimado || "--:--";
      
      const mensagem = `Olá, ${cliente}! ${emojiAviso}\nSeu atendimento Nail Dreams foi confirmado.\nServiço: ${servico}\nHorário: ${horario}`;
      
      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");
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

      const emojiAviso = "\u2728"; // ✨
      const mensagem = `Olá, ${cliente}! ${emojiAviso}\nSeu atendimento Nail Dreams está agendado para ${servico}. Você gostaria de antecipar seu atendimento se houver oportunidade?`;

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

      const emojiAviso = "\u2728"; // ✨
      const mensagem = `Olá, ${cliente}! ${emojiAviso}\nSeu atendimento Nail Dreams está chegando. Você está sendo chamada para ser atendida agora!`;

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
              <input type="number" id="caixaValor" value="${valorBruto}" inputmode="decimal" pattern="[0-9]*" required> <!-- valor pré-preenchido -->
              
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

      function calcularCaixa() {
        const valorAtual = Number(inputValor.value || 0);
        const forma = selectForma.value;
        const taxaPercentual = (forma === 'Pix' || forma === 'Dinheiro') ? 0 : 4;
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

      // Submissão do form, envio do WhatsApp e atualização da fila
      document.getElementById('formCaixa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const botaoConfirmar = e.target.querySelector("button[type='submit']");

        await executarBotao(botaoConfirmar, async () => {
          try {
            const dadosCaixa = calcularCaixa();
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
              return;
            }

            document.getElementById('modalCaixa').remove();
            await carregarFila();
          } catch (erro) {
            console.error("Erro ao finalizar atendimento:", erro);
            alert("Não foi possível finalizar o atendimento agora. Tente novamente.");
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

async function marcarAusente(id, whatsapp, cliente, servico, botao) {
  await executarBotao(botao, async () => {
    try {
      // Atualiza status para Ausente na API
      await api("atualizarStatus", { id, status: "Ausente" });

      // Atualiza a fila do painel
      await carregarFila();

      // Monta a mensagem para cliente
      const numero = String(whatsapp || "").replace(/\D/g, "");
      const emojiTriste = "\u{1F622}"; // 😢
      const mensagem = `Olá, ${cliente}! ${emojiTriste}\nPercebemos que você não compareceu ao seu atendimento Nail Dreams de ${servico}. Temos outras clientes na fila, mas ficaríamos felizes em atendê-la em outro momento!\nPara reagendar, envie uma mensagem para nossa loja: https://wa.me/55${numero}?text=Gostaria%20de%20reagendar%20meu%20atendimento.\nSiga-nos no Instagram: https://www.instagram.com/naildreams.bsb/`;

      // Abre WhatsApp
      window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");

    } catch (erro) {
      console.error("Erro ao marcar cliente como ausente:", erro);
      alert("Não foi possível processar o status Ausente.");
    }
  });
}

// ------------------------------
// Inicialização
document.getElementById("btnAtualizar").addEventListener("click", async (e) => {
  await executarBotao(e.currentTarget, carregarFila);
});

carregarServicos();
carregarManicures();
carregarFila();
setInterval(carregarFila,30000);
