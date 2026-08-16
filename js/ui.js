/* =========================================================
   Heróis da Rotina — peças de interface reutilizáveis
   ========================================================= */

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORES = ['#6C5CE7', '#0ea5e9', '#16b47f', '#f0932b', '#eb4d4b', '#e84393', '#00b894', '#8e44ad'];
const EMOJIS_KID = ['🦸‍♂️','🦸‍♀️','🐯','🦊','🐼','🦄','🐨','🐸','🐵','🦁','🐙','🚀','⚽','🎸','🌟','🐳','🦖','🧚','🐧','🦉'];
const EMOJIS_TAREFA = ['🪥','🛏️','👕','🥣','📚','📖','🧸','🚿','🦷','🧺','🎒','🍽️','🧹','🤝','😇','💡','🐕','🌱','🎹','🏃','💧','🧦','🍎','🗑️','🚽','🍝','✏️','🧼','🎯','⏰'];
const EMOJIS_PREMIO = ['📺','📱','🍨','🎬','🌙','🎮','🍦','💵','🍕','🌃','🎡','🏕️','🎁','🍿','🛹','⚽','🎨','🧁','🚲','🎢','🐶','📔'];

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, tipo) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 2600);
}

/* ---------- som (sem arquivos, gerado na hora) ---------- */
let ctxAudio;
function som(tipo) {
  if (!S || !S.cfg.somLigado) return;
  try {
    ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = { moeda: [880, 1320], nivel: [523, 659, 784, 1046], compra: [660, 990], erro: [220, 165] }[tipo] || [660];
    notas.forEach((f, i) => {
      const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t0 = ctxAudio.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(g); g.connect(ctxAudio.destination);
      o.start(t0); o.stop(t0 + 0.3);
    });
  } catch (e) { /* silêncio é ok */ }
}

/* ---------- efeitos ---------- */
function flutuar(alvo, texto) {
  const r = alvo.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'flutua';
  el.textContent = texto;
  el.style.left = (r.left + r.width / 2 - 30) + 'px';
  el.style.top = (r.top + 8) + 'px';
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function confete(qtd) {
  const cores = ['#6C5CE7', '#f7b731', '#16b47f', '#eb4d4b', '#0ea5e9', '#e84393'];
  for (let i = 0; i < (qtd || 60); i++) {
    const c = document.createElement('i');
    c.className = 'confete';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.top = '-20px';
    c.style.background = cores[i % cores.length];
    c.style.animationDuration = (1.4 + Math.random() * 1.4) + 's';
    c.style.animationDelay = (Math.random() * .5) + 's';
    $('#fx').appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}

/* ---------- modal ---------- */
function fecharModal() { $('#modal-root').innerHTML = ''; }

function modal({ titulo, sub, corpo, botoes, fechavel = true, classe = '' }) {
  const fundo = document.createElement('div');
  fundo.className = 'fundo-modal';
  fundo.innerHTML =
    '<div class="modal ' + classe + '">' +
      (titulo ? '<h3>' + titulo + '</h3>' : '') +
      (sub ? '<p class="sub">' + sub + '</p>' : '') +
      '<div class="corpo-modal">' + (corpo || '') + '</div>' +
      '<div class="rodape"></div>' +
    '</div>';
  const rodape = $('.rodape', fundo);
  (botoes || []).forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.classe || '');
    btn.textContent = b.texto;
    btn.onclick = () => b.acao ? b.acao(fundo) : fecharModal();
    rodape.appendChild(btn);
  });
  if (!botoes || !botoes.length) rodape.remove();
  if (fechavel) fundo.onclick = e => { if (e.target === fundo) fecharModal(); };
  $('#modal-root').innerHTML = '';
  $('#modal-root').appendChild(fundo);
  return fundo;
}

function confirmar(titulo, sub, acao) {
  modal({
    titulo, sub,
    botoes: [
      { texto: 'Cancelar', classe: 'claro', acao: fecharModal },
      { texto: 'Confirmar', classe: 'perigo', acao: () => { fecharModal(); acao(); } }
    ]
  });
}

/* ---------- teclado de PIN ---------- */
function pedirPin(titulo, aoAcertar) {
  let digitado = '';
  const corpo =
    '<div class="pin-mostra">' + [0,1,2,3].map(i => '<i data-p="' + i + '"></i>').join('') + '</div>' +
    '<div class="teclado">' +
      [1,2,3,4,5,6,7,8,9].map(n => '<button data-n="' + n + '">' + n + '</button>').join('') +
      '<button data-n="apagar">⌫</button><button data-n="0">0</button><button data-n="sair">✕</button>' +
    '</div>';
  const m = modal({ titulo, sub: 'Digite o PIN dos pais', corpo, fechavel: true });
  const pintar = () => $$('.pin-mostra i', m).forEach((el, i) => el.classList.toggle('on', i < digitado.length));
  $$('.teclado button', m).forEach(b => b.onclick = () => {
    const n = b.dataset.n;
    if (n === 'sair') return fecharModal();
    if (n === 'apagar') { digitado = digitado.slice(0, -1); return pintar(); }
    if (digitado.length >= 4) return;
    digitado += n; pintar();
    if (digitado.length === 4) setTimeout(() => {
      if (digitado === S.pin) { fecharModal(); aoAcertar(); }
      else { som('erro'); toast('PIN incorreto', 'erro'); digitado = ''; pintar(); }
    }, 160);
  });
}

/* ---------- formulário genérico (usado no admin) ---------- */
/* campos: {nome, rotulo, tipo, valor, opcoes, dica} — tipo: texto|numero|select|check|emoji|kids */
function formulario({ titulo, sub, campos, textoSalvar, aoSalvar, extra }) {
  const html = campos.map(c => {
    const id = 'c_' + c.nome;
    if (c.tipo === 'check') {
      return '<label class="campo" style="display:flex;align-items:center;gap:10px;cursor:pointer">' +
        '<input type="checkbox" id="' + id + '" ' + (c.valor ? 'checked' : '') + ' style="width:22px;height:22px;margin:0;flex:none">' +
        '<span>' + esc(c.rotulo) + (c.dica ? '<br><small style="font-weight:500;color:var(--muted)">' + esc(c.dica) + '</small>' : '') + '</span></label>';
    }
    if (c.tipo === 'select') {
      return '<label class="campo">' + esc(c.rotulo) + '<select id="' + id + '">' +
        c.opcoes.map(o => '<option value="' + esc(o.v) + '"' + (String(o.v) === String(c.valor) ? ' selected' : '') + '>' + esc(o.t) + '</option>').join('') +
        '</select></label>';
    }
    if (c.tipo === 'emoji') {
      return '<label class="campo">' + esc(c.rotulo) +
        '<div class="emoji-grade" id="' + id + '" data-valor="' + esc(c.valor) + '">' +
        c.opcoes.map(e => '<button type="button" data-e="' + e + '" class="' + (e === c.valor ? 'on' : '') + '">' + e + '</button>').join('') +
        '</div></label>';
    }
    if (c.tipo === 'dias') {
      const sel = c.valor || [];
      const nomes = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sáb', 0: 'dom' };
      return '<label class="campo">' + esc(c.rotulo) +
        '<div class="chip-lista" id="' + id + '" style="margin-top:8px">' +
        [1, 2, 3, 4, 5, 6, 0].map(d => '<button type="button" class="chip ' + (sel.includes(d) ? 'on' : '') + '" data-d="' + d + '">' + nomes[d] + '</button>').join('') +
        '</div><small style="font-weight:500;color:var(--muted)">' + esc(c.dica || 'Nenhum marcado = todos os dias') + '</small></label>';
    }
    if (c.tipo === 'kids') {
      const sel = c.valor || [];
      return '<label class="campo">' + esc(c.rotulo) +
        '<div class="chip-lista" id="' + id + '" style="margin-top:8px">' +
        S.kids.map(k => '<button type="button" class="chip ' + (sel.includes(k.id) ? 'on' : '') + '" data-k="' + k.id + '">' + k.icone + ' ' + esc(k.nome) + '</button>').join('') +
        '</div><small style="font-weight:500;color:var(--muted)">Nenhum marcado = vale para todos</small></label>';
    }
    return '<label class="campo">' + esc(c.rotulo) +
      '<input id="' + id + '" type="' + (c.tipo === 'numero' ? 'number' : 'text') + '" value="' + esc(c.valor) + '" ' + (c.tipo === 'numero' ? 'min="0"' : '') + '>' +
      (c.dica ? '<small style="font-weight:500;color:var(--muted)">' + esc(c.dica) + '</small>' : '') + '</label>';
  }).join('') + (extra || '');

  const m = modal({
    titulo, sub, corpo: html,
    botoes: [
      { texto: 'Cancelar', classe: 'claro', acao: fecharModal },
      { texto: textoSalvar || 'Salvar', acao: () => {
          const dados = {};
          campos.forEach(c => {
            const el = $('#c_' + c.nome, m);
            if (c.tipo === 'check') dados[c.nome] = el.checked;
            else if (c.tipo === 'emoji') dados[c.nome] = el.dataset.valor;
            else if (c.tipo === 'kids') dados[c.nome] = $$('.chip.on', el).map(b => b.dataset.k);
            else if (c.tipo === 'dias') dados[c.nome] = $$('.chip.on', el).map(b => Number(b.dataset.d));
            else if (c.tipo === 'numero') dados[c.nome] = Number(el.value) || 0;
            else dados[c.nome] = el.value.trim();
          });
          if (aoSalvar(dados) !== false) fecharModal();
        } }
    ]
  });

  $$('.emoji-grade', m).forEach(g => $$('button', g).forEach(b => b.onclick = () => {
    $$('button', g).forEach(x => x.classList.remove('on'));
    b.classList.add('on'); g.dataset.valor = b.dataset.e;
  }));
  $$('.chip-lista .chip', m).forEach(c => c.onclick = () => c.classList.toggle('on'));
  return m;
}

/* ---------- formatação ---------- */
function quando(ts) {
  const d = new Date(ts), hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return mesmoDia ? 'hoje ' + hora : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + hora;
}
