// 니짐내짐 입점센터 만족도 설문 시안 — 회원 앱 설문 창 + 센터 관리자 결과 + 본사 결과·설정. 서버 역할은 engine.js(SV).
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const P = new URLSearchParams(location.search);
const SEED = seedHistory(SV);
const LOGINS = { c_ydp: 'center', c_gn: 'center', c_long: 'center', c_ss: 'center', hq: 'hq' };
const PHONE_MASK = true; // 기존 관리자 회원 목록 표시 방식에 맞춰 바꿀 한 곳
const maskPh = (p) => (PHONE_MASK ? p.replace(/^(\d{3})-(\d{3,4})-(\d{4})$/, '$1-****-$3') : p);
const LV = ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '아주 좋아요'];
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" stroke-linejoin="round"/></svg>';
const CENTER = (id) => CENTERS.find((c) => c.id === id);
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };

const S = {
  view: P.get('v') || 'app', // app | center | hq | set
  login: P.get('login') || 'c_ydp',
  clock: CLOCK0, cfg: clone(SV.DEFAULT_CFG), draft: null, saved: '',
  st: SEED.st, members: { ...SEED.members, ...DEMO_MEMBERS },
  member: P.get('m') || 'm_kim', screen: 'home', round: null, ans: {}, comment: '', toast: '', log: '',
  period: P.get('period') || 'this', from: '', to: '', center: P.get('c') || 'all', trendQ: 'avg', cmMore: false, rowMore: false,
};
S.draft = clone(S.cfg);
DEMO_VISITS.forEach(([m, c, at]) => S.st.visits.push({ m, c, at }));
if (P.get('shot')) document.body.classList.add('shot');

// ── 날짜
const p2 = (n) => String(n).padStart(2, '0');
const DOW = '일월화수목금토';
const dObj = (s) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const ymd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const md = (s) => `${+s.slice(5, 7)}/${+s.slice(8, 10)}`;
const fmtAt = (s) => `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}(${DOW[dObj(s).getDay()]}) ${s.slice(11, 16)}`;
const fmtD = (s) => `${s.slice(0, 4)}.${s.slice(5, 7)}.${s.slice(8, 10)}`;
const today = () => S.clock.slice(0, 10);
function monthRange(t, back) { const d = dObj(t); d.setDate(1); d.setMonth(d.getMonth() - back); const e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return [ymd(d), ymd(e)]; }
function range() {
  if (S.period === 'last') return monthRange(today(), 1);
  if (S.period === 'custom') { const [f] = monthRange(today(), 0); return [S.from || f, S.to || today()]; }
  return [monthRange(today(), 0)[0], today()];
}

// ══════════ 회원 앱 ══════════
const SB = '<div class="sb"><span>9:41</span><span class="ic"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="7" width="3" height="5" rx="1" fill="#202024"/><rect x="5" y="5" width="3" height="7" rx="1" fill="#202024"/><rect x="10" y="2.5" width="3" height="9.5" rx="1" fill="#202024"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#202024"/></svg><svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="#202024" opacity=".4"/><rect x="2" y="2" width="17" height="8" rx="1.8" fill="#202024"/><rect x="23.5" y="4" width="1.6" height="4" rx=".8" fill="#202024" opacity=".4"/></svg></span></div>';
const qsOf = () => S.round.qsnap;
const answered = () => qsOf().filter((q) => S.ans[q.id]).length;
const firstOpen = () => { const i = qsOf().findIndex((q) => !S.ans[q.id]); return i < 0 ? qsOf().length : i; };
const allDone = () => answered() === qsOf().length;

function surveyHTML() {
  const qs = qsOf(), upto = firstOpen(), c = CENTER(S.round.c), max = S.cfg.commentMax;
  const qh = qs.slice(0, Math.min(upto + 1, qs.length)).map((q, i) => {
    const v = S.ans[q.id] || 0;
    const st = [1, 2, 3, 4, 5].map((k) => `<button class="star${k <= v ? ' on' : ''}" data-act="rate" data-q="${q.id}" data-v="${k}" role="radio" aria-checked="${k === v}" aria-label="${k}점 ${LV[k]}">${STAR}</button>`).join('');
    return `<div class="sv-q" id="q_${q.id}"><div class="t"><span class="no">${i + 1}</span><span>${esc(q.text)}</span></div>`
      + `<div class="row"><div class="stars" role="radiogroup" aria-label="${esc(q.label)}">${st}</div><span class="lv${v ? '' : ' e'}">${v ? LV[v] : '-'}</span></div></div>`;
  }).join('');
  const len = [...S.comment].length;
  const cm = allDone() ? `<div class="sv-cm" id="cm"><div class="t">더 하고 싶은 말 <span>(선택)</span></div><div class="s">좋았던 점이나 바라는 점을 편하게 적어 주세요.</div>`
    + `<div class="sv-ta"><textarea id="cmt" rows="4" maxlength="${max}" placeholder="예) 저녁 시간엔 스쿼트 랙이 늘 차 있어요">${esc(S.comment)}</textarea><div class="cnt${len >= max ? ' full' : ''}" id="cnt">${len}/${max}</div></div></div>` : '';
  const pct = Math.round((answered() / qs.length) * 100);
  return `<div class="sv" role="dialog" aria-modal="true" aria-label="센터 만족도 설문">${SB}`
    + `<div class="sv-top"><div class="sv-prog" aria-hidden="true"><i style="width:${pct}%"></i></div><button class="sv-skip" data-act="decline">참여 안 함</button></div>`
    + `<div class="scr sv-scr" id="svscr"><h1>이용하신 센터는<br>어떠셨나요?</h1>`
    + `<p class="sv-lead">1분이면 끝나요. 남겨 주신 답은 이름 없이 센터에 전달돼요.</p>`
    + `<div class="sv-center"><span class="k">이용 센터</span><span class="v">${esc(c.n)}</span></div>${qh}${cm}</div>`
    + `<div class="sv-bar">${allDone() ? '' : `<div class="hint">별점을 모두 고르면 제출할 수 있어요 (${answered()}/${qs.length})</div>`}<div class="two"><button class="btn gray" data-act="later">다음에 하기</button>`
    + `<button class="btn pink${allDone() ? '' : ' dis'}" data-act="submit" aria-disabled="${!allDone()}" id="sbm">제출하기</button></div></div></div>`;
}
function doneHTML() {
  const c = CENTER(S.round.c);
  return `<div class="sv">${SB}<div class="sv-done"><div class="ck"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FC2066" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>`
    + `<h2>의견 고마워요!</h2><p>남겨 주신 내용은 <span class="cn">${esc(josa(c.n, '과', '와'))}</span> 니짐내짐이 함께 보고 더 나은 운동 환경을 만드는 데 쓸게요.</p></div>`
    + `<div class="sv-bar"><div class="two"><button class="btn pink" data-act="doneOk">확인</button></div></div></div>`;
}
function homeHTML() {
  const m = S.members[S.member];
  return `<div class="home">${SB}<div class="hd">니짐내짐</div><div class="bd"><div class="card"><div class="k">${esc(m.n)}님, 오늘도 운동 잘 하셨어요</div><div class="v">이번 달 입장 ${S.st.visits.filter((v) => v.m === S.member && v.at.slice(0, 7) === S.clock.slice(0, 7)).length}회</div></div>`
    + `<div class="card"><div class="k">내 멤버십</div><div class="v">헬스 구독 멤버십</div></div>`
    + `<div class="ph-note">시안용 간단 홈 화면이에요(실제 홈 아님).<br>설문은 앱을 열 때 이 위에 전체 화면으로 떠요.</div></div></div>`;
}
function renderApp() {
  const el = $('#app'), sc = $('#svscr'), top = sc ? sc.scrollTop : 0;
  el.innerHTML = (S.screen === 'survey' ? surveyHTML() : S.screen === 'done' ? doneHTML() : homeHTML())
    + `<div class="toast${S.toast ? '' : ' gone'}" id="toast">${esc(S.toast)}</div>`;
  const ns = $('#svscr'); if (ns) ns.scrollTop = top;
  const ta = $('#cmt');
  if (ta) {
    ta.addEventListener('input', () => {
      S.comment = ta.value; const len = [...S.comment].length, cnt = $('#cnt');
      cnt.textContent = `${len}/${S.cfg.commentMax}`; cnt.classList.toggle('full', len >= S.cfg.commentMax);
    });
    ta.addEventListener('focus', () => setTimeout(() => ta.closest('.sv-ta').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300));
  }
}
// 화면 높이가 줄면(키보드) 쓰고 있는 칸이 보이게
window.visualViewport && window.visualViewport.addEventListener('resize', () => {
  const a = document.activeElement; if (a && a.id === 'cmt') a.closest('.sv-ta').scrollIntoView({ block: 'nearest' });
});
let toastT;
function toast(t) { S.toast = t; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = ''; const e = $('#toast'); if (e) e.classList.add('gone'); }, 2600); }

function openApp() {
  const r = SV.openApp(S.st, S.cfg, S.member, S.clock);
  if (r.round) { S.round = r.round; S.ans = {}; S.comment = ''; S.screen = 'survey'; S.log = `앱 열기 → ${CENTER(r.round.c).n} 설문 ${r.pick.kind === 'new' ? '새 회차' : '같은 회차 다시'}`; }
  else { S.screen = 'home'; S.round = null; S.log = '앱 열기 → 설문 안 뜸'; }
}
const APP = {
  rate(el) {
    const q = el.dataset.q, v = +el.dataset.v, before = firstOpen();
    S.ans[q] = v; renderApp();
    const after = firstOpen();
    if (after > before) { // 새 질문(또는 의견 칸)이 나타나면 보이게 살짝 내림
      const sc = $('#svscr'), nx = after < qsOf().length ? $(`#q_${qsOf()[after].id}`) : $('#cm');
      if (sc && nx) { const need = nx.offsetTop + nx.offsetHeight - sc.clientHeight + 16; if (need > sc.scrollTop) sc.scrollTo({ top: need, behavior: P.get('shot') ? 'auto' : 'smooth' }); }
    }
    renderPanel();
  },
  submit() {
    if (!allDone()) { const i = firstOpen(); const e = $(`#q_${qsOf()[i].id}`); e && e.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const res = SV.act(S.st, S.cfg, S.member, S.round.id, 'submit', S.clock, { scores: S.ans, comment: S.comment });
    if (!res.ok) { toast(res.err); renderApp(); return; }
    S.screen = 'done'; S.log = `제출 → ${CENTER(S.round.c).n} (관리자 화면에 바로 쌓임)`; render();
  },
  later() { SV.act(S.st, S.cfg, S.member, S.round.id, 'later', S.clock); S.screen = 'home'; toast(`${S.cfg.snoozeDays}일 뒤에 다시 여쭤볼게요`); S.log = `다음에 하기 → ${S.round.snoozeUntil.slice(5, 16)}부터 다시`; render(); },
  decline() { SV.act(S.st, S.cfg, S.member, S.round.id, 'decline', S.clock); S.screen = 'home'; toast('이번 설문은 건너뛸게요'); S.log = '참여 안 함 → 이번 회차 끝, 다음 주기에'; render(); },
  doneOk() { S.screen = 'home'; render(); },
};

// ══════════ 관리자 ══════════
const SYM = '<img src="nijim_symbol_black.svg" width="24" height="24" alt="">';
function side() {
  const hq = S.login === 'hq';
  const navs = hq
    ? [['g', '센터'], ['n', '입점 센터 목록'], ['n', '입점 심사'], ['g', '회원 만족도 설문'], ['s', '설문 결과', 'hq'], ['s', '설문 설정', 'set'], ['g', '정산'], ['n', '센터 정산']]
    : [['g', '운영'], ['n', '홈'], ['n', '회원 관리'], ['n', '출석'], ['s', '회원 만족도 설문', 'center'], ['g', '상품'], ['n', '멤버십 상품'], ['n', '구독 멤버십'], ['g', '설정'], ['n', '센터 정보']];
  return `<div class="side"><div class="brand">${SYM}니짐내짐 ${hq ? '본사 관리' : '센터 관리'}</div>` + navs.map(([k, l, v]) => (k === 'g' ? `<div class="grp">${l}</div>`
    : `<div class="nav${k === 's' ? ' sub' : ''}${v === S.view ? ' on' : ''}"${v ? ` data-act="nav" data-v="${v}"` : ''}>${l}</div>`)).join('') + '</div>';
}
const session = () => (S.login === 'hq' ? { role: 'hq', who: '본사 운영팀' } : { role: 'center', center: S.login, who: CENTER(S.login).admin });
function query() { const [from, to] = range(); return { from, to, now: S.clock, center: S.center }; }
const f1 = (x) => (x == null ? '–' : x.toFixed(1));
const LOW = 3.5;
function toolsHTML(q, hq) {
  const seg = [['this', '이번 달'], ['last', '지난 달'], ['custom', '직접 지정']].map(([v, t]) => `<span class="${S.period === v ? 'on' : ''}" data-act="period" data-v="${v}">${t}</span>`).join('');
  const custom = S.period === 'custom' ? `<span class="dt"><input type="date" id="pf" value="${q.from}" max="${q.to}" aria-label="시작일"><i>~</i><input type="date" id="pt" value="${q.to}" min="${q.from}" aria-label="종료일"></span>` : '';
  const csel = hq ? `<div class="sel"><select id="csel" aria-label="센터">${[['all', '전체 센터'], ...CENTERS.map((c) => [c.id, c.n])].map(([v, t]) => `<option value="${v}"${S.center === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>` : '';
  return `<div class="tools"><div class="pseg">${seg}</div>${custom}${csel}<span class="range">${q.from.replace(/-/g, '.')} ~ ${q.to.replace(/-/g, '.')}</span></div>`;
}
function qBars(perQ, hq) {
  const rows = perQ.filter((x) => hq || x.scope === 'center');
  if (!rows.some((x) => x.n)) return emptyHTML('이 기간에 받은 응답이 없어요.', '회원이 설문을 제출하면 질문별 평균이 여기에 보여요.');
  return '<div class="qwrap">' + rows.map((x) => {
    const tip = x.n ? `${x.label} 평균 ${f1(x.avg)} · ${x.n}명 · ` + [5, 4, 3, 2, 1].map((k) => `${k}점 ${x.dist[k - 1]}`).join(' / ') : `${x.label} 응답 없음`;
    return `<div class="qb" title="${esc(tip)}"><div class="l">${esc(x.label)}${x.scope === 'hq' ? '<span class="chip hq">본사만</span>' : ''}${x.deleted ? '<span class="chip del">삭제됨</span>' : ''}</div>`
      + `<div class="tr"><i style="width:${x.n ? (x.avg / 5) * 100 : 0}%"></i></div><div class="v${x.n && x.avg < LOW ? ' low' : ''}">${f1(x.avg)}</div><div class="n">${x.n}명</div></div>`;
  }).join('') + `<div class="lowkey">5점 만점 · 빨간 숫자 = ${LOW} 미만</div></div>`;
}
function trendSVG(trend, qs) {
  const key = S.trendQ;
  const val = (t) => (key === 'avg' ? t.avg : t.perQ[key] ?? null);
  const W = window.innerWidth < 760 ? 340 : 600, H = 210, L = 28, R = 8, T = 22, B = 44, ch = H - T - B, cw = (W - L - R) / trend.length, bw = Math.min(40, cw * 0.46);
  const y = (v) => T + ch - (v / 5) * ch;
  let g = '';
  for (let k = 1; k <= 5; k++) g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(k)}" y2="${y(k)}"/><text class="ax" x="${L - 8}" y="${y(k) + 4}" text-anchor="end">${k}</text>`;
  const bars = trend.map((t, i) => {
    const cx = L + cw * i + cw / 2, v = val(t), lab = `${+t.month.slice(5)}월`;
    const bar = v == null ? `<text class="nl" x="${cx}" y="${T + ch - 6}" text-anchor="middle">응답 없음</text>`
      : `<path class="tb" d="M${cx - bw / 2} ${T + ch}V${y(v) + 4}q0-4 4-4h${bw - 8}q4 0 4 4V${T + ch}z"><title>${lab} 평균 ${v.toFixed(1)} · 응답 ${t.n}건${t.rate != null ? ` · 응답률 ${t.rate}%` : ''}</title></path><text class="vl" x="${cx}" y="${y(v) - 6}" text-anchor="middle">${v.toFixed(1)}</text>`;
    return `${bar}<text class="ml" x="${cx}" y="${H - 24}" text-anchor="middle">${lab}</text><text class="nl" x="${cx}" y="${H - 8}" text-anchor="middle">${t.n}건</text>`;
  }).join('');
  const opts = [['avg', '센터 평균(전체 질문)'], ...qs.map((q) => [q.id, q.label + (q.scope === 'hq' ? ' (본사만)' : '')])].map(([v, t]) => `<option value="${v}"${key === v ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const none = !trend.some((t) => t.n);
  return { sel: `<div class="sel"><select id="tsel" aria-label="추이 볼 질문">${opts}</select></div>`, svg: none ? emptyHTML('최근 6개월 동안 받은 응답이 없어요.', '응답이 쌓이면 달마다 평균이 막대로 보여요.') : `<div class="trend"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="월별 평균">${g}${bars}</svg></div>` };
}
function emptyHTML(t, s) {
  return `<div class="empty"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8B8C0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/></svg><div class="et">${t}</div><div class="es">${s}</div></div>`;
}
const tie = (s) => s.perQ.filter((x) => x.scope === 'center' && x.n && x.avg === s.low.avg).length - 1;
function cards(s, hq, perQ) {
  const card = (t, big, unit, sub, cls = '') => `<div class="card ${cls}"><div class="t">${t}</div><div class="big${String(big).length > 7 ? ' sm' : ''}">${big}<span class="u">${unit}</span></div><div class="s">${sub}</div></div>`;
  const pq = (id) => perQ.find((x) => x.id === id) || { avg: null, n: 0 };
  const list = [
    card('응답 수', s.n, '건', s.n ? `의견 남김 <b>${s.comments}건</b>` : '아직 응답이 없어요'),
    card('응답률', s.rate == null ? '–' : s.rate, s.rate == null ? '' : '%', s.shown ? `설문 띄움 <b>${s.shown}</b> · 제출 <b>${s.submitted}</b> · 참여 안 함 ${s.declined}` : '이 기간에 띄운 설문이 없어요'),
    card('센터 평균', f1(s.avg), s.avg == null ? '' : ' / 5', '센터 질문 전체 평균', 'hl'),
  ];
  if (hq) { list.push(card('앱 만족도', f1(pq('q_app').avg), pq('q_app').n ? ' / 5' : '', '본사만 보는 질문')); list.push(card('추천 의향', f1(pq('q_rec').avg), pq('q_rec').n ? ' / 5' : '', '본사만 보는 질문')); }
  else list.push(card('가장 낮은 항목', s.low ? esc(s.low.label) + (tie(s) ? ` 외 ${tie(s)}개` : '') : '–', '', s.low ? `평균 <b>${f1(s.low.avg)}</b> · 먼저 살펴보면 좋아요` : '응답이 쌓이면 보여요'));
  return `<div class="cards${hq ? ' c5' : ''}">${list.join('')}</div>`;
}
function centerPage() {
  const ses = session(), q = query(), res = SV.reportApi(S.st, S.cfg, CENTERS, ses, q), s = res.sum, c = CENTER(ses.center);
  const tr = trendSVG(res.trend, res.questions);
  const cms = res.comments, show = S.cmMore ? cms : cms.slice(0, 8);
  const cmHTML = cms.length ? `<div class="cms">${show.map((x) => `<div class="cm"><div class="d">${fmtD(x.date)}</div><div class="x">${esc(x.text)}</div><div class="a">평균 ${f1(x.avg)}</div></div>`).join('')}</div>`
    + (cms.length > 8 && !S.cmMore ? `<div class="more" data-act="cmMore">${cms.length - 8}건 더 보기</div>` : '') : emptyHTML('이 기간에 남겨진 의견이 없어요.', '«더 하고 싶은 말»은 선택이라 별점만 남기는 회원도 많아요.');
  return `<div class="content"><div class="ph"><div><h1>회원 만족도 설문</h1><div class="sub">${esc(c.n)} · 로그인 ${esc(ses.who)}</div></div></div>`
    + toolsHTML(q, false)
    + `<div class="note">기간은 <b>회원이 설문을 제출한 날</b> 기준이에요(응답률은 그 기간에 설문을 띄운 회원 기준). 회원 이름·연락처는 보이지 않고, 의견은 날짜만 보여요. 우리 센터 응답만 보여요.</div>`
    + cards(s, false, s.perQ)
    + `<div class="grid2"><div class="pan"><div class="pt">질문별 평균 <span class="m">응답 ${s.n}건</span></div>${qBars(s.perQ, false)}</div>`
    + `<div class="pan"><div class="pt">월별 추이 <span class="m">최근 6개월</span>${tr.sel}</div>${tr.svg}</div></div>`
    + `<div class="pan mt"><div class="pt">회원 의견 <span class="m">${cms.length}건 · 최신순 · 이름 없이 보여요</span></div>${cmHTML}</div></div>`;
}
function hqPage() {
  const ses = session(), q = query(), res = SV.reportApi(S.st, S.cfg, CENTERS, ses, q), s = res.sum;
  const tr = trendSVG(res.trend, res.questions), qs = res.questions;
  const cn = S.center === 'all' ? '전체 센터' : CENTER(S.center).n;
  const cell = (v) => `<td class="${v == null ? 'mute' : v < LOW ? 'low' : ''}">${f1(v)}</td>`;
  const comp = `<div class="pan mt"><div class="pt">센터별 비교 <span class="m">줄을 누르면 그 센터만 봐요 · 빨간 숫자 = ${LOW} 미만</span></div><div class="scx"><table class="ht"><thead><tr><th class="n">센터</th><th>설문 띄움</th><th>응답</th><th>응답률</th><th>센터 평균</th>`
    + qs.map((x) => `<th class="${x.scope === 'hq' ? 'hq' : ''}">${esc(x.label)}</th>`).join('') + '</tr></thead><tbody>'
    + res.byCenter.map((b) => `<tr class="${S.center === b.id ? 'on' : ''}" data-act="pickCenter" data-v="${b.id}"><td class="n">${esc(CENTER(b.id).n)}</td><td>${b.sum.shown}</td><td>${b.sum.n}</td><td class="${b.sum.rate == null ? 'mute' : ''}">${b.sum.rate == null ? '–' : b.sum.rate + '%'}</td>${cell(b.sum.avg)}`
      + qs.map((x) => cell((b.sum.perQ.find((p) => p.id === x.id) || {}).avg)).join('') + '</tr>').join('') + '</tbody></table></div></div>';
  const rows = res.rows, show = S.rowMore ? rows : rows.slice(0, 20), all = S.center === 'all';
  const cq = qs.filter((x) => x.scope === 'center').map((x) => x.id);
  const rAvg = (r) => { const v = cq.map((id) => r.scores[id]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const table = rows.length ? `<table class="rt"><thead><tr>${all ? '<th class="c-cn">센터</th>' : ''}<th class="c-nm">회원</th><th class="c-at">제출 일시</th><th class="c-sc">점수</th><th class="c-av">센터 평균</th><th>의견</th></tr></thead><tbody>`
    + show.map((r) => { const m = S.members[r.m]; return `<tr>${all ? `<td data-l="센터">${esc(CENTER(r.c).n)}</td>` : ''}<td class="c-nm" data-l="회원"><b>${esc(m.n)}</b><span class="ph">${esc(maskPh(m.ph))}</span></td><td class="c-at" data-l="제출 일시">${fmtAt(r.at)}</td>`
      + `<td data-l="점수">${qs.filter((x) => r.scores[x.id] != null).map((x) => `<span class="sc">${esc(x.label)} <b class="${r.scores[x.id] <= 2 ? 'low' : ''}">${r.scores[x.id]}</b></span>`).join('')}</td>`
      + `<td class="c-av" data-l="센터 평균">${f1(rAvg(r))}</td><td class="c-cm${r.comment ? '' : ' e'}" data-l="의견">${r.comment ? esc(r.comment) : '없음'}</td></tr>`; }).join('') + '</tbody></table>'
    + (rows.length > 20 && !S.rowMore ? `<div class="more" data-act="rowMore">${rows.length - 20}건 더 보기</div>` : '')
    : emptyHTML('이 기간에 받은 응답이 없어요.', '기간이나 센터를 바꿔 보세요.');
  return `<div class="content"><div class="ph"><div><h1>회원 만족도 설문 결과</h1><div class="sub">${esc(cn)} · 로그인 ${esc(ses.who)} (본사)</div></div></div>`
    + toolsHTML(q, true)
    + `<div class="note">기간은 <b>설문을 제출한 날</b> 기준이에요. 본사 화면은 모든 센터·모든 질문과 응답한 회원 이름을 볼 수 있어요. <b>센터 관리자 화면에는 이름·연락처와 «본사만» 질문이 보이지 않아요.</b></div>`
    + cards(s, true, s.perQ) + comp
    + `<div class="grid2"><div class="pan"><div class="pt">질문별 평균 <span class="m">${esc(cn)} · 응답 ${s.n}건</span></div>${qBars(s.perQ, true)}</div>`
    + `<div class="pan"><div class="pt">월별 추이 <span class="m">최근 6개월</span>${tr.sel}</div>${tr.svg}</div></div>`
    + `<div class="pan mt"><div class="lh"><div class="pt">응답 명단 <span class="m">${rows.length}건 · 최신순 · 연락처는 회원 관리와 같은 방식으로 가림</span></div>`
    + `<span class="b sec csv${rows.length ? '' : ' dis'}" data-act="csv" aria-disabled="${!rows.length}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>엑셀(CSV) 내려받기</span></div>${table}</div></div>`;
}
// ── 본사 설정
const FIELDS = [
  ['minVisits', '설문 대상 — 이 센터 누적 입장', '회', '이 횟수부터 물어봐요'],
  ['cycleDays', '같은 센터에 다시 묻는 간격', '일', '지난 회차를 띄운 날부터 셈(제출·참여 안 함·응답 없음 모두)'],
  ['delayMin', '입장 후 설문 띄우기까지', '분', '운동 중엔 안 띄워요. 이 시간이 지난 뒤 앱을 열 때'],
  ['freshHours', '새 설문을 띄우는 기한', '시간', '입장 후 이 시간 안에 앱을 열 때만 새로 띄워요'],
  ['snoozeDays', '«다음에 하기» 후 다시 띄우기', '일', ''],
  ['roundDays', '한 번 띄운 설문이 열려 있는 기간', '일', '지나면 응답 없이 닫히고 다음 간격을 기다려요'],
  ['commentMax', '«더 하고 싶은 말» 최대 글자 수', '자', ''],
];
let setErr = {};
function setPage() {
  const d = S.draft, e = setErr, dirty = JSON.stringify(d) !== JSON.stringify(S.cfg), n = d.questions.length, max = SV.LIMITS.questions[1];
  const fld = ([k, l, u, h]) => `<div class="f"><div class="lb">${l}</div><div class="in num${e[k] ? ' bad' : ''}"><input data-k="${k}" inputmode="numeric" value="${esc(d[k])}" aria-label="${l}"><span class="unit">${u}</span></div>${e[k] ? `<div class="errt">${e[k]}</div>` : h ? `<div class="hint">${h}</div>` : ''}</div>`;
  const qrows = d.questions.map((q, i) => `<div class="qr"><div class="no">${i + 1}</div>`
    + `<div class="f-t"><div class="in${e[`q${i}text`] ? ' bad' : ''}"><input data-q="${i}" data-f="text" value="${esc(q.text)}" maxlength="60" placeholder="회원에게 보이는 질문" aria-label="${i + 1}번 질문"></div>${e[`q${i}text`] ? `<div class="errt">${e[`q${i}text`]}</div>` : ''}</div>`
    + `<div class="f-l"><div class="in${e[`q${i}label`] ? ' bad' : ''}"><input data-q="${i}" data-f="label" value="${esc(q.label)}" maxlength="20" placeholder="짧은 이름" aria-label="${i + 1}번 짧은 이름"></div>${e[`q${i}label`] ? `<div class="errt">${e[`q${i}label`]}</div>` : ''}</div>`
    + `<div class="f-s sel"><select data-q="${i}" data-f="scope" aria-label="${i + 1}번 공개 범위"><option value="center"${q.scope === 'center' ? ' selected' : ''}>센터·본사</option><option value="hq"${q.scope === 'hq' ? ' selected' : ''}>본사만</option></select></div>`
    + `<div class="ops"><span class="ib${i ? '' : ' dis'}" data-act="qUp" data-v="${i}" title="위로" aria-label="위로">↑</span><span class="ib${i < n - 1 ? '' : ' dis'}" data-act="qDown" data-v="${i}" title="아래로" aria-label="아래로">↓</span><span class="ib x${n > 1 ? '' : ' dis'}" data-act="qDel" data-v="${i}" title="삭제" aria-label="삭제">✕</span></div></div>`).join('');
  const msg = Object.keys(e).length ? '<span class="m e">고칠 곳이 있어요. 빨간 칸을 확인해 주세요.</span>' : S.saved ? `<span class="m ok">${S.saved}</span>` : dirty ? '<span class="m">저장하지 않은 변경이 있어요.</span>' : '<span class="m">바꾼 설정은 저장한 뒤 새로 띄우는 설문부터 적용돼요.</span>';
  return `<div class="content"><div class="ph"><div><h1>회원 만족도 설문 설정</h1><div class="sub">모든 입점 센터에 같이 적용 · 로그인 본사 운영팀</div></div></div>`
    + `<div class="sset"><div class="h"><div><div class="tt">설문 켜기</div><div class="ds">끄면 회원 앱에 설문이 뜨지 않아요. 이미 받은 응답은 그대로 남아요.</div></div><span class="sw${d.enabled ? ' on' : ''}" data-act="toggle" role="switch" aria-checked="${d.enabled}" aria-label="설문 켜기"></span></div></div>`
    + `<div class="sset"><div class="h"><div><div class="tt">누구에게 · 언제</div><div class="ds">회원 한 명에게 하루에 한 센터 설문만 띄워요(여러 센터 이용 회원은 최근 입장한 센터 먼저).</div></div></div><div class="fg">${FIELDS.map(fld).join('')}<div class="f"><div class="lb">하루에 띄우는 설문</div><div class="fixed">회원당 1개 (고정)</div></div></div></div>`
    + `<div class="sset"><div class="h"><div><div class="tt">질문 <span class="chip">${n}/${max}</span></div><div class="ds">모든 질문은 별 1~5개 필수예요. «본사만» 질문은 센터 관리자 화면에 안 보여요. 지운 질문의 지난 응답은 결과 화면에 «삭제됨»으로 남아요.</div></div></div>`
    + `${e.questions ? `<div class="errt" style="margin-top:10px">${e.questions}</div>` : ''}<div class="ql"><div class="qh"><span>순서</span><span>질문 (회원에게 보이는 문장, ${SV.LIMITS.textLen}자 안)</span><span>짧은 이름 (결과 화면)</span><span>공개 범위</span><span>순서·삭제</span></div>${qrows}`
    + `<div class="qadd${n >= max ? ' dis' : ''}" data-act="qAdd">${n >= max ? `질문은 ${max}개까지예요` : '+ 질문 추가'}</div></div></div>`
    + `<div class="foot2">${msg}<span class="b sec${dirty ? '' : ' dis'}" data-act="setReset">되돌리기</span><span class="b pri${dirty ? '' : ' dis'}" data-act="setSave">저장</span></div></div>`;
}
let qSeq = 0;
const ADM = {
  nav(el) { S.view = el.dataset.v; render(); },
  period(el) { S.period = el.dataset.v; if (S.period === 'custom' && !S.from) { S.from = monthRange(today(), 0)[0]; S.to = today(); } S.cmMore = S.rowMore = false; render(); },
  pickCenter(el) { S.center = S.center === el.dataset.v ? 'all' : el.dataset.v; S.rowMore = false; render(); },
  cmMore() { S.cmMore = true; render(); },
  rowMore() { S.rowMore = true; render(); },
  csv() {
    const ses = session(), q = query(), res = SV.reportApi(S.st, S.cfg, CENTERS, ses, q); if (!res.rows.length) return;
    const qs = res.questions, cq = qs.filter((x) => x.scope === 'center').map((x) => x.id);
    const cell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
    const head = ['센터', '회원 이름', '연락처', '제출 일시', ...qs.map((x) => x.label + (x.deleted ? '(삭제됨)' : '')), '센터 평균', '의견'];
    const lines = res.rows.map((r) => { const m = S.members[r.m], v = cq.map((id) => r.scores[id]).filter((x) => x != null);
      return [CENTER(r.c).n, m.n, maskPh(m.ph), r.at, ...qs.map((x) => r.scores[x.id] ?? ''), v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '', r.comment]; });
    const name = `만족도설문_${(S.center === 'all' ? '전체센터' : CENTER(S.center).n).replace(/\s/g, '')}_${q.from}_${q.to}.csv`;
    const text = '﻿' + [head, ...lines].map((l) => l.map(cell).join(',')).join('\r\n');
    window.__lastCsv = { name, text };
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    S.log = `CSV ${res.rows.length}건 — ${name}`; renderPanel();
  },
  toggle() { S.draft.enabled = !S.draft.enabled; S.saved = ''; render(); },
  qUp(el) { const i = +el.dataset.v; if (!i) return; const a = S.draft.questions; [a[i - 1], a[i]] = [a[i], a[i - 1]]; S.saved = ''; setErr = {}; render(); },
  qDown(el) { const i = +el.dataset.v, a = S.draft.questions; if (i >= a.length - 1) return; [a[i + 1], a[i]] = [a[i], a[i + 1]]; S.saved = ''; setErr = {}; render(); },
  qDel(el) { const a = S.draft.questions; if (a.length <= 1) return; a.splice(+el.dataset.v, 1); S.saved = ''; setErr = {}; render(); },
  qAdd() { const a = S.draft.questions; if (a.length >= SV.LIMITS.questions[1]) return; a.push({ id: `q_new${Date.now().toString(36)}${++qSeq}`, label: '', text: '', scope: 'center' }); S.saved = ''; render(); setTimeout(() => { const i = document.querySelectorAll('.qr input[data-f="text"]'); i[i.length - 1] && i[i.length - 1].focus(); }, 0); },
  setReset() { S.draft = clone(S.cfg); setErr = {}; S.saved = ''; render(); },
  setSave() {
    if (JSON.stringify(S.draft) === JSON.stringify(S.cfg)) return;
    S.draft.questions.forEach((q) => { q.text = q.text.trim(); q.label = q.label.trim(); });
    setErr = SV.validateCfg(S.draft);
    if (!Object.keys(setErr).length) { S.cfg = clone(S.draft); S.saved = '저장했어요. 새로 띄우는 설문부터 적용돼요.'; S.log = '설정 저장 — 회원 앱 판정에 바로 반영'; }
    render();
  },
};
function bindAdmin() {
  const sd = $('#adm .side'), on = sd && sd.querySelector('.nav.on');
  if (on && sd.scrollWidth > sd.clientWidth) sd.scrollLeft = on.offsetLeft - (sd.clientWidth - on.offsetWidth) / 2;
  $('#pf')?.addEventListener('change', (e) => { if (e.target.value) { S.from = e.target.value; render(); } });
  $('#pt')?.addEventListener('change', (e) => { if (e.target.value) { S.to = e.target.value; render(); } });
  $('#csel')?.addEventListener('change', (e) => { S.center = e.target.value; S.rowMore = false; render(); });
  $('#tsel')?.addEventListener('change', (e) => { S.trendQ = e.target.value; render(); });
  document.querySelectorAll('#adm input[data-k]').forEach((el) => el.addEventListener('input', () => { const v = el.value.replace(/[^0-9]/g, ''); el.value = v; S.draft[el.dataset.k] = v === '' ? NaN : +v; S.saved = ''; }));
  document.querySelectorAll('#adm [data-q][data-f]').forEach((el) => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { S.draft.questions[+el.dataset.q][el.dataset.f] = el.value; S.saved = ''; }));
}
function renderAdmin() {
  if (S.login !== 'hq' && S.view !== 'center') S.view = 'center';
  if (S.login === 'hq' && S.view === 'center') S.view = 'hq';
  if (S.view === 'hq' && S.trendQ !== 'avg' && !S.cfg.questions.some((q) => q.id === S.trendQ)) S.trendQ = 'avg';
  if (S.view === 'center' && ['q_app', 'q_rec'].includes(S.trendQ)) S.trendQ = 'avg';
  const main = S.view === 'set' ? setPage() : S.view === 'hq' ? hqPage() : centerPage();
  $('#adm').innerHTML = `<div class="app">${side()}<div class="main">${main}</div></div>`;
  bindAdmin();
}

// ══════════ 조작판 ══════════
const WHY = (x, cfg) => {
  if (x.ok) return x.kind === 'new' ? '띄울 수 있음(새 회차)' : '띄울 수 있음(같은 회차 다시)';
  const since = x.lastVisit ? Math.round((SV.toMin(S.clock) - SV.toMin(x.lastVisit)) / 60 * 10) / 10 : null;
  const R = {
    off: () => '설문 꺼짐', visits: () => `입장 ${x.visits}회 — ${cfg.minVisits}회부터`,
    working: () => `입장 ${Math.round(since * 60)}분 — 운동 중(${cfg.delayMin}분 뒤부터)`, stale: () => `마지막 입장 ${Math.round(since)}시간 전 — 다음 입장 후`,
    cycle: () => `${md(x.until)} ${x.until.slice(11)}까지 쉼(지난 회차 ${({ submitted: '제출', declined: '참여 안 함', expired: '응답 없이 닫힘', open: '진행' })[x.last]})`,
    snoozed: () => `다음에 하기 — ${md(x.until)} ${x.until.slice(11)}부터`,
  };
  return R[x.why] ? R[x.why]() : x.why;
};
function renderPanel() {
  const isApp = S.view === 'app';
  document.body.classList.toggle('mode-app', isApp); document.body.classList.toggle('mode-admin', !isApp);
  const segs = (g, items, cur) => `<div class="seg${items.length > 3 ? ' w' : ''}">${items.map(([v, t]) => `<button data-pg="${g}" data-v="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const viewNow = isApp ? 'app' : S.login === 'hq' ? 'hq' : 'center';
  let h = '<div class="demo-h">시안 조작판 <span>(실제 화면 아님 · 더미 데이터)</span></div>'
    + `<div><div class="lb">보는 화면</div>${segs('view', [['app', '회원 앱'], ['center', '센터 관리자'], ['hq', '본사 관리자']], viewNow)}</div>`;
  h += `<div class="adm-only"><div class="lb">센터 관리자 계정 (자기 센터만 보임)</div>${segs('login', [['c_ydp', '영등포점'], ['c_gn', '강남역점'], ['c_long', '긴 이름 센터'], ['c_ss', '성수점(0건)']], S.login)}</div>`;
  if (isApp) {
    const res = SV.pick(S.st, S.cfg, S.member, S.clock);
    const rows = res.list.map((x) => `<tr><td>${esc(CENTER(x.c).n)}<br><span style="color:#A9A9B2">입장 ${x.visits}회</span></td><td class="${x.ok && !res.dailyBlocked.includes(x.c) ? 'ok' : 'no'}">${res.dailyBlocked.includes(x.c) ? '오늘은 다른 센터 설문을 이미 띄움 → 내일' : esc(WHY(x, S.cfg))}</td></tr>`).join('');
    h += `<div class="app-only"><div class="lb">회원</div>${segs('member', Object.entries(DEMO_MEMBERS).map(([k, m]) => [k, m.n]), S.member)}<div style="color:#A9A9B2;margin-top:4px">${esc(DEMO_MEMBERS[S.member].desc)}</div>`
      + `<div class="lb">지금 <span class="clk">${fmtAt(S.clock)}</span></div>${segs('clock', [['60', '+1시간'], ['1440', '+1일'], ['4320', '+3일'], ['43200', '+30일'], ['reset', '처음']], '')}`
      + `<div class="lb">입장 / 앱 열기</div><div class="seg"><select id="vc">${CENTERS.map((c) => `<option value="${c.id}">${esc(c.n)}</option>`).join('')}</select><button data-pg="visit" data-v="1">지금 입장</button><button data-pg="open" data-v="1">앱 열기</button></div>`
      + `<div class="lb">센터별 판정 (지금 앱을 열면)</div><table>${rows || '<tr><td>입장 기록 없음</td></tr>'}</table></div>`;
  }
  h += `<div class="log">${esc(S.log)}</div>`;
  $('#demo').innerHTML = h;
}
const PANEL = {
  view(v) { if (v === 'app') S.view = 'app'; else if (v === 'hq') { S.login = 'hq'; S.view = 'hq'; S.center = 'all'; } else { if (S.login === 'hq') S.login = 'c_ydp'; S.view = 'center'; } S.log = ''; render(); },
  login(v) { S.login = v; S.view = 'center'; S.cmMore = false; render(); },
  member(v) { S.member = v; S.screen = 'home'; openApp(); render(); },
  clock(v) {
    if (v === 'reset') { location.href = location.pathname; return; }
    S.clock = SV.fromMin(SV.toMin(S.clock) + +v); S.screen = 'home'; S.log = `시간 이동 → ${fmtAt(S.clock)} (앱은 닫힌 상태)`; render();
  },
  visit() { const c = $('#vc').value; S.st.visits.push({ m: S.member, c, at: S.clock }); S.screen = 'home'; S.log = `${CENTER(c).n} 입장 ${S.clock.slice(11)}`; render(); },
  open() { openApp(); render(); },
};
function render() { renderPanel(); if (S.view === 'app') renderApp(); else renderAdmin(); }
document.addEventListener('click', (e) => {
  const pg = e.target.closest('[data-pg]'); if (pg) { PANEL[pg.dataset.pg](pg.dataset.v); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.closest('#app')) APP[a.dataset.act] && APP[a.dataset.act](a);
  else if (a.closest('#adm')) ADM[a.dataset.act] && ADM[a.dataset.act](a);
});

// ── 바로 열기(캡처·외부 개발자 확인용): ?v=app&m=m_park · &step=part|full|comment|done · ?v=center&login=c_gn · ?v=hq · ?v=set
(function init() {
  if (S.view === 'hq' || S.view === 'set') S.login = 'hq';
  if (S.view === 'app') {
    openApp();
    const step = P.get('step');
    if (S.round && step) {
      const qs = qsOf(), sc = [5, 4, 4, 3, 5, 4, 5, 4];
      const k = step === 'part' ? 3 : qs.length;
      qs.slice(0, k).forEach((q, i) => { S.ans[q.id] = sc[i % sc.length]; });
      if (step === 'comment' || step === 'kbd' || step === 'done') S.comment = '저녁 7~9시엔 스쿼트 랙이 늘 차 있어서 기다리는 시간이 길어요. 랙을 하나만 더 놓아 주시면 좋겠어요!';
      if (step === 'done') { const r = SV.act(S.st, S.cfg, S.member, S.round.id, 'submit', S.clock, { scores: S.ans, comment: S.comment }); if (r.ok) S.screen = 'done'; }
    }
  }
  render();
  const step = P.get('step');
  if (S.view === 'app' && S.screen === 'survey' && step) {
    const sc = $('#svscr');
    if (step === 'part') { const e = $(`#q_${qsOf()[3].id}`); sc.scrollTop = e.offsetTop + e.offsetHeight - sc.clientHeight + 16; }
    if (step === 'full' || step === 'comment' || step === 'kbd') sc.scrollTop = sc.scrollHeight;
    if (step === 'kbd') { document.querySelector('#app').classList.add('kbd'); $('#cmt').focus(); }
  }
})();
