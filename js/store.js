/* =========================================================
   Heróis da Rotina — estado, persistência e regras do jogo
   Tudo roda no próprio aparelho (localStorage). Sem servidor.
   ========================================================= */

const CHAVE = 'herois-rotina-v1';

/* ---------- utilitários ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);

function ymd(d) { return d.toLocaleDateString('sv-SE'); }          // YYYY-MM-DD local
function hojeISO() { return ymd(new Date()); }
function dataDe(iso) { return new Date(iso + 'T12:00:00'); }        // meio-dia evita fuso/horário de verão
function diffDias(isoA, isoB) { return Math.round((dataDe(isoB) - dataDe(isoA)) / 86400000); }

function semanaDe(iso) {
  const d = dataDe(iso);
  const dia = (d.getDay() + 6) % 7;                                 // segunda = 0
  d.setDate(d.getDate() - dia + 3);                                 // quinta da semana ISO
  const primeiraQuinta = new Date(d.getFullYear(), 0, 4);
  const semana = 1 + Math.round((d - primeiraQuinta) / 604800000);
  return d.getFullYear() + '-S' + String(semana).padStart(2, '0');
}
function semanaAtual() { return semanaDe(hojeISO()); }
function inicioDaSemana(iso) {
  const d = dataDe(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ymd(d);
}

/* ---------- níveis ---------- */
// XP acumulado necessário para chegar ao nível n: 50 * n * (n-1) / 2
function xpDoNivel(n) { return 50 * n * (n - 1) / 2; }
function nivelPorXp(xp) { let n = 1; while (xpDoNivel(n + 1) <= xp) n++; return n; }
function progressoNivel(xp) {
  const nivel = nivelPorXp(xp);
  const base = xpDoNivel(nivel), topo = xpDoNivel(nivel + 1);
  return { nivel, base, topo, atual: xp - base, faixa: topo - base, pct: Math.min(100, ((xp - base) / (topo - base)) * 100) };
}

/* ---------- estado ---------- */
let S = null;

function estadoInicial() {
  return {
    versao: 1,
    pronto: false,
    pin: '1234',
    cfg: {
      bonusDiaPerfeito: 5,
      xpDiaPerfeito: 10,
      somLigado: true,
      cofrinho: { ativo: true, planos: [{ dias: 3, pct: 10 }, { dias: 7, pct: 25 }] },
      // reforço de razão variável: a incerteza do baú é o que mais sustenta o hábito
      bau: { quando: 'dia', chance: 0.35, itens: { moedas: true, xp: true, premio: false, escudo: true } },
      avisos: { ativo: false, manha: '12:00', tarde: '18:00', noite: '20:30' }
    },
    avisados: {},
    meta: { titulo: 'Noite de pizza e cinema em casa', alvo: 60, ativa: true, ultimaSemanaGanha: '' },
    missoes: {},       // por criança: { ativa, premio, icone, tipo, alvo, tarefaId, semanaGanha }
    kids: [],
    tarefas: [],
    recompensas: [],
    feitos: [],        // { id, kidId, tarefaId, data, semana, ts, status, moedas, xp }
    resgates: [],      // { id, kidId, recompensaId, ts, custo, status, titulo, icone }
    extrato: []        // { id, kidId, ts, moedas, xp, texto }
  };
}

function novoKid(nome, icone, cor, simples) {
  return {
    id: uid(), nome, icone, cor, simples: !!simples,
    moedas: 0, xp: 0, totalMoedas: 0,
    cofrinho: null, cofrinhosCompletos: 0, bauPendente: null,
    streak: { n: 0, melhor: 0, ultimoDia: '', escudos: 1, semanaEscudo: semanaAtual() },
    desafio: { semana: '', tarefaId: '' },
    conquistas: [], nivelVisto: 1, ultimaFesta: null
  };
}

/* ---------- persistência ---------- */
function salvar() {
  if (S.extrato.length > 600) S.extrato = S.extrato.slice(-600);
  if (S.feitos.length > 4000) S.feitos = S.feitos.slice(-4000);
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); }
  catch (e) { console.warn('Não consegui salvar:', e); }
}

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    S = bruto ? JSON.parse(bruto) : estadoInicial();
  } catch (e) { S = estadoInicial(); }
  const padrao = estadoInicial();
  for (const k in padrao) if (!(k in S)) S[k] = padrao[k];
  S.cfg = Object.assign({}, padrao.cfg, S.cfg);
  if (!S.cfg.bau) S.cfg.bau = padrao.cfg.bau;
  if (!S.cfg.avisos) S.cfg.avisos = padrao.cfg.avisos;
  if (S.cfg.chanceBau != null) { S.cfg.bau.chance = S.cfg.chanceBau; delete S.cfg.chanceBau; }   // formato antigo
  S.kids.forEach(k => {
    if (!k.streak) k.streak = { n: 0, melhor: 0, ultimoDia: '', escudos: 1, semanaEscudo: semanaAtual() };
    if (!k.desafio) k.desafio = { semana: '', tarefaId: '' };
    if (!k.conquistas) k.conquistas = [];
    if (!k.nivelVisto) k.nivelVisto = nivelPorXp(k.xp);
    if (k.ultimaFesta === undefined) k.ultimaFesta = null;
    if (k.cofrinho === undefined) k.cofrinho = null;
    if (!k.cofrinhosCompletos) k.cofrinhosCompletos = 0;
    if (k.bauPendente === undefined) k.bauPendente = null;
    recarregarEscudo(k);
  });
  return S;
}

function kidPorId(id) { return S.kids.find(k => k.id === id); }
function tarefaPorId(id) { return S.tarefas.find(t => t.id === id); }
function recompensaPorId(id) { return S.recompensas.find(r => r.id === id); }

/* ---------- catálogo inicial (editável no admin) ---------- */
function semear(kids) {
  const grandes = kids.filter(k => !k.simples).map(k => k.id);
  const pequenos = kids.filter(k => k.simples).map(k => k.id);
  const todos = [];

  const T = (titulo, icone, tipo, periodo, moedas, xp, aprovacao, quem) =>
    ({ id: uid(), titulo, icone, tipo, periodo, moedas, xp, aprovacao, kids: quem, dias: [], ativa: true, consolidada: false });

  S.tarefas = [
    T('Escovar os dentes', '🪥', 'diaria', 'manha', 2, 5, false, todos),
    T('Arrumar a cama', '🛏️', 'diaria', 'manha', 3, 5, false, todos),
    T('Se vestir sozinho', '👕', 'diaria', 'manha', 2, 5, false, todos),
    T('Tomar o café sem enrolar', '🥣', 'diaria', 'manha', 2, 5, false, todos),

    T('Lição de casa', '📚', 'diaria', 'tarde', 5, 12, true, grandes),
    T('Ler 15 minutinhos', '📖', 'diaria', 'tarde', 4, 10, true, grandes),
    T('Guardar os brinquedos', '🧸', 'diaria', 'tarde', 3, 6, false, todos),

    T('Banho sem ser chamado 3 vezes', '🚿', 'diaria', 'noite', 3, 6, false, todos),
    T('Escovar os dentes antes de dormir', '🦷', 'diaria', 'noite', 2, 5, false, todos),
    T('Roupa suja no cesto', '🧺', 'diaria', 'noite', 2, 4, false, todos),
    T('Mochila pronta pra amanhã', '🎒', 'diaria', 'noite', 3, 6, false, grandes),

    T('Ajudar a pôr a mesa', '🍽️', 'semanal', 'qualquer', 6, 15, false, todos),
    T('Organizar o quarto de verdade', '🧹', 'semanal', 'qualquer', 10, 25, true, grandes),

    T('Ajudar um irmão sem pedir nada em troca', '🤝', 'desafio', 'qualquer', 8, 20, true, todos),
    T('Um dia inteiro sem brigar', '😇', 'desafio', 'qualquer', 8, 20, true, todos),
    T('Aprender algo novo e me contar', '💡', 'desafio', 'qualquer', 8, 20, true, todos)
  ];
  if (pequenos.length) {
    S.tarefas.push(
      T('Fazer xixi no banheiro sozinha', '🚽', 'diaria', 'qualquer', 3, 6, false, pequenos),
      T('Comer sem drama', '🍝', 'diaria', 'qualquer', 3, 6, false, pequenos)
    );
  }

  const R = (titulo, icone, custo, nivelMin, desc) =>
    ({ id: uid(), titulo, icone, custo, nivelMin, kids: [], ativa: true, desc: desc || '' });

  S.recompensas = [
    R('15 min de desenho', '📺', 15, 1),
    R('20 min de tablet', '📱', 20, 1),
    R('Escolher a sobremesa', '🍨', 15, 1),
    R('Escolher o filme da noite', '🎬', 25, 1),
    R('Dormir 30 min mais tarde', '🌙', 40, 2, 'Só sexta ou sábado'),
    R('1 hora de videogame', '🎮', 50, 2, 'Fim de semana'),
    R('Sorvete na rua', '🍦', 60, 3),
    R('R$ 5 pra gastar como quiser', '💵', 70, 3),
    R('Escolher o almoço de domingo', '🍕', 80, 4),
    R('Corujão de videogame', '🌃', 150, 5, 'Sexta ou sábado, com hora combinada'),
    R('Passeio à sua escolha', '🎡', 200, 6),
    R('Amigo dorme aqui', '🏕️', 250, 6),
    R('Presente de até R$ 50', '🎁', 300, 7)
  ];
  salvar();
}

/* ---------- regras: tarefas do dia ---------- */
function serveAoKid(item, kidId) { return !item.kids || item.kids.length === 0 || item.kids.includes(kidId); }

function feitoDe(kidId, tarefaId, data) {
  const t = tarefaPorId(tarefaId);
  if (t && t.tipo === 'semanal') {
    const sem = semanaDe(data);
    return S.feitos.find(f => f.kidId === kidId && f.tarefaId === tarefaId && f.semana === sem && f.status !== 'recusada');
  }
  if (t && t.tipo === 'pontual') {
    return S.feitos.find(f => f.kidId === kidId && f.tarefaId === tarefaId && f.status !== 'recusada');
  }
  return S.feitos.find(f => f.kidId === kidId && f.tarefaId === tarefaId && f.data === data && f.status !== 'recusada');
}

function tarefasDoDia(kidId, data) {
  const dow = dataDe(data).getDay();
  return S.tarefas.filter(t => {
    if (!t.ativa || !serveAoKid(t, kidId)) return false;
    if (t.tipo === 'desafio') return false;
    if (t.tipo === 'diaria' && t.dias && t.dias.length && !t.dias.includes(dow)) return false;
    if (t.tipo === 'pontual' && feitoDe(kidId, t.id, data)) return false; // some depois de concluída
    return true;
  });
}

function desafiosDisponiveis(kidId) {
  return S.tarefas.filter(t => t.ativa && t.tipo === 'desafio' && serveAoKid(t, kidId));
}

function valorTarefa(t, kid) {
  let moedas = t.moedas, xp = t.xp;
  if (t.consolidada) { moedas = Math.max(1, Math.round(moedas / 2)); xp = Math.max(1, Math.round(xp / 2)); }
  if (t.tipo === 'desafio' && kid.desafio.semana === semanaAtual() && kid.desafio.tarefaId === t.id) {
    moedas *= 2; xp *= 2;                                            // desafio escolhido pela criança vale o dobro
  }
  return { moedas, xp };
}

/* ---------- créditos e extrato ---------- */
function creditar(kid, moedas, xp, texto) {
  kid.moedas += moedas;
  kid.xp += xp;
  if (moedas > 0) kid.totalMoedas += moedas;
  S.extrato.push({ id: uid(), kidId: kid.id, ts: Date.now(), moedas, xp, texto });
}

/* ---------- concluir / desfazer ---------- */
function concluirTarefa(kidId, tarefaId) {
  const kid = kidPorId(kidId), t = tarefaPorId(tarefaId), data = hojeISO();
  if (!kid || !t || feitoDe(kidId, tarefaId, data)) return null;
  const v = valorTarefa(t, kid);
  const f = {
    id: uid(), kidId, tarefaId, data, semana: semanaDe(data), ts: Date.now(),
    status: t.aprovacao ? 'pendente' : 'aprovada', moedas: v.moedas, xp: v.xp
  };
  S.feitos.push(f);
  const r = { feito: f, nivelAntes: nivelPorXp(kid.xp), subiuNivel: false, extras: null };
  if (!t.aprovacao) {
    creditar(kid, v.moedas, v.xp, t.icone + ' ' + t.titulo);
    r.subiuNivel = nivelPorXp(kid.xp) > r.nivelAntes;
    r.extras = fecharDiaSePerfeito(kid);
    talvezBau(kid, 'tarefa', t);
  }
  novasConquistas(kid);
  salvar();
  return r;
}

function desfazerTarefa(kidId, tarefaId) {
  const kid = kidPorId(kidId), data = hojeISO();
  const f = feitoDe(kidId, tarefaId, data);
  if (!f) return false;
  if (f.status === 'aprovada' && tarefaPorId(tarefaId) && tarefaPorId(tarefaId).aprovacao) return false; // já validado pelos pais
  if (f.status === 'aprovada') {
    kid.moedas = Math.max(0, kid.moedas - f.moedas);
    kid.xp = Math.max(0, kid.xp - f.xp);
    kid.totalMoedas = Math.max(0, kid.totalMoedas - f.moedas);
  }
  S.feitos = S.feitos.filter(x => x.id !== f.id);
  S.extrato = S.extrato.filter(e => !(e.kidId === kidId && e.ts === f.ts));
  salvar();
  return true;
}

function aprovarFeito(feitoId, aprovado) {
  const f = S.feitos.find(x => x.id === feitoId);
  if (!f || f.status !== 'pendente') return;
  const kid = kidPorId(f.kidId), t = tarefaPorId(f.tarefaId);
  if (!aprovado) { f.status = 'recusada'; salvar(); return; }
  f.status = 'aprovada';
  creditar(kid, f.moedas, f.xp, (t ? t.icone + ' ' + t.titulo : 'Tarefa') + ' (aprovada)');
  fecharDiaSePerfeito(kid);
  if (t) talvezBau(kid, 'tarefa', t);
  novasConquistas(kid);
  salvar();
}

function pendentes() { return S.feitos.filter(f => f.status === 'pendente'); }

/* ---------- dia perfeito, ofensiva e baú ---------- */
function recarregarEscudo(kid) {
  const sem = semanaAtual();
  if (kid.streak.semanaEscudo !== sem) { kid.streak.semanaEscudo = sem; kid.streak.escudos = 1; }
}

function diaEstaPerfeito(kidId, data) {
  const lista = tarefasDoDia(kidId, data).filter(t => t.tipo === 'diaria');
  if (!lista.length) return false;
  return lista.every(t => { const f = feitoDe(kidId, t.id, data); return f && f.status === 'aprovada'; });
}

function streakVivo(kid) {
  if (!kid.streak.ultimoDia) return 0;
  const d = diffDias(kid.streak.ultimoDia, hojeISO());
  if (d <= 1) return kid.streak.n;
  if (d === 2 && kid.streak.escudos > 0) return kid.streak.n;   // escudo ainda segura
  return 0;
}

function fecharDiaSePerfeito(kid) {
  const data = hojeISO();
  if (kid.streak.ultimoDia === data) return null;
  if (!diaEstaPerfeito(kid.id, data)) return null;

  recarregarEscudo(kid);
  const ultimo = kid.streak.ultimoDia;
  let escudoUsado = false;
  if (!ultimo) kid.streak.n = 1;
  else {
    const d = diffDias(ultimo, data);
    if (d === 1) kid.streak.n += 1;
    else if (d === 2 && kid.streak.escudos > 0) { kid.streak.escudos -= 1; kid.streak.n += 1; escudoUsado = true; }
    else kid.streak.n = 1;
  }
  kid.streak.ultimoDia = data;
  kid.streak.melhor = Math.max(kid.streak.melhor, kid.streak.n);

  const bonusStreak = Math.min(kid.streak.n, 7);
  const moedas = S.cfg.bonusDiaPerfeito + bonusStreak;
  creditar(kid, moedas, S.cfg.xpDiaPerfeito, '⭐ Dia perfeito (ofensiva ' + kid.streak.n + ')');

  talvezBau(kid, 'dia');
  // guardado para a criança ver a comemoração mesmo quando quem fechou o dia foi a aprovação dos pais
  kid.ultimaFesta = { data, moedas, xp: S.cfg.xpDiaPerfeito, streak: kid.streak.n, escudoUsado, vista: false };
  return kid.ultimaFesta;
}

/* ---------- baú surpresa ----------
   O prêmio é sorteado na hora e fica "fechado" (kid.bauPendente) até a
   criança tocar em "Abrir" — só aí é creditado. */
function premiosDeBau(kid) {
  return recompensasDoKid(kid.id).filter(r => r.custo <= 30 && nivelPorXp(kid.xp) >= r.nivelMin);
}

function sorteioBau(kid) {
  const itens = S.cfg.bau.itens || {};
  const tipos = [];
  if (itens.moedas !== false) tipos.push('moedas', 'moedas');    // moedas com peso maior
  if (itens.xp) tipos.push('xp');
  if (itens.escudo && kid.streak.escudos < 2) tipos.push('escudo');
  if (itens.premio && premiosDeBau(kid).length) tipos.push('premio');
  if (!tipos.length) tipos.push('moedas');
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  if (tipo === 'moedas') return { tipo, moedas: 3 + Math.floor(Math.random() * 10) };
  if (tipo === 'xp') return { tipo, xp: 10 + Math.floor(Math.random() * 16) };
  if (tipo === 'escudo') return { tipo };
  const opcoes = premiosDeBau(kid);
  const r = opcoes[Math.floor(Math.random() * opcoes.length)];
  return { tipo: 'premio', recompensaId: r.id, titulo: r.titulo, icone: r.icone };
}

function talvezBau(kid, gatilho, tarefa) {
  const cfg = S.cfg.bau;
  if (!cfg || kid.bauPendente) return;
  if (cfg.quando === 'dia' && gatilho !== 'dia') return;
  if (cfg.quando !== 'dia' && gatilho === 'dia') return;
  if (cfg.quando === 'selecionadas' && (!tarefa || !tarefa.bau)) return;
  if (Math.random() >= cfg.chance) return;
  kid.bauPendente = sorteioBau(kid);
}

function abrirBau(kidId) {
  const kid = kidPorId(kidId), b = kid && kid.bauPendente;
  if (!b) return null;
  if (b.tipo === 'moedas') creditar(kid, b.moedas, 0, '🎁 Baú surpresa');
  else if (b.tipo === 'xp') creditar(kid, 0, b.xp, '🎁 Baú surpresa');
  else if (b.tipo === 'escudo') {
    kid.streak.escudos += 1;
    S.extrato.push({ id: uid(), kidId: kid.id, ts: Date.now(), moedas: 0, xp: 0, texto: '🎁 Baú: escudo extra 🛡️' });
  } else if (b.tipo === 'premio') {
    S.resgates.push({ id: uid(), kidId: kid.id, recompensaId: b.recompensaId, ts: Date.now(), custo: 0, status: 'pendente', titulo: b.titulo, icone: b.icone });
    S.extrato.push({ id: uid(), kidId: kid.id, ts: Date.now(), moedas: 0, xp: 0, texto: '🎁 Baú: ' + b.titulo });
  }
  kid.bauPendente = null;
  novasConquistas(kid);
  salvar();
  return b;
}

/* ---------- loja ---------- */
function recompensasDoKid(kidId) {
  return S.recompensas.filter(r => r.ativa && serveAoKid(r, kidId)).sort((a, b) => a.custo - b.custo);
}

function comprar(kidId, recompensaId) {
  const kid = kidPorId(kidId), r = recompensaPorId(recompensaId);
  if (!kid || !r) return { ok: false, erro: 'sumiu' };
  if (nivelPorXp(kid.xp) < r.nivelMin) return { ok: false, erro: 'nivel' };
  if (kid.moedas < r.custo) return { ok: false, erro: 'moedas' };
  kid.moedas -= r.custo;
  S.extrato.push({ id: uid(), kidId, ts: Date.now(), moedas: -r.custo, xp: 0, texto: '🛒 ' + r.titulo });
  S.resgates.push({ id: uid(), kidId, recompensaId, ts: Date.now(), custo: r.custo, status: 'pendente', titulo: r.titulo, icone: r.icone });
  novasConquistas(kid);
  salvar();
  return { ok: true };
}

// Desfaz uma compra ainda não entregue: devolve as moedas e tira o prêmio da fila.
// Não usa creditar() de propósito — devolução não conta como "moedas ganhas" (totalMoedas).
function desfazerCompra(kidId, resgateId) {
  const r = S.resgates.find(x => x.id === resgateId);
  if (!r || r.kidId !== kidId || r.status !== 'pendente') return false;
  const kid = kidPorId(kidId);
  if (!kid) return false;
  kid.moedas += r.custo;
  S.extrato.push({ id: uid(), kidId, ts: Date.now(), moedas: r.custo, xp: 0, texto: '↩️ Devolvido: ' + r.titulo });
  S.resgates = S.resgates.filter(x => x.id !== r.id);
  salvar();
  return true;
}

function resgatesDoKid(kidId, status) {
  return S.resgates.filter(x => x.kidId === kidId && (!status || x.status === status)).sort((a, b) => b.ts - a.ts);
}

/* ---------- cofrinho (investimento) ----------
   A criança guarda moedas por um prazo e recebe mais de volta.
   Quebrar antes da hora devolve só o principal — ela nunca perde moedas. */
function rendimentoDe(moedas, pct) { return Math.max(1, Math.ceil(moedas * pct / 100)); }

function estadoCofrinho(kid) {
  const c = kid.cofrinho;
  if (!c) return null;
  const passados = Math.max(0, diffDias(c.inicio, hojeISO()));
  const rendimento = rendimentoDe(c.moedas, c.pct);
  return {
    moedas: c.moedas, dias: c.dias, pct: c.pct, inicio: c.inicio,
    passados: Math.min(passados, c.dias), faltam: Math.max(0, c.dias - passados),
    pronto: passados >= c.dias, rendimento, total: c.moedas + rendimento
  };
}

function abrirCofrinho(kidId, moedas, dias, pct) {
  const kid = kidPorId(kidId);
  moedas = Math.floor(Number(moedas) || 0);
  if (!kid || kid.cofrinho || moedas < 1 || kid.moedas < moedas) return false;
  kid.moedas -= moedas;
  kid.cofrinho = { moedas, dias, pct, inicio: hojeISO(), ts: Date.now() };
  S.extrato.push({ id: uid(), kidId, ts: Date.now(), moedas: -moedas, xp: 0, texto: '🐷 Guardou no cofrinho (' + dias + ' dias)' });
  salvar();
  return true;
}

function resgatarCofrinho(kidId) {
  const kid = kidPorId(kidId), e = kid && estadoCofrinho(kid);
  if (!e || !e.pronto) return null;
  kid.moedas += e.total;
  kid.totalMoedas += e.rendimento;          // só o rendimento é moeda "nova"; o principal já contou quando foi ganho
  kid.cofrinhosCompletos += 1;
  S.extrato.push({ id: uid(), kidId, ts: Date.now(), moedas: e.total, xp: 0, texto: '🐷 Cofrinho rendeu +' + e.rendimento + '!' });
  kid.cofrinho = null;
  novasConquistas(kid);
  salvar();
  return e;
}

function quebrarCofrinho(kidId) {
  const kid = kidPorId(kidId), e = kid && estadoCofrinho(kid);
  if (!e || e.pronto) return null;          // se já está pronto, o caminho é resgatar
  kid.moedas += e.moedas;
  S.extrato.push({ id: uid(), kidId, ts: Date.now(), moedas: e.moedas, xp: 0, texto: '🐷 Quebrou o cofrinho antes da hora' });
  kid.cofrinho = null;
  salvar();
  return e;
}

/* ---------- missão de fim de semana ----------
   Meta semanal individual que desbloqueia um prêmio exclusivo (uma
   experiência, fora da economia de moedas) no sábado e domingo. */
function progressoMissao(kid) {
  const m = S.missoes[kid.id];
  if (!m || !m.ativa) return null;
  const sem = semanaAtual(), hoje = hojeISO();
  let atual = 0;
  if (m.tipo === 'perfeitos') {
    const d = dataDe(inicioDaSemana(hoje));
    for (let i = 0; i < 7 && ymd(d) <= hoje; i++, d.setDate(d.getDate() + 1))
      if (diaEstaPerfeito(kid.id, ymd(d))) atual++;
  } else if (m.tipo === 'tarefa') {
    atual = S.feitos.filter(f => f.kidId === kid.id && f.semana === sem && f.status === 'aprovada' && f.tarefaId === m.tarefaId).length;
  } else {
    atual = S.feitos.filter(f => f.kidId === kid.id && f.semana === sem && f.status === 'aprovada').length;
  }
  const dow = dataDe(hoje).getDay();
  return {
    m, atual, alvo: m.alvo,
    pct: Math.min(100, (atual / Math.max(1, m.alvo)) * 100),
    fimDeSemana: dow === 6 || dow === 0,
    batida: atual >= m.alvo
  };
}

/* ---------- meta cooperativa da família ---------- */
function progressoMeta() {
  const ini = inicioDaSemana(hojeISO()), sem = semanaAtual();
  const total = S.feitos.filter(f => f.status === 'aprovada' && f.semana === sem).length;
  return { total, alvo: S.meta.alvo, pct: Math.min(100, (total / Math.max(1, S.meta.alvo)) * 100), semana: sem, inicio: ini };
}

/* ---------- conquistas ---------- */
const CONQUISTAS = [
  { id: 'primeira', icone: '🌱', nome: 'Primeiro passo', desc: 'Concluiu a primeira tarefa', teste: k => contaFeitos(k.id) >= 1 },
  { id: 'fogo3', icone: '🔥', nome: 'Pegando fogo', desc: '3 dias perfeitos seguidos', teste: k => k.streak.melhor >= 3 },
  { id: 'semana', icone: '🗓️', nome: 'Semana impecável', desc: '7 dias perfeitos seguidos', teste: k => k.streak.melhor >= 7 },
  { id: 'mes', icone: '🏅', nome: 'Mês lendário', desc: '30 dias perfeitos seguidos', teste: k => k.streak.melhor >= 30 },
  { id: 'nivel5', icone: '⭐', nome: 'Nível 5', desc: 'Chegou ao nível 5', teste: k => nivelPorXp(k.xp) >= 5 },
  { id: 'nivel10', icone: '🏆', nome: 'Nível 10', desc: 'Chegou ao nível 10', teste: k => nivelPorXp(k.xp) >= 10 },
  { id: 'compra1', icone: '🛒', nome: 'Primeira troca', desc: 'Trocou moedas por um prêmio', teste: k => S.resgates.some(r => r.kidId === k.id) },
  { id: 'cem', icone: '💯', nome: 'Cem tarefas', desc: 'Concluiu 100 tarefas', teste: k => contaFeitos(k.id) >= 100 },
  { id: 'rico', icone: '💎', nome: 'Poupador', desc: 'Juntou 300 moedas de uma vez', teste: k => k.moedas >= 300 },
  { id: 'investidor', icone: '🐷', nome: 'Investidor', desc: 'Deixou o cofrinho render até o fim', teste: k => (k.cofrinhosCompletos || 0) >= 1 }
];
function contaFeitos(kidId) { return S.feitos.filter(f => f.kidId === kidId && f.status === 'aprovada').length; }
function novasConquistas(kid) {
  const novas = [];
  CONQUISTAS.forEach(c => {
    if (!kid.conquistas.includes(c.id) && c.teste(kid)) { kid.conquistas.push(c.id); novas.push(c); }
  });
  return novas;
}

/* ---------- backup ---------- */
function exportarJSON() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'herois-da-rotina-' + hojeISO() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importarJSON(texto) {
  const dados = JSON.parse(texto);
  if (!dados || !Array.isArray(dados.kids)) throw new Error('Arquivo inválido');
  localStorage.setItem(CHAVE, JSON.stringify(dados));
  carregar();   // normaliza campos que faltarem no backup antigo
  salvar();
}
