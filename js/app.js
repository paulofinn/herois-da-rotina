/* =========================================================
   Heróis da Rotina — inicialização e primeira configuração
   ========================================================= */

function telaBoasVindas() {
  const linha = (i, nome, icone, simples) =>
    '<div class="linha-item" data-linha="' + i + '">' +
      '<button class="ic" data-troca="' + i + '" title="Trocar avatar" style="font-size:26px">' + icone + '</button>' +
      '<div class="corpo"><input data-nome="' + i + '" placeholder="Nome da criança" value="' + esc(nome) + '" ' +
        'style="width:100%;padding:10px 12px;border-radius:12px;border:2px solid var(--linha);font-weight:600">' +
        '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;color:var(--ink-2)">' +
        '<input type="checkbox" data-simples="' + i + '" ' + (simples ? 'checked' : '') + ' style="width:18px;height:18px">' +
        'ainda não lê bem (modo pequeno)</label></div>' +
      '<div class="acoes"><button class="btn pequeno perigo" data-tira="' + i + '">🗑</button></div>' +
    '</div>';

  let linhas = [
    { nome: '', icone: '🦸‍♂️', simples: false },
    { nome: '', icone: '🦖', simples: false },
    { nome: '', icone: '🦄', simples: true }
  ];

  const pinta = () => {
    $('#lista-kids').innerHTML = linhas.map((l, i) => linha(i, l.nome, l.icone, l.simples)).join('');
    $$('[data-nome]').forEach(el => el.oninput = () => linhas[el.dataset.nome].nome = el.value);
    $$('[data-simples]').forEach(el => el.onchange = () => linhas[el.dataset.simples].simples = el.checked);
    $$('[data-troca]').forEach(el => el.onclick = () => {
      const i = Number(el.dataset.troca);
      const atual = EMOJIS_KID.indexOf(linhas[i].icone);
      linhas[i].icone = EMOJIS_KID[(atual + 1) % EMOJIS_KID.length];
      el.textContent = linhas[i].icone;
    });
    $$('[data-tira]').forEach(el => el.onclick = () => {
      if (linhas.length <= 1) return toast('Precisa de pelo menos uma criança', 'erro');
      linhas.splice(Number(el.dataset.tira), 1); pinta();
    });
  };

  $('#app').innerHTML =
    '<div class="tela" id="selecao"><div class="wrap" style="max-width:640px">' +
      '<div class="marca"><div class="logo">🏅</div><h1>Heróis da Rotina</h1>' +
      '<p>Vamos configurar em 30 segundos. Dá pra mudar tudo depois.</p></div>' +
      '<div class="painel"><h3 style="font-size:17px">Quem vai jogar?</h3>' +
        '<p style="color:var(--ink-2);font-size:13px;margin:6px 0 4px">Toque no avatar para trocar.</p>' +
        '<div id="lista-kids"></div>' +
        '<button class="btn bloco claro" style="margin-top:14px" id="add-kid">+ Adicionar criança</button>' +
      '</div>' +
      '<div class="painel"><h3 style="font-size:17px">PIN dos pais</h3>' +
        '<p style="color:var(--ink-2);font-size:13px;margin:6px 0">4 números. Só ele protege a área de ajustes — as crianças entram com um toque.</p>' +
        '<label class="campo">PIN<input id="pin-inicial" inputmode="numeric" maxlength="4" value="1234"></label>' +
      '</div>' +
      '<button class="btn bloco" style="margin-top:18px;padding:16px" id="comecar">Começar 🚀</button>' +
      '<p style="text-align:center;color:var(--muted);font-size:13px;margin-top:14px">' +
        'Vamos criar uma rotina e uma loja de prêmios de exemplo — você ajusta tudo na área dos pais.</p>' +
    '</div></div>';

  pinta();
  $('#add-kid').onclick = () => {
    linhas.push({ nome: '', icone: EMOJIS_KID[linhas.length % EMOJIS_KID.length], simples: false });
    pinta();
  };
  $('#comecar').onclick = () => {
    const validas = linhas.filter(l => l.nome.trim());
    if (!validas.length) return toast('Coloque o nome de pelo menos uma criança', 'erro');
    const pin = $('#pin-inicial').value.trim();
    if (!/^\d{4}$/.test(pin)) return toast('O PIN precisa ter 4 números', 'erro');
    S.pin = pin;
    S.kids = validas.map((l, i) => novoKid(l.nome.trim(), l.icone, CORES[i % CORES.length], l.simples));
    S.pronto = true;
    semear(S.kids);
    confete(70);
    telaSelecao();
  };
}

/* ---------------- boot ---------------- */
function iniciar() {
  carregar();
  if (!S.pronto || !S.kids.length) telaBoasVindas();
  else telaSelecao();

  // se o tablet ficar ligado a noite toda, a tela se atualiza sozinha ao virar o dia
  let diaNaTela = hojeISO();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (hojeISO() !== diaNaTela) { diaNaTela = hojeISO(); carregar(); telaSelecao(); }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
