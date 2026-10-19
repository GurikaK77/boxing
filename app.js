/* Shadow Boxing: app logic. Needs content.js loaded first.
   Sections: state, audio, speech, setup screen, training session, rhythm, free round,
   warm-up / cool-down, mirror, technique figures, learn screen (cards, course, quiz, my combos). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));


  /* ---------- State ---------- */
  const KEY = 'shadowboxing.v1';
  const cfg = {
    rounds: 3, len: 120, rest: 30, level: 'easy', tempo: 'mid', voice: 'num', sound: true, vib: true,
    mode: 'combo',   // combo | counter | free
    bpm: 0,          // 0 = no rhythm, otherwise beats per minute
    ramp: false,     // tempo grows from round to round
    finisher: false, // last 10 seconds of every round: all-out flurry
    warm: false, cool: false, mirror: false
  };
  const NUMERIC = ['len', 'rest', 'bpm'];
  const MODES = ['combo', 'counter', 'free'];
  const S = {
    active: false, phase: 'idle', round: 0, roundsDone: 0,
    total: 0, endAt: 0, remaining: 0, paused: false,
    ticker: null, token: 0, last: '', combos: 0, punches: 0, lastBeep: -1
  };
  // settings of the running session: the setup values, or those overridden by a lesson / drill
  let run = cfg;
  let plan = null;

  // learning progress (kept apart from the setup values)
  const PKEY = KEY + '.progress';
  const prog = { custom: [], hard: {}, course: 0, quizBest: 0 };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        Object.keys(cfg).forEach(k => { if (k in d) cfg[k] = d[k]; });
      }
    } catch (e) {}
    try {
      const raw = localStorage.getItem(PKEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.custom)) prog.custom = d.custom.filter(c => typeof c === 'string').slice(0, 30);
        if (d.hard && typeof d.hard === 'object') prog.hard = d.hard;
        prog.course = Math.max(0, parseInt(d.course, 10) || 0);
        prog.quizBest = Math.max(0, parseInt(d.quizBest, 10) || 0);
      }
    } catch (e) {}
    cfg.rounds = Math.min(12, Math.max(1, parseInt(cfg.rounds, 10) || 3));
    if (!POOLS[cfg.level]) cfg.level = 'easy';
    if (!TEMPO[cfg.tempo]) cfg.tempo = 'mid';
    if (!MODES.includes(cfg.mode)) cfg.mode = 'combo';
    if (![0, 90, 110, 130].includes(Number(cfg.bpm))) cfg.bpm = 0;
    cfg.bpm = Number(cfg.bpm);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  function saveProg() { try { localStorage.setItem(PKEY, JSON.stringify(prog)); } catch (e) {} }

  /* ---------- Helpers ---------- */
  const fmt = sec => {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  };
  const rand = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const ICON_SUN = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_MOON = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="currentColor"/></svg>';
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  function renderTheme() { $('#themeBtn').innerHTML = isDark() ? ICON_SUN : ICON_MOON; }
  function initTheme() {
    try { const t = localStorage.getItem(KEY + '.theme'); if (t === 'light' || t === 'dark') root.dataset.theme = t; } catch (e) {}
    renderTheme();
    $('#themeBtn').addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY + '.theme', next); } catch (e) {}
      renderTheme();
    });
  }

  /* ---------- Audio ---------- */
  let ac = null;
  function unlockAudio() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  }
  function tone(freq, dur, type, vol, delay) {
    if (!cfg.sound || !ac) return;
    try {
      const t = ac.currentTime + (delay || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function bell(times) {
    for (let i = 0; i < times; i++) {
      const d = i * 0.4;
      tone(880, 1.3, 'sine', 0.32, d);
      tone(1760, 0.9, 'sine', 0.12, d);
      tone(2637, 0.5, 'sine', 0.05, d);
    }
  }
  const beep = f => tone(f || 660, 0.13, 'square', 0.1);
  const thud = () => tone(170, 0.08, 'triangle', 0.3);
  const vib = p => { if (cfg.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } };

  /* ---------- Speech ---------- */
  const synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  let voice = null;
  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices();
    voice = vs.find(v => /^en[-_](US|GB)/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  function say(text, rate) {
    if (!synth || cfg.voice === 'off') return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (voice) u.voice = voice;
      u.rate = rate || 1;
      u.pitch = 0.9;
      synth.speak(u);
    } catch (e) {}
  }
  const hush = () => { try { synth && synth.cancel(); } catch (e) {} };
  const speechFor = tokens => tokens.map(t => cfg.voice === 'name' ? MOVES[t].en.toLowerCase() : MOVES[t].say).join(', ');

  /* ---------- Wake lock ---------- */
  let wl = null;
  async function lockScreen() { try { if ('wakeLock' in navigator) wl = await navigator.wakeLock.request('screen'); } catch (e) {} }
  function unlockScreen() { try { if (wl) wl.release(); } catch (e) {} wl = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.active) lockScreen(); });

  /* ---------- Setup UI ---------- */
  function renderSetup() {
    $('#roundsVal').textContent = cfg.rounds;
    $$('.seg').forEach(seg => {
      const key = seg.dataset.key;
      $$('button', seg).forEach(b => {
        const on = String(cfg[key]) === b.dataset.v;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      });
    });
    $$('.switch').forEach(sw => {
      const on = !!cfg[sw.dataset.key];
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', on);
    });
    $('#levelNote').textContent = LEVEL_NOTE[cfg.level];
    $('#modeNote').textContent = MODE_NOTE[cfg.mode];
    $('#levelRow').hidden = cfg.mode === 'free';
    $('#tempoRow').hidden = cfg.mode === 'free';
    const total = cfg.rounds * cfg.len + (cfg.rounds - 1) * cfg.rest
      + (cfg.warm ? WARM.length * PHASE_STEP : 0) + (cfg.cool ? COOL.length * PHASE_STEP : 0);
    $('#summary').textContent = cfg.rounds + ' რაუნდი × ' + fmt(cfg.len) + ', დასვენება ' + cfg.rest + ' წმ. სულ ' + fmt(total) + '.';
  }
  function buildLegend() {
    $('#legend').innerHTML = ['1', '2', '3', '4', '5', '6'].map(k => {
      const m = MOVES[k];
      return '<div class="mv"><b>' + m.chip + '</b><span><strong>' + m.en + '</strong><small>' + m.ka + '</small></span></div>';
    }).join('');
  }
  function bindSetup() {
    $$('.seg').forEach(seg => seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const key = seg.dataset.key;
      cfg[key] = NUMERIC.includes(key) ? Number(b.dataset.v) : b.dataset.v;
      save(); renderSetup();
    }));
    $$('.switch').forEach(sw => sw.addEventListener('click', () => {
      cfg[sw.dataset.key] = !cfg[sw.dataset.key];
      save(); renderSetup();
    }));
    $('#rMinus').addEventListener('click', () => { cfg.rounds = Math.max(1, cfg.rounds - 1); save(); renderSetup(); });
    $('#rPlus').addEventListener('click', () => { cfg.rounds = Math.min(12, cfg.rounds + 1); save(); renderSetup(); });
  }
  function runDemo() {
    const chips = $$('#demo .chip');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { chips.forEach(c => c.classList.add('is-done')); return; }
    chips.forEach((c, i) => setTimeout(() => {
      if (i > 0) chips[i - 1].classList.replace('is-on', 'is-done');
      c.classList.add('is-on');
    }, 600 + i * 480));
    setTimeout(() => chips[chips.length - 1].classList.replace('is-on', 'is-done'), 600 + chips.length * 480);
  }

  /* ---------- Screens ---------- */
  function show(name) {
    $('#setup').hidden = name !== 'setup';
    $('#learn').hidden = name !== 'learn';
    if (name !== 'learn') { stopFigure(); quizStopAll(); }
    $('#train').hidden = name !== 'train';
    $('#finish').hidden = name !== 'finish';
    window.scrollTo(0, 0);
  }

  /* ---------- Training UI ---------- */
  const ICON_PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" fill="currentColor"/></svg>';
  const ICON_PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  function setBanner(en, ka) {
    const e = $('#mEn'), k = $('#mKa');
    e.textContent = en; k.textContent = ka;
    const mv = $('#move');
    mv.classList.remove('pop'); void mv.offsetWidth; mv.classList.add('pop');
  }
  function idleBanner() {
    if (S.phase === 'ready') setBanner('Get ready', 'მოემზადე');
    else if (S.phase === 'rest') setBanner('Rest', 'დასვენება');
    else if (S.phase === 'warm' || S.phase === 'cool') showStep(true);
    else if (run.mode === 'free') setBanner('Free flow', 'თავისუფლად');
    else setBanner('Keep moving', 'იმოძრავე');
  }
  function renderPauseBtn() {
    $('#pauseBtn').innerHTML = (S.paused ? ICON_PLAY : ICON_PAUSE) + '<span>' + (S.paused ? 'გაგრძელება' : 'პაუზა') + '</span>';
    $('#skipBtn').hidden = !(S.phase === 'ready' || S.phase === 'rest' || S.phase === 'warm' || S.phase === 'cool');
  }
  function renderDots() {
    const box = $('#dots'); box.innerHTML = '';
    for (let i = 0; i < run.rounds; i++) {
      const d = document.createElement('i');
      d.className = 'dot' + (i < S.roundsDone ? ' d-done' : (S.phase === 'work' && i === S.round - 1 ? ' d-cur' : ''));
      box.appendChild(d);
    }
  }
  function renderClock(rem) {
    const sec = Math.max(0, Math.ceil(rem / 1000));
    const el = $('#clock');
    el.textContent = S.phase === 'ready' ? String(sec) : fmt(sec);
    el.classList.toggle('urgent', S.phase === 'work' && sec <= 10 && sec > 0);
    const pct = S.total ? Math.min(100, Math.max(0, (1 - rem / S.total) * 100)) : 0;
    $('#barFill').style.width = pct + '%';
  }
  function renderChips(tokens) {
    const box = $('#chips');
    box.style.setProperty('--n', tokens.length);
    box.innerHTML = '';
    tokens.forEach(t => {
      const m = MOVES[t];
      const d = document.createElement('div');
      d.className = 'chip' + (m.def ? ' def' : '') + (m.body ? ' body' : '') + (m.word ? ' word' : '')
        + (m.foot ? ' foot' : '') + (m.threat ? ' threat' : '');
      d.textContent = m.chip;
      box.appendChild(d);
    });
  }
  function activate(i, tokens) {
    const chips = $$('#chips .chip');
    chips.forEach((c, idx) => {
      c.classList.toggle('is-done', idx < i);
      c.classList.toggle('is-on', idx === i);
    });
    const m = MOVES[tokens[i]];
    setBanner(m.en, m.ka);
    if (m.threat) tone(300, 0.18, 'sawtooth', 0.12); else thud();
    vib(VIB[tokens[i]] || [14]);
    if (isPunch(m)) S.punches++;
  }

  /* ---------- Session flow ---------- */
  const remainingMs = () => S.paused ? S.remaining : S.endAt - Date.now();
  const alive = my => my === S.token && S.active && S.phase === 'work' && !S.paused;
  const wait = (ms, my) => new Promise(r => setTimeout(() => r(my === S.token), ms));
  const waitUntil = (at, my) => wait(Math.max(0, at - Date.now()), my);
  const isDrill = () => !!(plan && (plan.kind === 'drill' || plan.kind === 'build'));

  function stopCaller() { S.token++; hush(); }

  /* pace: with "ramp" the first round is a little slower and the last round a little faster */
  function pace() {
    if (!run.ramp || run.rounds < 2) return 1;
    return 0.9 + 0.2 * (S.round - 1) / (run.rounds - 1);
  }
  const bpmNow = () => run.bpm ? Math.round(run.bpm * pace()) : 0;

  /* ---------- Rhythm (steady beat) ---------- */
  const beat = { ms: 0, t0: 0, k: 0, timer: null };
  function clickAt(msAt, accent) {
    if (!run.sound || !ac) return;
    try {
      const t = ac.currentTime + Math.max(0, (msAt - Date.now()) / 1000);
      const o = ac.createOscillator(), g = ac.createGain();
      if (accent) {
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.13);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.start(t); o.stop(t + 0.2);
      } else {
        o.type = 'square';
        o.frequency.setValueAtTime(1500, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.035, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        o.start(t); o.stop(t + 0.06);
      }
      o.connect(g); g.connect(ac.destination);
    } catch (e) {}
  }
  function startBeat(lead) {
    stopBeat();
    const bpm = bpmNow();
    if (!bpm) return;
    beat.ms = 60000 / bpm;
    beat.t0 = Date.now() + (lead || 400);
    beat.k = 0;
    const sched = () => {
      while (beat.t0 + beat.k * beat.ms < Date.now() + 130) {
        clickAt(beat.t0 + beat.k * beat.ms, beat.k % 4 === 0);
        beat.k++;
      }
    };
    sched();
    beat.timer = setInterval(sched, 25);
  }
  function stopBeat() { if (beat.timer) clearInterval(beat.timer); beat.timer = null; beat.ms = 0; }
  // the next beat that is at least minLead ms away
  function nextBeatAt(minLead) {
    const n = Math.max(0, Math.ceil((Date.now() + minLead - beat.t0) / beat.ms));
    return beat.t0 + n * beat.ms;
  }

  /* ---------- Choosing what to call ---------- */
  function weightedPick(pool) {
    const w = pool.map(c => prog.hard[c] ? 4 : 1);
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function poolFor() {
    if (plan && plan.pool) return plan.pool;
    return run.mode === 'counter' ? CPOOLS[run.level] : POOLS[run.level];
  }
  function nextTokens(fin) {
    if (plan && plan.kind === 'drill') return plan.combo.split(' ');
    if (plan && plan.kind === 'build') {
      // grow the combination step by step: 2 moves x4, 3 moves x4, ... until the whole combo
      const all = plan.combo.split(' ');
      const stage = Math.min(all.length, Math.min(2, all.length) + Math.floor(S.combos / 4));
      $('#hint').textContent = 'ეტაპი ' + stage + ' / ' + all.length + ': ' + all.slice(0, stage).map(t => MOVES[t].en).join(' → ');
      return all.slice(0, stage);
    }
    const pool = fin ? FLURRY : poolFor();
    let c; let guard = 0;
    do { c = weightedPick(pool); guard++; } while (c === S.last && guard < 10 && pool.length > 1);
    S.last = c;
    if (!fin && S.seen.indexOf(c) < 0) S.seen.push(c);
    return c.split(' ');
  }

  /* ---------- One combination ---------- */
  async function runCombo(tokens, my, fin) {
    const T = TEMPO[run.tempo];
    const tech = !!(plan && plan.kind === 'drill');
    const pf = pace() * (fin ? 1.45 : 1);
    const bm = (!tech && beat.ms) ? beat.ms : 0;
    let stepMs = tech ? (plan.step || 2200) : (bm ? (fin ? bm / 2 : bm) : T.step / pf);
    renderChips(tokens);
    if (!tech) say(speechFor(tokens), T.rate * Math.min(1.3, pf));
    S.combos++;
    let at = bm ? nextBeatAt(350) : Date.now();
    for (let i = 0; i < tokens.length; i++) {
      if (at > Date.now() && !await waitUntil(at, my)) return false;
      if (!alive(my)) return false;
      activate(i, tokens);
      if (tech) showCue(tokens[i]);
      at += stepMs;
    }
    if (!await waitUntil(at, my)) return false;
    $$('#chips .chip').forEach(c => { c.classList.remove('is-on'); c.classList.add('is-done'); });
    setBanner(tech ? 'Reset' : 'Keep moving', tech ? 'დაბრუნდი სტოიკაში' : 'იმოძრავე');
    return at;
  }
  // technique drill: speak and show the form cue of the move
  function showCue(token) {
    const f = FORM[token];
    if (!f) return;
    $('#hint').textContent = f.ka;
    say(MOVES[token].en + '. ' + f.say, 0.8);
  }

  /* ---------- Free round ---------- */
  async function freeLoop(my) {
    let finDone = false;
    let nextCue = Date.now() + 18000 + Math.random() * 10000;
    let lastCue = -1;
    const f = S.focus;
    if (f) { say('Focus. ' + f.en, 0.95); }
    while (alive(my)) {
      const rem = remainingMs();
      if (rem < 1500) return;
      if (run.finisher && rem <= 10500 && !finDone) {
        finDone = true;
        setBanner('All out!', 'ბოლო ძალით!'); say('All out!', 1.2); vib([120, 60, 120]);
      } else if (!finDone && Date.now() >= nextCue && rem > 14000) {
        let i; do { i = Math.floor(Math.random() * CUES.length); } while (i === lastCue);
        lastCue = i;
        setBanner(CUES[i].en, CUES[i].ka); say(CUES[i].en, 1); vib([40]);
        nextCue = Date.now() + 22000 + Math.random() * 16000;
        setTimeout(() => { if (alive(my) && !finDone) idleBanner(); }, 2400);
      }
      if (!await wait(400, my)) return;
    }
  }

  function startCaller(delay) {
    const my = ++S.token;
    (async () => {
      if (!await wait(delay, my)) return;
      if (run.mode === 'free' && !isDrill()) return freeLoop(my);
      const T = TEMPO[run.tempo];
      const tech = !!(plan && plan.kind === 'drill');
      let finSaid = false;
      while (alive(my)) {
        const rem = remainingMs();
        if (rem < 1500) return;
        const fin = run.finisher && !isDrill() && rem <= 10500;
        if (fin && !finSaid) {
          finSaid = true;
          setBanner('All out!', 'ბოლო ძალით!'); say('All out!', 1.2); vib([120, 60, 120]);
          if (!await wait(900, my)) return;
        }
        const end = await runCombo(nextTokens(fin), my, fin);
        if (!end) return;
        const g = (fin ? 450 : (tech ? 1500 : T.gap)) / pace() * (0.85 + Math.random() * 0.4);
        if (beat.ms && !tech) {
          const beats = Math.max(fin ? 1 : 2, Math.round(g / beat.ms));
          if (!await waitUntil(end + beats * beat.ms - beat.ms, my)) return;
        } else if (!await wait(g, my)) return;
      }
    })();
  }

  /* ---------- Warm-up / cool-down steps ---------- */
  function showStep(redraw) {
    const list = S.phase === 'warm' ? WARM : COOL;
    const idx = Math.min(list.length - 1, Math.max(0, Math.floor((S.total - remainingMs()) / (PHASE_STEP * 1000))));
    if (!redraw && idx === S.step) return;
    const changed = idx !== S.step;
    S.step = idx;
    const it = list[idx];
    setBanner(it.en, it.ka);
    $('#hint').textContent = it.hint + ' (' + (idx + 1) + ' / ' + list.length + ')';
    if (changed) { say(it.say, 0.95); vib([60]); }
  }

  function goPhase(phase, sec) {
    stopCaller();
    stopBeat();
    S.phase = phase;
    S.total = sec * 1000;
    S.endAt = Date.now() + S.total;
    S.lastBeep = -1;
    S.step = -1;
    if (phase === 'work') S.round++;

    $('#train').dataset.phase = phase;
    $('#phaseLabel').textContent = phase === 'ready' ? 'მზადება'
      : phase === 'warm' ? 'გახურება'
      : phase === 'cool' ? 'გაგრილება'
      : phase === 'work' ? 'რაუნდი ' + S.round + ' / ' + run.rounds : 'დასვენება';
    $('#chips').innerHTML = '';
    renderDots(); renderPauseBtn(); renderClock(S.total);
    idleBanner();

    if (phase === 'ready') {
      $('#hint').textContent = plan && plan.ready ? plan.ready : READY_HINT;
      say('Get ready');
    } else if (phase === 'warm' || phase === 'cool') {
      // hint and speech come from showStep()
    } else if (phase === 'rest') {
      $('#hint').textContent = 'შემდეგი: რაუნდი ' + (S.round + 1) + ' / ' + run.rounds + '. ' + rand(TIPS);
      say('Rest');
      vib([120, 80, 120]);
    } else {
      S.focus = run.mode === 'free' ? ((plan && plan.focus) || FOCUS[(S.focusBase + S.round - 1) % FOCUS.length]) : null;
      $('#hint').textContent = S.focus ? 'ფოკუსი: ' + S.focus.ka : (plan && plan.hint ? plan.hint : '');
      bell(1);
      vib(250);
      say(S.round === run.rounds && run.rounds > 1 ? 'Last round. Go!' : 'Round ' + S.round + '. Go!');
      startBeat(700);
      startCaller(S.round === 1 ? 2300 : 2000);
    }
  }

  function nextPhase() {
    if (S.phase === 'ready') return run.warm ? goPhase('warm', WARM.length * PHASE_STEP) : goPhase('work', run.len);
    if (S.phase === 'warm') return goPhase('work', run.len);
    if (S.phase === 'work') {
      S.roundsDone++;
      bell(3);
      if (S.round >= run.rounds) return run.cool ? goPhase('cool', COOL.length * PHASE_STEP) : finish();
      return goPhase('rest', run.rest);
    }
    if (S.phase === 'rest') return goPhase('work', run.len);
    if (S.phase === 'cool') return finish();
  }

  function tick() {
    if (!S.active || S.paused) return;
    const rem = S.endAt - Date.now();
    renderClock(rem);
    if (S.phase === 'warm' || S.phase === 'cool') showStep(false);
    const left = Math.ceil(rem / 1000);
    if (left !== S.lastBeep) {
      S.lastBeep = left;
      if ((S.phase === 'ready' || S.phase === 'rest') && left <= 3 && left > 0) beep(660);
      if (S.phase === 'work' && left === 10) { beep(880); setTimeout(() => beep(880), 170); }
    }
    if (rem <= 0) nextPhase();
  }

  /* ---------- Mirror (front camera) ---------- */
  let mirrorStream = null;
  function stopMirror() {
    try { if (mirrorStream) mirrorStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    mirrorStream = null;
    const v = $('#mirror');
    if (v) { try { v.srcObject = null; } catch (e) {} v.hidden = true; }
    $('#train').classList.remove('has-mirror');
  }
  async function startMirror() {
    stopMirror();
    if (!run.mirror) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { notify('ამ ბრაუზერში კამერა მიუწვდომელია.'); return; }
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 } }, audio: false });
      if (!S.active) { st.getTracks().forEach(t => t.stop()); return; }
      mirrorStream = st;
      const v = $('#mirror');
      v.srcObject = st; v.hidden = false;
      $('#train').classList.add('has-mirror');
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) { notify('კამერაზე წვდომა ვერ მოხერხდა. ვარჯიში სარკის გარეშე გრძელდება.'); }
  }
  let toastTimer = null;
  function notify(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function startSession(p) {
    unlockAudio();
    pickVoice();
    plan = p || null;
    run = plan && plan.cfg ? Object.assign({}, cfg, plan.cfg) : cfg;
    Object.assign(S, {
      active: true, phase: 'idle', round: 0, roundsDone: 0, paused: false, last: '', combos: 0, punches: 0,
      seen: [], focus: null, step: -1, focusBase: Math.floor(Math.random() * FOCUS.length)
    });
    show('train');
    lockScreen();
    startMirror();
    goPhase('ready', 10);
    clearInterval(S.ticker);
    S.ticker = setInterval(tick, 100);
  }

  function pause() {
    if (!S.active || S.paused) return;
    S.remaining = S.endAt - Date.now();
    S.paused = true;
    stopCaller();
    stopBeat();
    setBanner('Paused', 'პაუზა');
    renderPauseBtn();
  }
  function resume() {
    if (!S.active || !S.paused) return;
    S.paused = false;
    S.endAt = Date.now() + S.remaining;
    idleBanner();
    renderPauseBtn();
    if (S.phase === 'work') { startBeat(500); startCaller(900); }
  }

  function endSession() {
    stopCaller();
    stopBeat();
    clearInterval(S.ticker);
    S.active = false;
    unlockScreen();
    stopMirror();
  }
  function finish() {
    endSession();
    S.phase = 'done';
    vib([200, 100, 200, 100, 400]);
    say('Workout complete. Great job!');
    $('#stRounds').textContent = S.roundsDone;
    $('#stTime').textContent = fmt(S.roundsDone * run.len);
    $('#stPunches').textContent = S.punches;
    onFinish();
    show('finish');
  }
  /* ---------- Technique figures: two key poses, animated ---------- */
  // Side view: boxer faces right. Top view: boxer faces right, the lead (left) side is at the top.
  const J = (...a) => a;
  const SIDE = {
    guard:  { H: J(64,30), S: J(60,50), P: J(54,86), KL: J(72,110), FL: J(84,138), KR: J(44,112), FR: J(32,138), EL: J(66,68), HL: J(80,48), ER: J(56,70), HR: J(70,44) },
    jab:    { H: J(68,31), S: J(64,50), P: J(54,86), KL: J(73,110), FL: J(84,138), KR: J(44,112), FR: J(32,138), EL: J(87,48), HL: J(114,46), ER: J(57,70), HR: J(72,44) },
    cross:  { H: J(68,31), S: J(66,50), P: J(57,86), KL: J(74,111), FL: J(84,138), KR: J(49,111), FR: J(33,133), EL: J(68,68), HL: J(80,48), ER: J(90,50), HR: J(116,46) },
    upDip:  { H: J(62,38), S: J(58,58), P: J(52,92), KL: J(72,113), FL: J(84,138), KR: J(42,115), FR: J(32,138), EL: J(64,78), HL: J(78,88), ER: J(56,74), HR: J(70,50) },
    upL:    { H: J(66,31), S: J(62,50), P: J(54,86), KL: J(73,110), FL: J(84,138), KR: J(44,112), FR: J(32,138), EL: J(74,60), HL: J(90,32), ER: J(56,70), HR: J(70,44) },
    upRDip: { H: J(62,38), S: J(58,58), P: J(52,92), KL: J(72,113), FL: J(84,138), KR: J(42,115), FR: J(32,138), EL: J(66,66), HL: J(80,52), ER: J(54,80), HR: J(66,92) },
    upR:    { H: J(67,31), S: J(64,50), P: J(56,86), KL: J(74,111), FL: J(84,138), KR: J(48,111), FR: J(33,133), EL: J(66,68), HL: J(80,48), ER: J(74,60), HR: J(92,32) },
    duck:   { H: J(60,50), S: J(58,68), P: J(52,98), KL: J(74,118), FL: J(86,138), KR: J(42,120), FR: J(30,138), EL: J(66,84), HL: J(78,64), ER: J(56,84), HR: J(68,62) },
    body:   { H: J(66,48), S: J(64,66), P: J(52,100), KL: J(74,118), FL: J(86,138), KR: J(44,120), FR: J(30,134), EL: J(66,76), HL: J(80,58), ER: J(82,78), HR: J(108,86) },
    over:   { H: J(70,40), S: J(66,58), P: J(56,90), KL: J(74,113), FL: J(84,138), KR: J(48,114), FR: J(33,134), EL: J(68,72), HL: J(80,52), ER: J(84,40), HR: J(106,58) },
    overUp: { H: J(62,34), S: J(58,52), P: J(54,88), KL: J(72,111), FL: J(84,138), KR: J(44,113), FR: J(32,138), EL: J(66,68), HL: J(80,48), ER: J(60,34), HR: J(80,26) }
  };
  SIDE.bounce = { H: J(64,26), S: J(60,46), P: J(54,82), KL: J(72,108), FL: J(84,138), KR: J(44,110), FR: J(32,138), EL: J(66,64), HL: J(80,44), ER: J(56,66), HR: J(70,40) };
  const shiftPose = (p, dx, dy) => { const o = {}; for (const k in p) o[k] = J(p[k][0] + dx, p[k][1] + dy); return o; };
  SIDE.back = shiftPose(SIDE.guard, -14, 0);
  SIDE.back.FL = J(70,138); SIDE.back.KL = J(60,110); SIDE.back.FR = J(20,138); SIDE.back.KR = J(32,112);

  const TOP = {
    guard: { H: J(66,74), SL: J(74,62), SR: J(52,86), PL: J(66,68), PR: J(50,88), FL: J(92,66), FR: J(34,92), EL: J(80,58), HL: J(86,66), ER: J(60,86), HR: J(76,76), al: 12, ar: 45 },
    jab:   { H: J(68,74), SL: J(78,62), SR: J(54,84), PL: J(66,68), PR: J(50,88), FL: J(92,66), FR: J(34,92), EL: J(98,62), HL: J(120,64), ER: J(60,86), HR: J(76,76), al: 12, ar: 45 },
    cross: { H: J(70,74), SL: J(70,66), SR: J(60,82), PL: J(64,70), PR: J(56,86), FL: J(92,66), FR: J(34,90), EL: J(80,58), HL: J(86,66), ER: J(84,80), HR: J(116,70), al: 12, ar: 20 },
    hookL: { H: J(70,76), SL: J(79,70), SR: J(47,78), PL: J(70,72), PR: J(46,84), FL: J(92,66), FR: J(34,92), EL: J(95,56), HL: J(110,68), ER: J(54,84), HR: J(66,80), al: 40, ar: 45 },
    hookR: { H: J(64,72), SL: J(65,58), SR: J(61,90), PL: J(58,64), PR: J(58,92), FL: J(92,66), FR: J(34,92), EL: J(80,58), HL: J(86,66), ER: J(78,102), HR: J(102,86), al: 12, ar: 70 }
  };
  const rotPose = (p, cx, cy, deg) => {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), o = {};
    for (const k in p) {
      if (k === 'al' || k === 'ar') { o[k] = p[k] + deg; continue; }
      const x = p[k][0] - cx, y = p[k][1] - cy;
      o[k] = J(cx + x * c - y * s, cy + x * s + y * c);
    }
    return o;
  };

  const ARROW = (x1, y1, x2, y2, col) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
    const p1 = [x2 - h * Math.cos(a - .45), y2 - h * Math.sin(a - .45)], p2 = [x2 - h * Math.cos(a + .45), y2 - h * Math.sin(a + .45)];
    return '<g stroke="' + col + '" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 4"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/></g>'
      + '<polygon points="' + x2 + ',' + y2 + ' ' + p1.join(',') + ' ' + p2.join(',') + '" fill="' + col + '"/>';
  };
  const ARROWHEAD = (x, y, dx, dy, col) => {
    const a = Math.atan2(dy, dx), h = 7;
    return '<polygon points="' + x + ',' + y + ' ' + (x - h * Math.cos(a - .45)) + ',' + (y - h * Math.sin(a - .45)) + ' ' + (x - h * Math.cos(a + .45)) + ',' + (y - h * Math.sin(a + .45)) + '" fill="' + col + '"/>';
  };
  const OPPC = '<g fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="3 4"><circle cx="131" cy="68" r="9"/></g>';
  const OPP = '<g fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="3 4"><circle cx="131" cy="68" r="9"/></g>'
    + '<text x="136" y="90" text-anchor="end" font-size="6.5" fill="var(--muted)" font-family="var(--font-ui)">მოწინააღმდეგე</text>';

  function lerpPose(a, b, t) {
    const o = {};
    for (const k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * t : J(a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t);
    return o;
  }
  const pt = v => v[0].toFixed(1) + ',' + v[1].toFixed(1);
  function sideSVG(p, ghost) {
    const lead = ghost ? 'var(--muted)' : 'var(--red)', rear = ghost ? 'var(--muted)' : 'var(--blue)', ink = ghost ? 'var(--muted)' : 'var(--ink)';
    const foot = (f, col) => '<polyline points="' + (f[0] - 4).toFixed(1) + ',' + f[1].toFixed(1) + ' ' + (f[0] + 8).toFixed(1) + ',138" stroke="' + col + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    const limb = (a, b, c, col, w) => '<polyline points="' + pt(a) + ' ' + pt(b) + ' ' + pt(c) + '" stroke="' + col + '" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<g' + (ghost ? ' opacity=".28"' : '') + '>'
      + limb(p.P, p.KR, p.FR, ink, 6) + foot(p.FR, ink)
      + limb(p.S, p.ER, p.HR, rear, 5) + '<circle cx="' + p.HR[0].toFixed(1) + '" cy="' + p.HR[1].toFixed(1) + '" r="6" fill="' + rear + '"/>'
      + '<line x1="' + pt(p.S).replace(',', '" y1="') + '" x2="' + pt(p.P).replace(',', '" y2="') + '" stroke="' + ink + '" stroke-width="8" stroke-linecap="round"/>'
      + '<circle cx="' + p.H[0].toFixed(1) + '" cy="' + p.H[1].toFixed(1) + '" r="9.5" fill="var(--panel)" stroke="' + ink + '" stroke-width="3.5"/>'
      + limb(p.P, p.KL, p.FL, ink, 6) + foot(p.FL, ink)
      + limb(p.S, p.EL, p.HL, lead, 5.5) + '<circle cx="' + p.HL[0].toFixed(1) + '" cy="' + p.HL[1].toFixed(1) + '" r="6.8" fill="' + lead + '"/>'
      + '</g>';
  }
  function topSVG(p, ghost, lite) {
    const lead = ghost ? 'var(--muted)' : 'var(--red)', rear = ghost ? 'var(--muted)' : 'var(--blue)', ink = ghost ? 'var(--muted)' : 'var(--ink)';
    const ln = (a, b, col, w) => '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    const foot = (f, a) => '<ellipse cx="' + f[0].toFixed(1) + '" cy="' + f[1].toFixed(1) + '" rx="10" ry="4.6" fill="' + ink + '" transform="rotate(' + a.toFixed(1) + ' ' + f[0].toFixed(1) + ' ' + f[1].toFixed(1) + ')"/>';
    const mid = (a, b) => J((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    return '<g' + (ghost ? ' opacity=".28"' : '') + '>'
      + (lite ? '' : foot(p.FR, p.ar) + foot(p.FL, p.al) + ln(p.PL, p.PR, ink, 7) + ln(mid(p.PL, p.PR), mid(p.SL, p.SR), ink, 5))
      + ln(p.SR, p.ER, rear, 4.5) + ln(p.ER, p.HR, rear, 4.5) + '<circle cx="' + p.HR[0].toFixed(1) + '" cy="' + p.HR[1].toFixed(1) + '" r="6" fill="' + rear + '"/>'
      + ln(p.SL, p.SR, ink, lite ? 10 : 8)
      + '<circle cx="' + p.H[0].toFixed(1) + '" cy="' + p.H[1].toFixed(1) + '" r="9" fill="var(--panel)" stroke="' + ink + '" stroke-width="3.5"/>'
      + ln(p.SL, p.EL, lead, 4.8) + ln(p.EL, p.HL, lead, 4.8) + '<circle cx="' + p.HL[0].toFixed(1) + '" cy="' + p.HL[1].toFixed(1) + '" r="6.8" fill="' + lead + '"/>'
      + '</g>';
  }

  // card figure definitions: { view, a, b, extra }
  const FOOT_SVG = (() => {
    const t = (x, y, txt, anc) => '<text x="' + x + '" y="' + y + '" text-anchor="' + (anc || 'middle') + '" font-size="6.8" fill="var(--muted)" font-family="var(--font-ui)" font-weight="700">' + txt + '</text>';
    const foot = (x, y, a, col) => '<ellipse cx="' + x + '" cy="' + y + '" rx="13" ry="5.6" fill="' + col + '" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>';
    return '<svg viewBox="0 0 140 110" class="fig-svg" role="img" aria-label="ფეხების განლაგება">'
      + '<line x1="96" y1="34" x2="96" y2="74" stroke="var(--line)" stroke-width="1.6" stroke-dasharray="3 3"/>'
      + '<line x1="44" y1="74" x2="96" y2="74" stroke="var(--line)" stroke-width="1.6" stroke-dasharray="3 3"/>'
      + foot(96, 28, 10, 'var(--red)') + foot(44, 74, 45, 'var(--blue)')
      + '<path d="M62 74 A18 18 0 0 1 56.7 86.7" fill="none" stroke="var(--tape)" stroke-width="2.2"/>'
      + t(68, 90, '≈45°', 'start')
      + t(96, 12, 'წინა ფეხი') + t(10, 62, 'უკანა ფეხი', 'start')
      + t(101, 56, 'მხრების', 'start') + t(101, 64, 'სიგანე', 'start')
      + ARROW(70, 103, 132, 103, 'var(--muted)') + t(134, 97, 'მოწინააღმდეგისკენ', 'end')
      + '</svg>';
  })();

  const TOPBOX = '8 28 132 112', SIDEBOX = '0 0 140 150';
  const FIGS = {
    stance: { view: 'side', a: 'guard', b: 'bounce' },
    stanceFeet: { view: 'custom', svg: FOOT_SVG },
    jab:    { view: 'side', a: 'guard', b: 'jab' },
    cross:  { view: 'side', a: 'guard', b: 'cross' },
    lhook:  { view: 'top', lite: true, a: 'guard', b: 'hookL', extra: OPPC },
    rhook:  { view: 'top', lite: true, a: 'guard', b: 'hookR', extra: OPPC },
    lupper: { view: 'side', a: 'upDip', b: 'upL' },
    rupper: { view: 'side', a: 'upRDip', b: 'upR' },
    body:   { view: 'side', a: 'guard', b: 'body' },
    over:   { view: 'side', a: 'overUp', b: 'over' },
    duck:   { view: 'side', a: 'guard', b: 'duck', extra: ARROW(132, 40, 82, 40, 'var(--red)') },
    back:   { view: 'side', a: 'guard', b: 'back' }
  };

  let figLoops = [];
  function stopFigure() { figLoops.forEach(h => { if (h.id) cancelAnimationFrame(h.id); }); figLoops = []; }
  function mountFigure(el, key) {
    const f = FIGS[key];
    if (!f || !el) { if (el) el.innerHTML = ''; return; }
    if (f.svg) { el.innerHTML = f.svg; return; }
    const set = f.view === 'top' ? TOP : SIDE, draw = f.view === 'top' ? topSVG : sideSVG;
    const A = set[f.a], B = set[f.b];
    const frame = p => '<svg viewBox="' + (f.view === 'top' ? TOPBOX : SIDEBOX) + '" class="fig-svg" role="img" aria-label="დარტყმის სქემა">'
      + (f.view === 'side' ? '<line x1="6" y1="139" x2="134" y2="139" stroke="var(--line)" stroke-width="2"/>' : '')
      + (f.extra || '') + draw(A, true, f.lite) + draw(p, false, f.lite) + '</svg>';
    if (f.a === f.b || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.innerHTML = frame(B); return; }
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const CYCLE = 3200, t0 = performance.now(), h = { id: 0 };
    figLoops.push(h);
    const step = now => {
      const u = ((now - t0) % CYCLE) / 1000; // seconds inside the cycle
      let k;
      if (u < 0.3) k = 0;
      else if (u < 0.75) k = ease((u - 0.3) / 0.45);
      else if (u < 1.6) k = 1;
      else if (u < 2.25) k = 1 - ease((u - 1.6) / 0.65);
      else k = 0;
      el.innerHTML = frame(lerpPose(A, B, k));
      h.id = requestAnimationFrame(step);
    };
    h.id = requestAnimationFrame(step);
  }


  /* ---------- Learn screen ---------- */
  const L = { tab: 'cards', card: null, lesson: null, from: null };
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const validCombo = c => typeof c === 'string' && c.trim() && c.split(' ').every(t => MOVES[t]);

  function chipHTML(token, cw) {
    const m = MOVES[token];
    const cls = 'chip' + (m.def ? ' def' : '') + (m.body ? ' body' : '') + (m.word ? ' word' : '') + (m.foot ? ' foot' : '') + (m.threat ? ' threat' : '');
    return '<span class="' + cls + '" style="--cw:' + (cw || 34) + 'px">' + esc(m.chip) + '</span>';
  }
  const comboChips = (combo, cw) => '<span class="crow">' + combo.split(' ').map(t => chipHTML(t, cw)).join('') + '</span>';
  const cardChip = c => {
    const m = c.tokens && MOVES[c.tokens[0]];
    const isBody = c.id === 'body';
    const small = c.chip.length > 2;
    return '<b class="cchip' + (small ? ' sm' : '') + (isBody ? ' body' : '') + '">' + esc(c.chip) + '</b>';
  };

  function openLearn(ret) {
    ret = ret || {};
    L.tab = ret.tab || L.tab || 'cards';
    L.card = ret.card || null;
    L.lesson = typeof ret.lesson === 'number' ? ret.lesson : null;
    L.from = ret.from || null;
    show('learn');
    renderLearn();
  }
  function quizStopAll() { if (QZ.timer) clearInterval(QZ.timer); QZ.timer = null; if (QZ.state === 'run') QZ.state = 'idle'; }

  function renderLearn() {
    stopFigure();
    if (L.tab !== 'quiz') quizStopAll();
    $$('#lTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === L.tab));
    const body = $('#lBody');
    body.innerHTML = L.tab === 'cards' ? (L.card ? cardDetail(L.card) : cardsList())
      : L.tab === 'course' ? (L.lesson !== null ? lessonDetail(L.lesson) : courseList())
      : L.tab === 'quiz' ? quizHTML()
      : mineHTML();
    $$('.fig', body).forEach(el => mountFigure(el, el.dataset.fig));
    window.scrollTo(0, 0);
    const sc = $('#learn'); if (sc) sc.scrollTop = 0;
  }

  /* --- cards --- */
  function cardsList() {
    let h = '<p class="lead-s">ყოველი დარტყმისა და მოძრაობის მოკლე ინსტრუქცია, სქემა და ტიპური შეცდომა. ინსტრუქციები მარჯვენა დგომისთვისაა (წინ მარცხენა ფეხი და ხელი).</p>';
    GROUPS.forEach(g => {
      h += '<h3 class="grp">' + g.title + '</h3><div class="lgrid">';
      CARDS.filter(c => c.group === g.id).forEach(c => {
        h += '<button class="lc" data-act="card" data-id="' + c.id + '">' + cardChip(c) + '<span><strong>' + esc(c.en) + '</strong><small>' + esc(c.ka) + '</small></span></button>';
      });
      h += '</div>';
    });
    h += '<h3 class="grp">ტერმინები</h3><div class="panel gloss">';
    GLOSSARY.forEach(t => { h += '<div class="gl"><b>' + esc(t[0]) + '</b><span><strong>' + esc(t[1]) + '</strong> ' + esc(t[2]) + '</span></div>'; });
    return h + '</div>';
  }
  function cardDetail(id) {
    const c = CARD_BY_ID[id]; if (!c) return cardsList();
    const i = CARDS.indexOf(c), prev = CARDS[i - 1], next = CARDS[i + 1];
    let h = '<button class="back-t" data-act="cardsBack">← ' + (L.from && L.from.tab === 'course' ? 'გაკვეთილზე დაბრუნება' : 'ყველა ბარათი') + '</button>';
    h += '<div class="c-head">' + cardChip(c) + '<div><h2>' + esc(c.en) + '</h2><p>' + esc(c.ka) + '</p></div></div>';
    if (c.figs.length) {
      h += '<div class="panel figs' + (c.figs.length > 1 ? ' two' : '') + '">' + c.figs.map(f => '<div class="fig" data-fig="' + f + '"></div>').join('') + '</div>';
      h += '<p class="fig-note"><i class="k red"></i>წინა ხელი და ფეხი <i class="k blue"></i>უკანა ხელი და ფეხი. ბაცი ფიგურა საწყისი პოზიციაა.</p>';
    }
    h += '<h3 class="grp">როგორ შეასრულო</h3><ol class="steps">' + c.steps.map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>';
    h += '<div class="panel mist"><b>ტიპური შეცდომა</b><p>' + esc(c.mistake) + '</p></div>';
    if (c.note) h += '<p class="fig-note">' + esc(c.note) + '</p>';
    h += '<button class="go small" data-act="drillCard" data-id="' + c.id + '">ივარჯიშე ნელა (2 რაუნდი)</button>';
    h += '<div class="pn">' + (prev ? '<button class="btn" data-act="card" data-id="' + prev.id + '">← ' + esc(prev.en) + '</button>' : '<span></span>')
      + (next ? '<button class="btn" data-act="card" data-id="' + next.id + '">' + esc(next.en) + ' →</button>' : '<span></span>') + '</div>';
    return h;
  }
  function planFromCard(c) {
    const combo = c.tokens.join(' ');
    return {
      kind: 'drill', combo, step: c.tokens.length > 1 ? 2400 : 2200, from: 'learn', title: c.ka,
      ret: { tab: 'cards', card: c.id, from: L.from },
      cfg: lessonCfg({ rounds: 2, len: 60, rest: 20, mode: 'combo' }),
      ready: 'ნელი ვარჯიში: ' + c.ka + '. ტრენერი თითო მოძრაობას ეტყვის და ფორმის რჩევას დაამატებს.'
    };
  }

  /* --- course --- */
  const lessonState = i => i < prog.course ? 'done' : (i === prog.course ? 'next' : 'locked');
  function courseList() {
    let h = '<p class="lead-s">12 გაკვეთილი 4 კვირაზე. ყოველი გაკვეთილი 3 რაუნდამდეა. შემდეგი გაკვეთილი იხსნება წინას დასრულების შემდეგ.</p>';
    h += '<div class="prog-bar"><i style="width:' + Math.round(100 * Math.min(prog.course, LESSONS.length) / LESSONS.length) + '%"></i></div><p class="fig-note">დასრულებულია ' + Math.min(prog.course, LESSONS.length) + ' / ' + LESSONS.length + '</p>';
    let week = 0;
    LESSONS.forEach((l, i) => {
      if (l.week !== week) { week = l.week; h += '<h3 class="grp">' + WEEK_TITLES[week] + '</h3>'; }
      const st = lessonState(i);
      const tag = st === 'done' ? 'დასრულებულია' : st === 'next' ? 'შემდეგი' : 'დაკეტილია';
      h += '<button class="lesson ' + st + '" data-act="lesson" data-i="' + i + '"><b>' + (i + 1) + '</b><span><strong>' + esc(l.title) + '</strong><small>' + esc(l.goal) + '</small></span><em>' + tag + '</em></button>';
    });
    if (prog.course > 0) h += '<button class="link-b" data-act="resetCourse">პროგრესის განულება</button>';
    return h;
  }
  function planSummary(p) {
    const c = p.cfg;
    const kind = p.kind === 'drill' ? 'ტექნიკის ვარჯიში: ტრენერი ყოველ მოძრაობას ნელა ამბობს და ფორმის რჩევას უმატებს.'
      : p.kind === 'build' ? 'სერია ეტაპობრივად იზრდება: ჯერ პირველი 2 დარტყმა, მერე უფრო გრძელი, სანამ მთლიანი კომბინაცია არ გამოვა.'
      : p.kind === 'counter' ? 'დაცვა და კონტრა: ტრენერი თავდასხმას გეძახის, შენ იცავ თავს და პასუხობ.'
      : p.kind === 'free' ? 'თავისუფალი რაუნდი: კომბინაციებს არავინ გეძახის, მხოლოდ რიტმი, ფოკუსი და მოკლე რჩევები.'
      : 'ვარჯიში კონკრეტული კომბინაციებით.';
    return kind + ' ' + c.rounds + ' რაუნდი × ' + fmt(c.len) + ', დასვენება ' + c.rest + ' წმ.';
  }
  function lessonDetail(i) {
    const l = LESSONS[i]; if (!l) return courseList();
    const st = lessonState(i);
    let h = '<button class="back-t" data-act="courseBack">← კურსი</button>';
    h += '<div class="c-head"><b class="cchip">' + (i + 1) + '</b><div><h2>' + esc(l.title) + '</h2><p>' + WEEK_TITLES[l.week] + '</p></div></div>';
    h += '<div class="panel mist"><b>მიზანი</b><p>' + esc(l.goal) + '</p></div>';
    h += '<h3 class="grp">ჯერ წაიკითხე</h3><div class="lgrid">';
    l.cards.forEach(id => { const c = CARD_BY_ID[id]; h += '<button class="lc" data-act="cardFromLesson" data-id="' + id + '" data-i="' + i + '">' + cardChip(c) + '<span><strong>' + esc(c.en) + '</strong><small>' + esc(c.ka) + '</small></span></button>'; });
    h += '</div><h3 class="grp">ვარჯიში</h3><p class="lead-s">' + esc(planSummary(l.plan)) + '</p>';
    if (st === 'locked') h += '<p class="fig-note">ეს გაკვეთილი ჯერ დაკეტილია. ჯერ წინა გაკვეთილი დაასრულე, ან გაიარე ის ბარათებიდან.</p>';
    h += '<button class="go small" data-act="startLesson" data-i="' + i + '"' + (st === 'locked' ? ' disabled' : '') + '>' + (st === 'done' ? 'გაიმეორე გაკვეთილი' : 'დაიწყე გაკვეთილი') + '</button>';
    return h;
  }

  /* --- quiz: numbers of the punches, 30 seconds --- */
  const QZ = { state: 'idle', score: 0, total: 0, end: 0, timer: null, q: null, locked: false, last: 0 };
  const QPUNCH = ['1', '2', '3', '4', '5', '6'];
  function quizNext() {
    const t = rand(QPUNCH);
    const dir = Math.random() < 0.5 ? 'n2d' : 'd2n';
    const opts = dir === 'n2d' ? QPUNCH.slice() : shuffle([t].concat(shuffle(QPUNCH.filter(x => x !== t)).slice(0, 3)));
    QZ.q = { t, dir, opts };
  }
  function quizHTML() {
    if (QZ.state === 'run' && QZ.q) {
      const q = QZ.q, m = MOVES[q.t];
      const left = Math.max(0, Math.ceil((QZ.end - Date.now()) / 1000));
      let h = '<div class="q-top"><span>ქულა <b id="qScore">' + QZ.score + '</b></span><span><b id="qTime">' + left + '</b> წმ</span></div>';
      if (q.dir === 'n2d') {
        h += '<div class="panel q-card"><small>რომელი ნომერია?</small><div class="q-big">' + esc(m.en) + '</div><div class="q-sub">' + esc(m.ka) + '</div></div>';
        h += '<div class="q-opts n">' + q.opts.map(o => '<button data-act="ans" data-v="' + o + '">' + o + '</button>').join('') + '</div>';
      } else {
        h += '<div class="panel q-card"><small>რა ჰქვია?</small><div class="q-num">' + m.chip + '</div></div>';
        h += '<div class="q-opts t">' + q.opts.map(o => '<button data-act="ans" data-v="' + o + '"><strong>' + esc(MOVES[o].en) + '</strong><small>' + esc(MOVES[o].ka) + '</small></button>').join('') + '</div>';
      }
      return h;
    }
    let h = '<p class="lead-s">30 წამი: რამდენ ნომერს ამოიცნობ? ნომრები ბოქსის ენაა: როცა ყოველ ნომერზე აღარ ფიქრობ, კომბინაციები თავისით გამოგივა.</p>';
    if (QZ.state === 'done') h += '<div class="panel q-res"><b>' + QZ.score + '</b><span>სწორი პასუხი ' + QZ.total + ' კითხვიდან</span><small>რეკორდი: ' + prog.quizBest + '</small></div>';
    else if (prog.quizBest) h += '<p class="fig-note">რეკორდი: ' + prog.quizBest + '</p>';
    h += '<div class="panel"><div class="moves legend-q">' + QPUNCH.map(k => { const m = MOVES[k]; return '<div class="mv"><b>' + m.chip + '</b><span><strong>' + m.en + '</strong><small>' + m.ka + '</small></span></div>'; }).join('') + '</div></div>';
    h += '<button class="go small" data-act="quizStart">' + (QZ.state === 'done' ? 'კიდევ ერთხელ' : 'დაწყება') + '</button>';
    return h;
  }
  function quizStart() {
    quizStopAll();
    Object.assign(QZ, { state: 'run', score: 0, total: 0, end: Date.now() + 30000, locked: false });
    quizNext();
    QZ.timer = setInterval(() => {
      const left = Math.ceil((QZ.end - Date.now()) / 1000);
      if (left <= 0) return quizEnd();
      const el = $('#qTime'); if (el) el.textContent = left;
    }, 250);
    renderLearn();
  }
  function quizEnd() {
    if (QZ.timer) clearInterval(QZ.timer); QZ.timer = null;
    QZ.state = 'done';
    if (QZ.score > prog.quizBest) { prog.quizBest = QZ.score; saveProg(); }
    if (L.tab === 'quiz') renderLearn();
  }
  function quizAnswer(btn) {
    if (QZ.state !== 'run' || QZ.locked) return;
    QZ.locked = true; QZ.total++;
    const ok = btn.dataset.v === QZ.q.t;
    if (ok) QZ.score++;
    btn.classList.add(ok ? 'ok' : 'bad');
    if (!ok) $$('#lBody .q-opts button').forEach(b => { if (b.dataset.v === QZ.q.t) b.classList.add('ok'); });
    vib(ok ? 12 : [60, 40, 60]);
    const s = $('#qScore'); if (s) s.textContent = QZ.score;
    setTimeout(() => {
      QZ.locked = false;
      if (QZ.state !== 'run' || L.tab !== 'quiz') return;
      quizNext(); renderLearn();
    }, ok ? 280 : 900);
  }

  /* --- my combinations --- */
  const PALETTE = ['1', '2', '3', '4', '5', '6', '1b', '2b', '3b', 'oh', 'sl', 'du', 'bk', 'pv', 'pa', 'bl', 'ro', 'fe', 'cl', 'cr', 'ag'];
  let compose = [];
  function mineHTML() {
    const saved = prog.custom.filter(validCombo);
    let h = '<p class="lead-s">ააწყვე საკუთარი კომბინაცია: დააჭირე მოძრაობებს თანმიმდევრობით (მაქსიმუმ 8). ეტაპობრივად ისწავლე, ან ჩართე ვარჯიშში.</p>';
    h += '<div class="panel compose"><div class="cmp-row" aria-live="polite">' + (compose.length ? compose.map(t => chipHTML(t, 44)).join('') : '<span class="empty">აირჩიე მოძრაობები</span>') + '</div>';
    h += '<div class="pal">' + PALETTE.map(t => '<button data-act="add" data-t="' + t + '" aria-label="' + esc(MOVES[t].en) + '">' + chipHTML(t, 40) + '</button>').join('') + '</div>';
    h += '<div class="cmp-act"><button class="btn" data-act="undo"' + (compose.length ? '' : ' disabled') + '>ბოლოს წაშლა</button><button class="btn" data-act="clear"' + (compose.length ? '' : ' disabled') + '>გასუფთავება</button><button class="btn red" data-act="saveCombo"' + (compose.length >= 2 ? '' : ' disabled') + '>შენახვა</button></div></div>';
    h += '<h3 class="grp">ჩემი კომბინაციები</h3>';
    if (!saved.length) h += '<p class="fig-note">ჯერ არაფერი გაქვს შენახული.</p>';
    saved.forEach((c, i) => {
      const hard = !!prog.hard[c];
      h += '<div class="panel saved"><div class="s-chips">' + comboChips(c, 30) + '</div><div class="s-act">'
        + '<button class="btn" data-act="buildCombo" data-c="' + esc(c) + '">ეტაპობრივად</button>'
        + '<button class="btn" data-act="slowCombo" data-c="' + esc(c) + '">ნელა</button>'
        + '<button class="btn' + (hard ? ' on' : '') + '" data-act="hardCombo" data-c="' + esc(c) + '" aria-pressed="' + hard + '">რთულია</button>'
        + '<button class="btn" data-act="delCombo" data-i="' + i + '" aria-label="წაშლა">წაშლა</button></div></div>';
    });
    if (saved.length) h += '<button class="go small" data-act="trainMine">ვარჯიში ჩემი კომბინაციებით</button><p class="fig-note">რთულად მონიშნული კომბინაციები უფრო ხშირად გეძახება.</p>';
    const hardList = Object.keys(prog.hard).filter(c => prog.hard[c] && validCombo(c) && saved.indexOf(c) < 0);
    if (hardList.length) {
      h += '<h3 class="grp">რთულად მონიშნული ვარჯიშიდან</h3>';
      hardList.forEach(c => { h += '<div class="panel saved"><div class="s-chips">' + comboChips(c, 30) + '</div><div class="s-act"><button class="btn" data-act="buildCombo" data-c="' + esc(c) + '">ეტაპობრივად</button><button class="btn" data-act="hardCombo" data-c="' + esc(c) + '">მოხსნა</button></div></div>'; });
    }
    return h;
  }
  function planFromCombo(c, kind) {
    return {
      kind, combo: c, step: 2400, from: 'learn', title: 'ჩემი კომბინაცია', ret: { tab: 'mine' },
      cfg: lessonCfg({ rounds: 3, len: 90, rest: 20, mode: 'combo', tempo: 'slow' }),
      ready: kind === 'build' ? 'კომბინაცია ეტაპობრივად იზრდება, ჯერ პირველი 2 მოძრაობა.' : 'ნელი ტექნიკის ვარჯიში.'
    };
  }

  /* --- clicks inside the learn screen --- */
  function onLearnClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act, d = b.dataset;
    if (act === 'card') { L.card = d.id; renderLearn(); }
    else if (act === 'cardsBack') {
      L.card = null;
      if (L.from && L.from.tab === 'course') { L.tab = 'course'; L.lesson = L.from.lesson; L.from = null; }
      renderLearn();
    }
    else if (act === 'drillCard') { startSession(planFromCard(CARD_BY_ID[d.id])); }
    else if (act === 'lesson') { L.lesson = Number(d.i); renderLearn(); }
    else if (act === 'courseBack') { L.lesson = null; renderLearn(); }
    else if (act === 'cardFromLesson') { L.from = { tab: 'course', lesson: Number(d.i) }; L.tab = 'cards'; L.card = d.id; L.lesson = null; renderLearn(); }
    else if (act === 'startLesson') { startSession(planOf(Number(d.i))); }
    else if (act === 'resetCourse') { if (confirm('გავანულო კურსის პროგრესი?')) { prog.course = 0; saveProg(); renderLearn(); } }
    else if (act === 'quizStart') quizStart();
    else if (act === 'ans') quizAnswer(b);
    else if (act === 'add') { if (compose.length < 8) { compose.push(d.t); renderLearn(); } }
    else if (act === 'undo') { compose.pop(); renderLearn(); }
    else if (act === 'clear') { compose = []; renderLearn(); }
    else if (act === 'saveCombo') {
      const c = compose.join(' ');
      if (prog.custom.indexOf(c) < 0 && prog.custom.length < 30) { prog.custom.push(c); saveProg(); compose = []; }
      else notifyLearn(prog.custom.indexOf(c) >= 0 ? 'ეს კომბინაცია უკვე შენახულია.' : 'შენახვის ლიმიტი გავიდა (30).');
      renderLearn();
    }
    else if (act === 'delCombo') { prog.custom.splice(Number(d.i), 1); saveProg(); renderLearn(); }
    else if (act === 'hardCombo') { if (prog.hard[d.c]) delete prog.hard[d.c]; else prog.hard[d.c] = true; saveProg(); renderLearn(); }
    else if (act === 'buildCombo') startSession(planFromCombo(d.c, 'build'));
    else if (act === 'slowCombo') startSession(planFromCombo(d.c, 'drill'));
    else if (act === 'trainMine') {
      const pool = prog.custom.filter(validCombo);
      if (pool.length) startSession({ kind: 'pool', pool, from: 'learn', title: 'ჩემი კომბინაციები', ret: { tab: 'mine' }, cfg: { mode: 'combo' } });
    }
  }
  function notifyLearn(msg) { const t = $('#lToast'); t.textContent = msg; t.hidden = false; setTimeout(() => { t.hidden = true; }, 2600); }

  /* --- end of a session: lesson progress and "which combo was hard?" --- */
  function onFinish() {
    const box = $('#finExtra');
    let h = '';
    if (plan && typeof plan.lesson === 'number') {
      if (plan.lesson >= prog.course) { prog.course = plan.lesson + 1; saveProg(); }
      const next = plan.lesson + 1;
      h += '<div class="panel fin-box"><h3>გაკვეთილი დასრულდა</h3><p>' + esc(LESSONS[plan.lesson].title)
        + (next < LESSONS.length ? '. შემდეგი: ' + esc(LESSONS[next].title) + '.' : '. კურსი დასრულებულია, გილოცავ!') + '</p>'
        + (next < LESSONS.length ? '<button class="btn" data-fin="next">შემდეგი გაკვეთილი</button>' : '') + '</div>';
    }
    if (!isDrill() && run.mode !== 'free' && S.seen.length) {
      h += '<div class="panel fin-box"><h3>რომელი იყო რთული?</h3><p>მონიშნე და მომავალში უფრო ხშირად გეძახება.</p><div class="hard-pick">'
        + S.seen.slice(0, 10).map(c => '<button class="hp' + (prog.hard[c] ? ' on' : '') + '" data-hard="' + esc(c) + '" aria-pressed="' + !!prog.hard[c] + '">' + comboChips(c, 26) + '</button>').join('') + '</div></div>';
    }
    box.innerHTML = h;
    $('#homeBtn').textContent = plan && plan.from === 'learn' ? 'სწავლაში დაბრუნება' : 'პარამეტრებში დაბრუნება';
  }
  function onFinExtra(e) {
    const hb = e.target.closest('[data-hard]');
    if (hb) {
      const c = hb.dataset.hard;
      if (prog.hard[c]) delete prog.hard[c]; else prog.hard[c] = true;
      saveProg();
      hb.classList.toggle('on', !!prog.hard[c]); hb.setAttribute('aria-pressed', !!prog.hard[c]);
      return;
    }
    if (e.target.closest('[data-fin="next"]') && plan && typeof plan.lesson === 'number') startSession(planOf(plan.lesson + 1));
  }

  function leaveSession() {
    const ret = plan && plan.from === 'learn' ? (plan.ret || { tab: 'course', lesson: typeof plan.lesson === 'number' ? plan.lesson : null }) : null;
    plan = null;
    if (ret) openLearn(ret); else show('setup');
  }

  function bindLearn() {
    $('#mainTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.go === 'learn') openLearn(); });
    $('#lTabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      L.tab = b.dataset.tab; L.card = null; L.lesson = null; L.from = null; renderLearn();
    });
    $('#lBack').addEventListener('click', () => { quizStopAll(); stopFigure(); show('setup'); });
    $('#lBody').addEventListener('click', onLearnClick);
    $('#finExtra').addEventListener('click', onFinExtra);
  }


  function bindTraining() {
    $('#startBtn').addEventListener('click', () => startSession(null));
    $('#pauseBtn').addEventListener('click', () => S.paused ? resume() : pause());
    $('#skipBtn').addEventListener('click', () => {
      if (S.paused) { S.paused = false; }
      nextPhase();
    });
    $('#stopBtn').addEventListener('click', () => { pause(); $('#modal').hidden = false; });
    $('#mContinue').addEventListener('click', () => { $('#modal').hidden = true; resume(); });
    $('#mQuit').addEventListener('click', () => { $('#modal').hidden = true; endSession(); leaveSession(); });
    $('#againBtn').addEventListener('click', () => startSession(plan));
    $('#homeBtn').addEventListener('click', () => leaveSession());
  }

  /* ---------- Init ---------- */
  load();
  initTheme();
  buildLegend();
  bindSetup();
  bindTraining();
  bindLearn();
  renderSetup();
  if (synth) { pickVoice(); try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
  runDemo();
})();

/* Offline support: register the service worker (works when served over https or localhost) */
// Offline support: register the service worker (works when served over https or localhost)
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js')
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function () {
        var s = document.getElementById('summary');
        if (s && !document.getElementById('offlineOk')) {
          var p = document.createElement('p');
          p.id = 'offlineOk'; p.className = 'offline-ok';
          p.textContent = 'ოფლაინ რეჟიმი მზადაა';
          s.after(p);
        }
      })
      .catch(function () {});
  });
}
