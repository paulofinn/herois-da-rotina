/* =========================================================
   Heróis da Rotina — telas da criança
   ========================================================= */

const PERIODOS = [
  { id: 'manha',   nome: '🌅 De manhã' },
  { id: 'tarde',   nome: '☀️ De tarde' },
  { id: 'noite',   nome: '🌙 De noite' },
  { id: 'qualquer',nome: '✨ Quando quiser' }
];

let kidAtual = null;
let abaKid = 'hoje';

/* ---------------- seleção de perfil ---------------- */
function telaSelecao() {
  kidAtual = null;
  const cards = S.kids.map(k => {
    const p = progressoNivel(k.xp), fogo = streakVivo(k);
    return '<button class="perfil" data-kid="' + k.id + '" style="--accent:' + k.cor + '">' +
      '<div class="av">' + k.icone + '</div>' +
      '<div class="nome">' + esc(k.nome) + '</div>' +
      '<div class="sub"><span>⭐ Nível ' + p.nivel + '</span><span>🪙 ' + k.moedas + '</span>' +
        (fogo > 0 ? '<span>🔥 ' + fogo + '</span>' : '') + '</div>' +
      '<div class="barra"><i style="width:' + p.pct + '%"></i></div>' +
    '</button>';
  }).join('');

  $('#app').innerHTML =
    '<div class="tela" id="selecao"><div class="wrap">' +
      '<div class="marca"><div class="logo">🏅</div><h1>Heróis da Rotina</h1>' +
      '<p>Quem é você hoje?</p></div>' +
      '<div class="perfis">' + cards +
        '<button class="perfil pais" data-admin="1"><div class="av">🔐</div>' +
        '<div class="nome">Pais</div><div class="sub"><span>Ajustes e aprovações</span></div>' +
        (pendentes().length ? '<div class="sub" style="margin-top:8px"><span style="background:#ff5c6c;color:#fff;padding:3px 10px;border-radius:99px">' + pendentes().length + ' esperando</span></div>' : '') +
        '</button>' +
      '</div>' +
    '</div></div>';

  $$('[data-kid]').forEach(b => b.onclick = () => abrirKid(b.dataset.kid));
  $('[data-admin]').onclick = () => pedirPin('Área dos pais', () => telaAdmin());
}

function abrirKid(id) { kidAtual = id; abaKid = 'hoje'; telaKid(); }

/* ---------------- tela da criança ---------------- */
function telaKid() {
  const kid = kidPorId(kidAtual);
  if (!kid) return telaSelecao();
  recarregarEscudo(kid);
  const p = progressoNivel(kid.xp), fogo = streakVivo(kid);

  const topo =
    '<div class="topo"><div class="wrap"><div class="linha">' +
      '<button class="voltar" id="btn-voltar">←</button>' +
      '<div class="eu"><div class="av">' + kid.icone + '</div><div class="txt">' +
        '<div class="nome">' + esc(kid.nome) + '<span class="tag-nivel">Nível ' + p.nivel + '</span></div>' +
        '<div class="barra"><i style="width:' + p.pct + '%"></i></div>' +
        '<div class="xp">' + p.atual + ' / ' + p.faixa + ' XP para o nível ' + (p.nivel + 1) + '</div>' +
      '</div></div>' +
      '<div class="saldos">' +
        '<div class="pill moedas" id="pill-moedas">🪙 ' + kid.moedas + '</div>' +
        '<div class="pill fogo' + (fogo ? '' : ' off') + '">🔥 ' + fogo + '</div>' +
      '</div>' +
    '</div></div></div>';

  const abas =
    '<div class="abas">' +
      ['hoje|✅|Hoje', 'loja|🎁|Prêmios', 'eu|🏆|Você'].map(a => {
        const [id, ic, nome] = a.split('|');
        return '<button data-aba="' + id + '" class="' + (abaKid === id ? 'on' : '') + '">' + ic + ' ' + nome + '</button>';
      }).join('') +
    '</div>';

  const conteudo = abaKid === 'hoje' ? abaHoje(kid) : abaKid === 'loja' ? abaLoja(kid) : abaEu(kid);

  $('#app').innerHTML =
    '<div class="tela' + (kid.simples ? ' simples' : '') + '" style="--accent:' + kid.cor + ';--accent-soft:' + kid.cor + '1a">' +
      topo + '<div class="wrap">' + conteudo + '</div>' + abas +
    '</div>';

  $('#btn-voltar').onclick = telaSelecao;
  $$('[data-aba]').forEach(b => b.onclick = () => { abaKid = b.dataset.aba; telaKid(); });
  ligarEventosHoje(kid);
  ligarEventosLoja(kid);
  festasPendentes(kid);
}

/* Comemorações ficam numa fila: assim a criança vê a festa mesmo se o dia
   só fechou depois que os pais aprovaram uma tarefa. */
function festasPendentes(kid) {
  if (kid.ultimaFesta && !kid.ultimaFesta.vista) {
    kid.ultimaFesta.vista = true; salvar();
    return setTimeout(() => festaDeFimDeDia(kid, kid.ultimaFesta), 350);
  }
  const nivel = nivelPorXp(kid.xp);
  if (nivel > (kid.nivelVisto || 1)) {
    kid.nivelVisto = nivel; salvar();
    setTimeout(() => festaDeNivel(kid), 350);
  }
}

/* ---------------- aba HOJE ---------------- */
function abaHoje(kid) {
  const data = hojeISO();
  const lista = tarefasDoDia(kid.id, data);
  const feitas = lista.filter(t => { const f = feitoDe(kid.id, t.id, data); return f && f.status === 'aprovada'; }).length;
  // progresso "presenteado": a barra nunca começa vazia (efeito de gradiente de meta)
  const pct = lista.length ? Math.max(7, (feitas / lista.length) * 100) : 7;

  let html =
    '<div class="sec"><div class="meta-card"><div class="cabeca">' +
      '<div class="ic">' + (feitas === lista.length && lista.length ? '🎉' : '🚀') + '</div>' +
      '<div style="flex:1"><b>' + (feitas === lista.length && lista.length ? 'Dia completo! Mandou bem!' : 'Seu dia') + '</b>' +
      '<small style="display:block">' + feitas + ' de ' + lista.length + ' tarefas concluídas</small></div>' +
      '<div style="font-size:26px;font-weight:800;color:var(--accent)">' + Math.round((feitas / Math.max(1, lista.length)) * 100) + '%</div>' +
    '</div><div class="barra"><i style="width:' + pct + '%"></i></div></div></div>';

  if (!kid.simples) html += cardDesafio(kid);   // escolher desafio exige ler; no modo pequeno atrapalha

  PERIODOS.forEach(p => {
    const doPeriodo = lista.filter(t => (t.periodo || 'qualquer') === p.id);
    if (!doPeriodo.length) return;
    html += '<div class="sec"><h2>' + p.nome + '<span class="conta">' +
      doPeriodo.filter(t => feitoDe(kid.id, t.id, data)).length + '/' + doPeriodo.length + '</span></h2><div class="grade">' +
      doPeriodo.map(t => cardTarefa(kid, t, data)).join('') + '</div></div>';
  });

  html += cardMetaFamilia();
  return html;
}

function cardTarefa(kid, t, data) {
  const f = feitoDe(kid.id, t.id, data);
  const v = valorTarefa(t, kid);
  const cls = f ? (f.status === 'pendente' ? 'espera' : 'feita') : '';
  const marca = f ? (f.status === 'pendente' ? '⏳' : '✅') : '⚪';
  return '<button class="tarefa ' + cls + (t.consolidada ? ' habito' : '') + '" data-tarefa="' + t.id + '">' +
    '<div class="ic">' + t.icone + '</div>' +
    '<div style="flex:1;min-width:0"><div class="tit">' + esc(t.titulo) + '</div>' +
      '<div class="val"><span>🪙 ' + v.moedas + '</span><span>⭐ ' + v.xp + ' XP</span>' +
      (t.aprovacao ? '<span style="color:var(--alerta)">precisa do OK</span>' : '') +
      (t.consolidada ? '<span class="selo">hábito</span>' : '') + '</div>' +
    '</div><div class="marca-ok">' + marca + '</div></button>';
}

function cardDesafio(kid) {
  const opcoes = desafiosDisponiveis(kid.id);
  if (!opcoes.length) return '';
  const sem = semanaAtual();
  const escolhido = kid.desafio.semana === sem ? kid.desafio.tarefaId : '';
  const data = hojeISO();

  if (!escolhido) {
    return '<div class="sec"><div class="desafio-card">' +
      '<h3>🎯 Escolha seu desafio da semana</h3>' +
      '<p>Você decide qual encarar. O escolhido vale <b>o dobro</b> de moedas e XP.</p>' +
      '<div class="desafio-opcoes">' + opcoes.map(t =>
        '<button class="desafio-op" data-desafio="' + t.id + '"><span class="ic">' + t.icone + '</span>' +
        '<span><b>' + esc(t.titulo) + '</b><small>🪙 ' + (t.moedas * 2) + ' · ⭐ ' + (t.xp * 2) + ' XP</small></span></button>'
      ).join('') + '</div></div></div>';
  }

  const t = tarefaPorId(escolhido);
  if (!t) return '';
  const f = feitoDe(kid.id, t.id, data);
  const v = valorTarefa(t, kid);
  return '<div class="sec"><div class="desafio-card">' +
    '<h3>🎯 Seu desafio da semana</h3>' +
    '<div class="desafio-opcoes"><button class="desafio-op escolhido" data-tarefa="' + t.id + '">' +
      '<span class="ic">' + t.icone + '</span><span><b>' + esc(t.titulo) + '</b>' +
      '<small>🪙 ' + v.moedas + ' · ⭐ ' + v.xp + ' XP · ' +
      (f ? (f.status === 'pendente' ? 'esperando o OK ⏳' : 'conquistado! ✅') : 'toque quando conseguir') + '</small></span></button></div>' +
  '</div></div>';
}

function cardMetaFamilia() {
  if (!S.meta.ativa) return '';
  const m = progressoMeta();
  const completa = m.total >= m.alvo;
  return '<div class="sec"><h2>👨‍👩‍👧‍👦 Missão da família</h2><div class="meta-card">' +
    '<div class="cabeca"><div class="ic">' + (completa ? '🏆' : '🍕') + '</div><div style="flex:1">' +
    '<b>' + esc(S.meta.titulo) + '</b><small style="display:block">' +
    (completa ? 'Conseguimos! Todo mundo ganhou.' : 'Juntos, ' + m.total + ' de ' + m.alvo + ' tarefas nesta semana') +
    '</small></div></div><div class="barra"><i style="width:' + m.pct + '%"></i></div></div></div>';
}

function ligarEventosHoje(kid) {
  $$('[data-desafio]').forEach(b => b.onclick = () => {
    kid.desafio = { semana: semanaAtual(), tarefaId: b.dataset.desafio };
    salvar(); som('compra'); toast('Desafio escolhido! Vale o dobro 🎯'); telaKid();
  });

  $$('[data-tarefa]').forEach(b => b.onclick = () => {
    const id = b.dataset.tarefa, t = tarefaPorId(id);
    const f = feitoDe(kid.id, id, hojeISO());
    if (f) {
      if (desfazerTarefa(kid.id, id)) { toast('Desmarcado'); telaKid(); }
      else toast('Isso já foi aprovado pelos pais 😉');
      return;
    }
    const r = concluirTarefa(kid.id, id);
    if (!r) return;
    if (t.aprovacao) {
      som('compra');
      flutuar(b, '⏳');
      toast('Enviado pra aprovação dos pais!');
      telaKid();
      return;
    }
    som('moeda');
    flutuar(b, '+' + r.feito.moedas + ' 🪙');
    setTimeout(telaKid, 260);   // dá tempo da moeda subir antes de redesenhar
  });
}

/* ---------------- comemorações ---------------- */
function festaDeNivel(kid) {
  const n = nivelPorXp(kid.xp);
  const novas = recompensasDoKid(kid.id).filter(r => r.nivelMin === n);
  confete(90); som('nivel');
  modal({
    classe: 'brinde',
    corpo: '<div class="brinde"><div class="grande">🎉</div>' +
      '<h3 style="margin-top:10px">Nível ' + n + '!</h3>' +
      '<p class="sub">Você está ficando muito bom nisso, ' + esc(kid.nome) + '.</p>' +
      (novas.length ? '<div style="margin-top:16px;background:var(--accent-soft);border-radius:16px;padding:14px">' +
        '<b>Desbloqueado na loja:</b><br>' + novas.map(r => r.icone + ' ' + esc(r.titulo)).join('<br>') + '</div>' : '') +
      '</div>',
    botoes: [{ texto: 'Uhuul!', acao: () => { fecharModal(); telaKid(); } }]
  });
}

function festaDeFimDeDia(kid, extras) {
  confete(110); som('nivel');
  modal({
    classe: 'brinde',
    corpo: '<div class="brinde"><div class="grande">⭐</div>' +
      '<h3 style="margin-top:10px">Dia perfeito!</h3>' +
      '<p class="sub">Todas as tarefas de hoje, feitas.</p>' +
      '<div style="margin-top:16px;background:var(--accent-soft);border-radius:16px;padding:14px;text-align:left">' +
        '<div>🪙 <b>+' + extras.moedas + '</b> de bônus</div>' +
        '<div>⭐ <b>+' + extras.xp + '</b> XP</div>' +
        '<div>🔥 Ofensiva de <b>' + extras.streak + ' dia' + (extras.streak > 1 ? 's' : '') + '</b></div>' +
        (extras.escudoUsado ? '<div>🛡️ Seu escudo salvou a ofensiva!</div>' : '') +
        (extras.bau ? '<div style="margin-top:8px;color:#b57a00"><b>🎁 Baú surpresa: +' + extras.bau + ' moedas!</b></div>' : '') +
      '</div></div>',
    botoes: [{ texto: 'Boa!', acao: () => { fecharModal(); telaKid(); } }]
  });
}

/* ---------------- aba LOJA ---------------- */
function abaLoja(kid) {
  const nivel = nivelPorXp(kid.xp);
  const lista = recompensasDoKid(kid.id);
  const espera = resgatesDoKid(kid.id, 'pendente');

  let html = '';
  if (espera.length) {
    html += '<div class="sec"><h2>⏳ Já é seu, esperando pra usar</h2><div class="extrato">' +
      espera.map(r => '<div class="item"><span style="font-size:22px">' + r.icone + '</span><b>' + esc(r.titulo) + '</b>' +
        '<span class="quando">' + quando(r.ts) + '</span>' +
        '<button class="btn pequeno claro" data-devolver="' + r.id + '">↩️ Devolver</button></div>').join('') + '</div></div>';
  }

  // cofrinho pede leitura e noção de tempo; no modo pequeno atrapalha
  if (!kid.simples && S.cfg.cofrinho && S.cfg.cofrinho.ativo) html += cardCofrinho(kid);

  const faixas = [
    { nome: '💚 Dá pra hoje', filtro: r => r.custo <= 30 },
    { nome: '💙 Vale a pena juntar', filtro: r => r.custo > 30 && r.custo <= 100 },
    { nome: '💜 Sonho grande', filtro: r => r.custo > 100 }
  ];
  faixas.forEach(f => {
    const itens = lista.filter(f.filtro);
    if (!itens.length) return;
    html += '<div class="sec"><h2>' + f.nome + '</h2><div class="grade">' + itens.map(r => {
      const travado = nivel < r.nivelMin;
      const caro = !travado && kid.moedas < r.custo;
      return '<button class="premio ' + (travado ? 'bloqueado' : caro ? 'caro' : '') + '" data-premio="' + r.id + '">' +
        '<div class="ic">' + (travado ? '🔒' : r.icone) + '</div>' +
        '<div class="tit">' + esc(r.titulo) + '</div>' +
        (r.desc ? '<div class="desc">' + esc(r.desc) + '</div>' : '') +
        '<div class="custo">' + (travado ? 'Nível ' + r.nivelMin : '🪙 ' + r.custo) + '</div>' +
      '</button>';
    }).join('') + '</div></div>';
  });

  if (!lista.length) html += '<div class="vazio">Nenhum prêmio cadastrado ainda.<br>Peça pros pais adicionarem 😉</div>';
  return html;
}

function cardCofrinho(kid) {
  const e = estadoCofrinho(kid);

  if (!e) {
    const planos = (S.cfg.cofrinho.planos || []).filter(p => p.dias > 0 && p.pct > 0);
    if (!planos.length) return '';
    return '<div class="sec"><div class="desafio-card">' +
      '<h3>🐷 Cofrinho</h3>' +
      '<p>Guarde moedas por uns dias e elas <b>rendem</b>: você recebe mais do que guardou!</p>' +
      '<div class="desafio-opcoes">' + planos.map((p, i) =>
        '<button class="desafio-op" data-plano="' + i + '"><span class="ic">' + (i === 0 ? '⏳' : '🏦') + '</span>' +
        '<span><b>' + p.dias + ' dias · rende +' + p.pct + '%</b>' +
        '<small>por exemplo: 20 moedas viram ' + (20 + rendimentoDe(20, p.pct)) + '</small></span></button>'
      ).join('') + '</div></div></div>';
  }

  if (e.pronto) {
    return '<div class="sec"><div class="desafio-card">' +
      '<h3>🐷 Cofrinho pronto!</h3>' +
      '<p>Suas ' + e.moedas + ' moedas renderam <b>+' + e.rendimento + '</b>. Pode abrir!</p>' +
      '<button class="btn ok bloco" data-abrir-cofrinho="1" style="margin-top:12px">Abrir e pegar ' + e.total + ' 🪙</button>' +
    '</div></div>';
  }

  const pctBarra = Math.max(7, (e.passados / e.dias) * 100);
  return '<div class="sec"><div class="desafio-card">' +
    '<h3>🐷 Seu cofrinho</h3>' +
    '<p><b>' + e.moedas + ' moedas</b> guardadas, rendendo… ' +
      (e.faltam === 1 ? 'Amanhã elas viram' : 'Em ' + e.faltam + ' dias elas viram') + ' <b>' + e.total + '</b>!</p>' +
    '<div class="barra" style="margin-top:12px"><i style="width:' + pctBarra + '%"></i></div>' +
    '<small style="display:block;margin-top:6px;color:#c9c8ee">Dia ' + e.passados + ' de ' + e.dias + '</small>' +
    '<button class="btn pequeno claro" data-quebrar-cofrinho="1" style="margin-top:12px">🔨 Quebrar antes da hora</button>' +
  '</div></div>';
}

function modalGuardar(kid, plano) {
  const m = modal({
    titulo: '🐷 Guardar por ' + plano.dias + ' dias',
    sub: 'Rende +' + plano.pct + '%. Você tem ' + kid.moedas + ' moedas.',
    corpo: '<label class="campo">Quantas moedas guardar?' +
      '<input id="c_guardar" type="number" min="1" max="' + kid.moedas + '" value="' + Math.min(kid.moedas, 20) + '"></label>' +
      '<p id="c_preview" style="margin-top:10px;font-weight:700"></p>',
    botoes: [
      { texto: 'Agora não', classe: 'claro', acao: fecharModal },
      { texto: 'Guardar!', classe: 'ok', acao: () => {
          const v = Math.floor(Number($('#c_guardar', m).value) || 0);
          if (v < 1 || v > kid.moedas) { som('erro'); return toast('Escolha entre 1 e ' + kid.moedas + ' moedas', 'erro'); }
          fecharModal();
          if (abrirCofrinho(kid.id, v, plano.dias, plano.pct)) { som('compra'); toast('Guardado! Agora é deixar render 🐷'); telaKid(); }
        } }
    ]
  });
  const inp = $('#c_guardar', m), prev = $('#c_preview', m);
  const atualizar = () => {
    const v = Math.floor(Number(inp.value) || 0);
    prev.textContent = (v >= 1 && v <= kid.moedas)
      ? v + ' 🪙 viram ' + (v + rendimentoDe(v, plano.pct)) + ' 🪙 em ' + plano.dias + ' dias'
      : 'Escolha entre 1 e ' + kid.moedas;
  };
  inp.oninput = atualizar; atualizar();
}

function ligarEventosLoja(kid) {
  $$('[data-plano]').forEach(b => b.onclick = () => {
    const p = (S.cfg.cofrinho.planos || [])[Number(b.dataset.plano)];
    if (!p) return;
    if (kid.moedas < 1) { som('erro'); return toast('Junte moedas primeiro pra poder guardar', 'erro'); }
    modalGuardar(kid, p);
  });

  const abrir = $('[data-abrir-cofrinho]');
  if (abrir) abrir.onclick = () => {
    const e = resgatarCofrinho(kid.id);
    if (!e) return;
    som('nivel'); confete(90);
    modal({
      classe: 'brinde',
      corpo: '<div class="brinde"><div class="grande">🐷</div>' +
        '<h3 style="margin-top:10px">Rendeu!</h3>' +
        '<p class="sub">Você guardou ' + e.moedas + ' moedas e recebeu <b>' + e.total + '</b>. São +' + e.rendimento + ' de rendimento por saber esperar!</p></div>',
      botoes: [{ texto: 'Uhuul!', acao: () => { fecharModal(); telaKid(); } }]
    });
  };

  const quebrar = $('[data-quebrar-cofrinho]');
  if (quebrar) quebrar.onclick = () => {
    const e = estadoCofrinho(kid);
    if (!e || e.pronto) return;
    modal({
      titulo: '🔨 Quebrar o cofrinho?',
      sub: 'Você recebe as ' + e.moedas + ' moedas que guardou, mas perde o rendimento de +' + e.rendimento + '. ' +
        (e.faltam === 1 ? 'Falta só 1 dia!' : 'Faltam ' + e.faltam + ' dias.'),
      botoes: [
        { texto: 'Vou esperar', classe: 'claro', acao: fecharModal },
        { texto: 'Quebrar', classe: 'perigo', acao: () => {
            fecharModal();
            if (quebrarCofrinho(kid.id)) { som('compra'); toast('Cofrinho quebrado: +' + e.moedas + ' 🪙 de volta'); telaKid(); }
          } }
      ]
    });
  };

  $$('[data-devolver]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const r = S.resgates.find(x => x.id === b.dataset.devolver);
    if (!r || r.status !== 'pendente') return;
    modal({
      titulo: '↩️ Devolver este prêmio?',
      sub: '"' + esc(r.titulo) + '" volta pra loja e você recebe as ' + r.custo + ' moedas de volta.',
      botoes: [
        { texto: 'Quero ficar com ele', classe: 'claro', acao: fecharModal },
        { texto: 'Devolver', classe: 'ok', acao: () => {
            fecharModal();
            if (desfazerCompra(kid.id, r.id)) { som('moeda'); toast('Devolvido! +' + r.custo + ' moedas de volta 🪙'); telaKid(); }
          } }
      ]
    });
  });

  $$('[data-premio]').forEach(b => b.onclick = () => {
    const r = recompensaPorId(b.dataset.premio);
    const nivel = nivelPorXp(kid.xp);
    if (nivel < r.nivelMin) { som('erro'); return toast('Chegue ao nível ' + r.nivelMin + ' para desbloquear 🔒', 'erro'); }
    if (kid.moedas < r.custo) { som('erro'); return toast('Faltam ' + (r.custo - kid.moedas) + ' moedas. Você consegue!', 'erro'); }
    modal({
      titulo: r.icone + ' ' + esc(r.titulo),
      sub: 'Trocar ' + r.custo + ' moedas por este prêmio? Você ficaria com ' + (kid.moedas - r.custo) + '.',
      botoes: [
        { texto: 'Agora não', classe: 'claro', acao: fecharModal },
        { texto: 'Trocar!', classe: 'ok', acao: () => {
            const res = comprar(kid.id, r.id);
            fecharModal();
            if (res.ok) { som('compra'); confete(50); toast('Prêmio seu! Avise os pais 🎉'); telaKid(); }
          } }
      ]
    });
  });
}

/* ---------------- aba VOCÊ ---------------- */
function abaEu(kid) {
  const p = progressoNivel(kid.xp);
  const feitos = contaFeitos(kid.id);
  const ext = S.extrato.filter(e => e.kidId === kid.id).slice(-15).reverse();

  let html = '<div class="sec"><div class="meta-card"><div class="cabeca">' +
    '<div class="ic" style="font-size:44px">' + kid.icone + '</div><div style="flex:1">' +
    '<b style="font-size:20px">' + esc(kid.nome) + '</b>' +
    '<small style="display:block">Nível ' + p.nivel + ' · ' + kid.xp + ' XP no total</small></div></div>' +
    '<div class="barra" style="height:12px"><i style="width:' + p.pct + '%"></i></div>' +
    '<div style="display:flex;gap:18px;margin-top:16px;flex-wrap:wrap">' +
      caixinha('✅', feitos, 'tarefas feitas') +
      caixinha('🔥', streakVivo(kid), 'dias seguidos') +
      caixinha('🏅', kid.streak.melhor, 'melhor sequência') +
      caixinha('🛡️', kid.streak.escudos, 'escudo da semana') +
      caixinha('🪙', kid.totalMoedas, 'moedas ganhas') +
      (kid.cofrinho ? caixinha('🐷', kid.cofrinho.moedas, 'no cofrinho') : '') +
    '</div></div></div>';

  html += '<div class="sec"><h2>🏆 Conquistas<span class="conta">' + kid.conquistas.length + '/' + CONQUISTAS.length + '</span></h2><div class="medalhas">' +
    CONQUISTAS.map(c => {
      const tem = kid.conquistas.includes(c.id);
      return '<div class="medalha' + (tem ? '' : ' off') + '"><div class="ic">' + (tem ? c.icone : '🔒') + '</div>' +
        '<b>' + c.nome + '</b><small>' + c.desc + '</small></div>';
    }).join('') + '</div></div>';

  html += '<div class="sec"><h2>📜 Últimas movimentações</h2>' +
    (ext.length ? '<div class="extrato">' + ext.map(e =>
      '<div class="item"><span>' + esc(e.texto) + '</span>' +
      '<span class="quando">' + quando(e.ts) + '</span>' +
      '<span class="d ' + (e.moedas >= 0 ? 'pos' : 'neg') + '">' + (e.moedas >= 0 ? '+' : '') + e.moedas + ' 🪙</span></div>'
    ).join('') + '</div>' : '<div class="vazio">Nada por aqui ainda.</div>') + '</div>';

  return html;
}

function caixinha(ic, valor, texto) {
  return '<div style="text-align:center;min-width:78px"><div style="font-size:22px">' + ic + '</div>' +
    '<div style="font-weight:800;font-size:19px">' + valor + '</div>' +
    '<small style="color:var(--muted);font-size:11px">' + texto + '</small></div>';
}
