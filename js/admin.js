/* =========================================================
   Heróis da Rotina — área dos pais
   ========================================================= */

let abaAdmin = 'aprovar';

function telaAdmin(aba) {
  if (aba) abaAdmin = aba;
  const pend = pendentes().length + S.resgates.filter(r => r.status === 'pendente').length;

  const abas = [
    ['aprovar', '✋', 'Aprovações', pend],
    ['kids', '🧒', 'Crianças', 0],
    ['tarefas', '📋', 'Tarefas', 0],
    ['premios', '🎁', 'Prêmios', 0],
    ['ajustes', '⚙️', 'Ajustes', 0]
  ].map(([id, ic, nome, n]) =>
    '<button data-tab="' + id + '" class="' + (abaAdmin === id ? 'on' : '') + '">' + ic + ' ' + nome +
    (n ? '<span class="badge">' + n + '</span>' : '') + '</button>').join('');

  const corpo = { aprovar: painelAprovar, kids: painelKids, tarefas: painelTarefas, premios: painelPremios, ajustes: painelAjustes }[abaAdmin]();

  $('#app').innerHTML =
    '<div class="tela admin">' +
      '<div class="topo"><div class="wrap"><div class="linha">' +
        '<button class="voltar" id="btn-voltar">←</button>' +
        '<h2 style="flex:1">Área dos pais</h2>' +
      '</div></div></div>' +
      '<div class="wrap"><div class="tabs-admin">' + abas + '</div>' + corpo + '</div>' +
    '</div>';

  $('#btn-voltar').onclick = telaSelecao;
  $$('[data-tab]').forEach(b => b.onclick = () => telaAdmin(b.dataset.tab));
  ({ aprovar: eventosAprovar, kids: eventosKids, tarefas: eventosTarefas, premios: eventosPremios, ajustes: eventosAjustes }[abaAdmin])();
}

/* ---------------- aprovações ---------------- */
function painelAprovar() {
  const p = pendentes().sort((a, b) => a.ts - b.ts);
  const entregar = S.resgates.filter(r => r.status === 'pendente').sort((a, b) => a.ts - b.ts);

  let html = '<div class="painel"><h3 style="font-size:17px">✋ Tarefas esperando seu OK</h3>';
  html += p.length ? p.map(f => {
    const k = kidPorId(f.kidId), t = tarefaPorId(f.tarefaId);
    return '<div class="linha-item"><div class="ic">' + (t ? t.icone : '❓') + '</div><div class="corpo">' +
      '<b>' + esc(t ? t.titulo : 'Tarefa removida') + '</b>' +
      '<small>' + (k ? k.icone + ' ' + esc(k.nome) : '?') + ' · ' + quando(f.ts) + ' · vale 🪙 ' + f.moedas + ' e ⭐ ' + f.xp + '</small></div>' +
      '<div class="acoes"><button class="btn pequeno claro" data-nao="' + f.id + '">Não fez</button>' +
      '<button class="btn pequeno ok" data-sim="' + f.id + '">Aprovar</button></div></div>';
  }).join('') : '<div class="vazio">Nada pendente. Tudo em dia! 🎉</div>';
  html += '</div>';

  html += '<div class="painel"><h3 style="font-size:17px">🎁 Prêmios comprados, esperando entrega</h3>';
  html += entregar.length ? entregar.map(r => {
    const k = kidPorId(r.kidId);
    return '<div class="linha-item"><div class="ic">' + r.icone + '</div><div class="corpo">' +
      '<b>' + esc(r.titulo) + '</b><small>' + (k ? k.icone + ' ' + esc(k.nome) : '?') + ' · ' + quando(r.ts) + ' · custou 🪙 ' + r.custo + '</small></div>' +
      '<div class="acoes"><button class="btn pequeno claro" data-estornar="' + r.id + '">Devolver moedas</button>' +
      '<button class="btn pequeno ok" data-entregue="' + r.id + '">Entregue</button></div></div>';
  }).join('') : '<div class="vazio">Nenhum prêmio na fila.</div>';
  html += '</div>';
  return html;
}

function eventosAprovar() {
  $$('[data-sim]').forEach(b => b.onclick = () => { aprovarFeito(b.dataset.sim, true); toast('Aprovado! Moedas creditadas'); telaAdmin(); });
  $$('[data-nao]').forEach(b => b.onclick = () => { aprovarFeito(b.dataset.nao, false); toast('Marcado como não feito'); telaAdmin(); });
  $$('[data-entregue]').forEach(b => b.onclick = () => {
    const r = S.resgates.find(x => x.id === b.dataset.entregue);
    r.status = 'entregue'; salvar(); toast('Prêmio entregue 🎉'); telaAdmin();
  });
  $$('[data-estornar]').forEach(b => b.onclick = () => {
    const r = S.resgates.find(x => x.id === b.dataset.estornar), k = kidPorId(r.kidId);
    confirmar('Devolver as moedas?', 'O prêmio "' + r.titulo + '" sai da fila e ' + (k ? k.nome : '') + ' recebe ' + r.custo + ' moedas de volta.', () => {
      desfazerCompra(r.kidId, r.id);
      telaAdmin();
    });
  });
}

/* ---------------- crianças ---------------- */
function painelKids() {
  return '<div class="painel"><h3 style="font-size:17px">🧒 Crianças</h3>' +
    S.kids.map(k => {
      const p = progressoNivel(k.xp);
      return '<div class="linha-item"><div class="ic" style="background:' + k.cor + '22">' + k.icone + '</div><div class="corpo">' +
        '<b>' + esc(k.nome) + '</b><small>Nível ' + p.nivel + ' · ' + k.xp + ' XP · 🪙 ' + k.moedas + ' · 🔥 ' + streakVivo(k) +
        (k.simples ? ' · modo pequeno' : '') + '</small></div>' +
        '<div class="acoes">' +
        '<button class="btn pequeno claro" data-saldo="' + k.id + '">Ajustar</button>' +
        '<button class="btn pequeno claro" data-editk="' + k.id + '">Editar</button>' +
        '<button class="btn pequeno perigo" data-delk="' + k.id + '">🗑</button></div></div>';
    }).join('') +
    '<button class="btn bloco" style="margin-top:16px" data-novok="1">+ Adicionar criança</button></div>';
}

function eventosKids() {
  $('[data-novok]').onclick = () => formKid(null);
  $$('[data-editk]').forEach(b => b.onclick = () => formKid(kidPorId(b.dataset.editk)));
  $$('[data-delk]').forEach(b => b.onclick = () => {
    const k = kidPorId(b.dataset.delk);
    confirmar('Remover ' + k.nome + '?', 'O histórico, as moedas e o nível dessa criança serão apagados. Não dá pra desfazer.', () => {
      S.kids = S.kids.filter(x => x.id !== k.id);
      S.feitos = S.feitos.filter(f => f.kidId !== k.id);
      S.extrato = S.extrato.filter(e => e.kidId !== k.id);
      S.resgates = S.resgates.filter(r => r.kidId !== k.id);
      salvar(); telaAdmin();
    });
  });
  $$('[data-saldo]').forEach(b => b.onclick = () => formSaldo(kidPorId(b.dataset.saldo)));
}

function formKid(kid) {
  formulario({
    titulo: kid ? 'Editar ' + kid.nome : 'Nova criança',
    campos: [
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', valor: kid ? kid.nome : '' },
      { nome: 'icone', rotulo: 'Avatar', tipo: 'emoji', valor: kid ? kid.icone : '🦸‍♂️', opcoes: EMOJIS_KID },
      { nome: 'cor', rotulo: 'Cor', tipo: 'select', valor: kid ? kid.cor : CORES[0], opcoes: CORES.map((c, i) => ({ v: c, t: ['Roxo','Azul','Verde','Laranja','Vermelho','Rosa','Menta','Uva'][i] })) },
      { nome: 'simples', rotulo: 'Modo pequeno (letras e ícones maiores)', tipo: 'check', valor: kid ? kid.simples : false, dica: 'Ideal para quem ainda não lê bem' }
    ],
    aoSalvar: d => {
      if (!d.nome) { toast('Coloque um nome', 'erro'); return false; }
      if (kid) Object.assign(kid, { nome: d.nome, icone: d.icone, cor: d.cor, simples: d.simples });
      else S.kids.push(novoKid(d.nome, d.icone, d.cor, d.simples));
      salvar(); telaAdmin();
    }
  });
}

function formSaldo(kid) {
  formulario({
    titulo: 'Ajustar ' + kid.nome,
    sub: 'Use números negativos só quando for correção de erro — tirar moedas como castigo desmotiva.',
    campos: [
      { nome: 'moedas', rotulo: 'Moedas (+ ou −)', tipo: 'texto', valor: '0' },
      { nome: 'xp', rotulo: 'XP (+ ou −)', tipo: 'texto', valor: '0' },
      { nome: 'texto', rotulo: 'Motivo (aparece no extrato dela)', tipo: 'texto', valor: 'Ajuste dos pais' }
    ],
    aoSalvar: d => {
      const m = Number(d.moedas) || 0, x = Number(d.xp) || 0;
      if (!m && !x) return;
      kid.moedas = Math.max(0, kid.moedas + m);
      kid.xp = Math.max(0, kid.xp + x);
      if (m > 0) kid.totalMoedas += m;
      S.extrato.push({ id: uid(), kidId: kid.id, ts: Date.now(), moedas: m, xp: x, texto: '⚙️ ' + (d.texto || 'Ajuste') });
      novasConquistas(kid); salvar(); telaAdmin();
    }
  });
}

/* ---------------- tarefas ---------------- */
const NOMES_TIPO = { diaria: 'Todo dia', semanal: 'Uma vez por semana', pontual: 'Só uma vez', desafio: 'Desafio da semana' };
const NOMES_PERIODO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', qualquer: 'Qualquer hora' };

function painelTarefas() {
  let html = '';
  ['diaria', 'semanal', 'desafio', 'pontual'].forEach(tipo => {
    const lista = S.tarefas.filter(t => t.tipo === tipo);
    html += '<div class="painel"><h3 style="font-size:17px">' + NOMES_TIPO[tipo] + ' <span style="color:var(--muted);font-weight:500">(' + lista.length + ')</span></h3>' +
      (lista.length ? lista.map(t =>
        '<div class="linha-item" style="' + (t.ativa ? '' : 'opacity:.5') + '"><div class="ic">' + t.icone + '</div><div class="corpo">' +
        '<b>' + esc(t.titulo) + '</b><small>🪙 ' + t.moedas + ' · ⭐ ' + t.xp + ' XP · ' + NOMES_PERIODO[t.periodo || 'qualquer'] +
        (t.aprovacao ? ' · precisa de aprovação' : '') + (t.consolidada ? ' · hábito (vale metade)' : '') +
        ' · ' + (t.kids && t.kids.length ? t.kids.map(id => { const k = kidPorId(id); return k ? k.icone : ''; }).join(' ') : 'todos') + '</small></div>' +
        '<div class="acoes">' +
        '<button class="btn pequeno claro" data-habito="' + t.id + '" title="Já virou hábito: passa a valer metade">' + (t.consolidada ? '↩️' : '🌱') + '</button>' +
        '<button class="btn pequeno claro" data-edit="' + t.id + '">Editar</button>' +
        '<button class="btn pequeno perigo" data-del="' + t.id + '">🗑</button></div></div>'
      ).join('') : '<div class="vazio">Nenhuma ainda.</div>') +
      '<button class="btn bloco claro" style="margin-top:14px" data-nova="' + tipo + '">+ Nova tarefa (' + NOMES_TIPO[tipo].toLowerCase() + ')</button></div>';
  });
  return html;
}

function eventosTarefas() {
  $$('[data-nova]').forEach(b => b.onclick = () => formTarefa(null, b.dataset.nova));
  $$('[data-edit]').forEach(b => b.onclick = () => formTarefa(tarefaPorId(b.dataset.edit)));
  $$('[data-del]').forEach(b => b.onclick = () => {
    const t = tarefaPorId(b.dataset.del);
    confirmar('Apagar "' + t.titulo + '"?', 'Ela some da rotina de todo mundo. O que já foi ganho continua valendo.', () => {
      S.tarefas = S.tarefas.filter(x => x.id !== t.id); salvar(); telaAdmin();
    });
  });
  $$('[data-habito]').forEach(b => b.onclick = () => {
    const t = tarefaPorId(b.dataset.habito);
    t.consolidada = !t.consolidada; salvar();
    toast(t.consolidada ? 'Marcada como hábito: agora vale metade' : 'Voltou ao valor cheio');
    telaAdmin();
  });
}

function formTarefa(t, tipo) {
  tipo = t ? t.tipo : tipo;
  formulario({
    titulo: t ? 'Editar tarefa' : 'Nova tarefa',
    sub: NOMES_TIPO[tipo],
    campos: [
      { nome: 'titulo', rotulo: 'O que a criança tem que fazer', tipo: 'texto', valor: t ? t.titulo : '' },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'emoji', valor: t ? t.icone : '⭐', opcoes: EMOJIS_TAREFA },
      { nome: 'moedas', rotulo: 'Moedas', tipo: 'numero', valor: t ? t.moedas : 3 },
      { nome: 'xp', rotulo: 'XP', tipo: 'numero', valor: t ? t.xp : 6 },
      { nome: 'periodo', rotulo: 'Quando aparece', tipo: 'select', valor: t ? (t.periodo || 'qualquer') : 'qualquer',
        opcoes: Object.keys(NOMES_PERIODO).map(k => ({ v: k, t: NOMES_PERIODO[k] })) },
      { nome: 'aprovacao', rotulo: 'Precisa da aprovação dos pais', tipo: 'check', valor: t ? t.aprovacao : false,
        dica: 'Use só nas de maior valor — o resto perde a graça se demorar' },
      { nome: 'kids', rotulo: 'Para quem', tipo: 'kids', valor: t ? t.kids : [] },
      { nome: 'ativa', rotulo: 'Ativa', tipo: 'check', valor: t ? t.ativa : true }
    ],
    aoSalvar: d => {
      if (!d.titulo) { toast('Escreva o que é a tarefa', 'erro'); return false; }
      if (t) Object.assign(t, d);
      else S.tarefas.push(Object.assign({ id: uid(), tipo, dias: [], consolidada: false }, d));
      salvar(); telaAdmin();
    }
  });
}

/* ---------------- prêmios ---------------- */
function painelPremios() {
  return '<div class="painel"><h3 style="font-size:17px">🎁 Loja de recompensas</h3>' +
    '<p style="color:var(--ink-2);font-size:13px;margin:6px 0 10px">Boa proporção: metade barata (dá pra trocar no mesmo dia), algumas médias e poucas caras.</p>' +
    (S.recompensas.length ? S.recompensas.slice().sort((a, b) => a.custo - b.custo).map(r =>
      '<div class="linha-item" style="' + (r.ativa ? '' : 'opacity:.5') + '"><div class="ic">' + r.icone + '</div><div class="corpo">' +
      '<b>' + esc(r.titulo) + '</b><small>🪙 ' + r.custo + (r.nivelMin > 1 ? ' · a partir do nível ' + r.nivelMin : '') +
      (r.desc ? ' · ' + esc(r.desc) : '') +
      ' · ' + (r.kids && r.kids.length ? r.kids.map(id => { const k = kidPorId(id); return k ? k.icone : ''; }).join(' ') : 'todos') + '</small></div>' +
      '<div class="acoes"><button class="btn pequeno claro" data-editr="' + r.id + '">Editar</button>' +
      '<button class="btn pequeno perigo" data-delr="' + r.id + '">🗑</button></div></div>'
    ).join('') : '<div class="vazio">Nenhum prêmio ainda.</div>') +
    '<button class="btn bloco" style="margin-top:16px" data-novor="1">+ Novo prêmio</button></div>';
}

function eventosPremios() {
  $('[data-novor]').onclick = () => formPremio(null);
  $$('[data-editr]').forEach(b => b.onclick = () => formPremio(recompensaPorId(b.dataset.editr)));
  $$('[data-delr]').forEach(b => b.onclick = () => {
    const r = recompensaPorId(b.dataset.delr);
    confirmar('Apagar "' + r.titulo + '"?', 'Ele some da loja das crianças.', () => {
      S.recompensas = S.recompensas.filter(x => x.id !== r.id); salvar(); telaAdmin();
    });
  });
}

function formPremio(r) {
  formulario({
    titulo: r ? 'Editar prêmio' : 'Novo prêmio',
    campos: [
      { nome: 'titulo', rotulo: 'Prêmio', tipo: 'texto', valor: r ? r.titulo : '' },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'emoji', valor: r ? r.icone : '🎁', opcoes: EMOJIS_PREMIO },
      { nome: 'custo', rotulo: 'Custo em moedas', tipo: 'numero', valor: r ? r.custo : 30 },
      { nome: 'nivelMin', rotulo: 'Desbloqueia no nível', tipo: 'numero', valor: r ? r.nivelMin : 1, dica: 'Prêmios grandes travados por nível dão o que esperar' },
      { nome: 'desc', rotulo: 'Regrinha (opcional)', tipo: 'texto', valor: r ? r.desc : '' },
      { nome: 'kids', rotulo: 'Para quem', tipo: 'kids', valor: r ? r.kids : [] },
      { nome: 'ativa', rotulo: 'Ativo', tipo: 'check', valor: r ? r.ativa : true }
    ],
    aoSalvar: d => {
      if (!d.titulo) { toast('Dê um nome ao prêmio', 'erro'); return false; }
      d.nivelMin = Math.max(1, d.nivelMin);
      if (r) Object.assign(r, d); else S.recompensas.push(Object.assign({ id: uid() }, d));
      salvar(); telaAdmin();
    }
  });
}

/* ---------------- ajustes ---------------- */
function painelAjustes() {
  const m = progressoMeta();
  return '<div class="painel"><h3 style="font-size:17px">👨‍👩‍👧‍👦 Missão da família</h3>' +
    '<p style="color:var(--ink-2);font-size:13px;margin:6px 0">Meta cooperativa da semana: soma as tarefas de todos. Evita competição entre irmãos.</p>' +
    '<div class="linha-item"><div class="ic">🍕</div><div class="corpo"><b>' + esc(S.meta.titulo) + '</b>' +
    '<small>' + m.total + ' de ' + m.alvo + ' tarefas nesta semana · ' + (S.meta.ativa ? 'ativa' : 'desligada') + '</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-meta="1">Editar</button></div></div></div>' +

    '<div class="painel"><h3 style="font-size:17px">⚙️ Regras do jogo</h3>' +
    '<div class="linha-item"><div class="ic">🎁</div><div class="corpo"><b>Baú surpresa</b>' +
    '<small>' + Math.round(S.cfg.chanceBau * 100) + '% de chance ao fechar o dia. A surpresa é o que mais sustenta o hábito — não deixe em 100%.</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-regras="1">Editar</button></div></div>' +
    '<div class="linha-item"><div class="ic">⭐</div><div class="corpo"><b>Bônus de dia perfeito</b>' +
    '<small>🪙 ' + S.cfg.bonusDiaPerfeito + ' + ofensiva · ⭐ ' + S.cfg.xpDiaPerfeito + ' XP</small></div></div>' +
    '<div class="linha-item"><div class="ic">🐷</div><div class="corpo"><b>Cofrinho (investimento)</b>' +
    '<small>' + (S.cfg.cofrinho.ativo
      ? (S.cfg.cofrinho.planos || []).map(p => p.dias + ' dias: +' + p.pct + '%').join(' · ') + ' · quebrar antes devolve só o guardado'
      : 'desligado') + '</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-cofrinho="1">Editar</button></div></div>' +
    '<div class="linha-item"><div class="ic">🔊</div><div class="corpo"><b>Sons</b><small>' + (S.cfg.somLigado ? 'ligados' : 'desligados') + '</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-som="1">' + (S.cfg.somLigado ? 'Desligar' : 'Ligar') + '</button></div></div></div>' +

    '<div class="painel"><h3 style="font-size:17px">🔐 Segurança e backup</h3>' +
    '<div class="linha-item"><div class="ic">🔑</div><div class="corpo"><b>PIN dos pais</b><small>4 dígitos · atual: ' + S.pin.replace(/./g, '•') + '</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-pin="1">Trocar</button></div></div>' +
    '<div class="linha-item"><div class="ic">💾</div><div class="corpo"><b>Backup</b><small>Os dados ficam só neste aparelho. Exporte de vez em quando.</small></div>' +
    '<div class="acoes"><button class="btn pequeno claro" data-exp="1">Exportar</button>' +
    '<button class="btn pequeno claro" data-imp="1">Importar</button></div></div>' +
    '<div class="linha-item"><div class="ic">🧨</div><div class="corpo"><b>Recomeçar do zero</b><small>Apaga tudo e volta pra tela inicial de configuração.</small></div>' +
    '<div class="acoes"><button class="btn pequeno perigo" data-reset="1">Apagar tudo</button></div></div></div>' +

    '<div class="painel"><h3 style="font-size:17px">📖 Como manter isso funcionando</h3>' +
    '<ul style="color:var(--ink-2);font-size:14px;line-height:1.7;padding-left:20px;margin-top:8px">' +
    '<li><b>Não coloque na lista o que eles já fazem por prazer</b> — pagar por isso mata o gosto.</li>' +
    '<li><b>Nunca tire moedas como castigo.</b> A consequência é não ganhar. Castigo é assunto de fora do app.</li>' +
    '<li><b>Aprove rápido.</b> Recompensa que demora perde quase todo o efeito.</li>' +
    '<li><b>Depois de ~1 mês</b>, marque a tarefa como 🌱 hábito: ela passa a valer metade e abre espaço pra um desafio novo.</li>' +
    '<li><b>Se ficarem ricos demais</b>, suba o preço dos prêmios em vez de cortar moedas.</li>' +
    '</ul></div>';
}

function eventosAjustes() {
  $('[data-meta]').onclick = () => formulario({
    titulo: 'Missão da família',
    campos: [
      { nome: 'titulo', rotulo: 'Prêmio coletivo da semana', tipo: 'texto', valor: S.meta.titulo },
      { nome: 'alvo', rotulo: 'Quantas tarefas a família precisa somar', tipo: 'numero', valor: S.meta.alvo },
      { nome: 'ativa', rotulo: 'Mostrar para as crianças', tipo: 'check', valor: S.meta.ativa }
    ],
    aoSalvar: d => { Object.assign(S.meta, d); salvar(); telaAdmin(); }
  });

  $('[data-regras]').onclick = () => formulario({
    titulo: 'Regras do jogo',
    campos: [
      { nome: 'chance', rotulo: 'Chance de baú surpresa (%)', tipo: 'numero', valor: Math.round(S.cfg.chanceBau * 100) },
      { nome: 'bonusDiaPerfeito', rotulo: 'Moedas de bônus por dia perfeito', tipo: 'numero', valor: S.cfg.bonusDiaPerfeito },
      { nome: 'xpDiaPerfeito', rotulo: 'XP de bônus por dia perfeito', tipo: 'numero', valor: S.cfg.xpDiaPerfeito }
    ],
    aoSalvar: d => {
      S.cfg.chanceBau = Math.min(1, Math.max(0, d.chance / 100));
      S.cfg.bonusDiaPerfeito = d.bonusDiaPerfeito;
      S.cfg.xpDiaPerfeito = d.xpDiaPerfeito;
      salvar(); telaAdmin();
    }
  });

  $('[data-cofrinho]').onclick = () => {
    const p1 = (S.cfg.cofrinho.planos || [])[0] || { dias: 3, pct: 10 };
    const p2 = (S.cfg.cofrinho.planos || [])[1] || { dias: 7, pct: 25 };
    formulario({
      titulo: '🐷 Cofrinho (investimento)',
      sub: 'A criança guarda moedas por um prazo e recebe mais de volta. Se quebrar antes, recebe só o que guardou — nunca perde.',
      campos: [
        { nome: 'ativo', rotulo: 'Mostrar para as crianças', tipo: 'check', valor: S.cfg.cofrinho.ativo },
        { nome: 'dias1', rotulo: 'Plano curto: dias', tipo: 'numero', valor: p1.dias },
        { nome: 'pct1', rotulo: 'Plano curto: rendimento (%)', tipo: 'numero', valor: p1.pct },
        { nome: 'dias2', rotulo: 'Plano longo: dias', tipo: 'numero', valor: p2.dias },
        { nome: 'pct2', rotulo: 'Plano longo: rendimento (%)', tipo: 'numero', valor: p2.pct }
      ],
      aoSalvar: d => {
        S.cfg.cofrinho = {
          ativo: d.ativo,
          planos: [
            { dias: Math.max(1, d.dias1), pct: Math.max(1, d.pct1) },
            { dias: Math.max(1, d.dias2), pct: Math.max(1, d.pct2) }
          ]
        };
        salvar(); telaAdmin();
      }
    });
  };

  $('[data-som]').onclick = () => { S.cfg.somLigado = !S.cfg.somLigado; salvar(); telaAdmin(); };

  $('[data-pin]').onclick = () => formulario({
    titulo: 'Trocar PIN',
    campos: [{ nome: 'pin', rotulo: 'Novo PIN (4 dígitos)', tipo: 'texto', valor: '' }],
    aoSalvar: d => {
      if (!/^\d{4}$/.test(d.pin)) { toast('Precisa ser 4 números', 'erro'); return false; }
      S.pin = d.pin; salvar(); toast('PIN trocado');
    }
  });

  $('[data-exp]').onclick = () => { exportarJSON(); toast('Backup baixado'); };

  $('[data-imp]').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        try { importarJSON(fr.result); toast('Backup restaurado'); telaAdmin(); }
        catch (e) { toast('Arquivo inválido', 'erro'); }
      };
      fr.readAsText(f);
    };
    inp.click();
  };

  $('[data-reset]').onclick = () => confirmar('Apagar tudo mesmo?',
    'Some o histórico, as moedas, os níveis, as tarefas e os prêmios de todas as crianças.',
    () => { localStorage.removeItem(CHAVE); location.reload(); });
}
