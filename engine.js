// 니짐내짐 입점센터 정기 만족도 설문 — 판정·기록·집계(서버가 할 일). 브라우저·node 양쪽에서 씀(참조구현).
// 시각은 'YYYY-MM-DD HH:MM'(한국 시간) 문자열. 계산은 분 단위 정수로 바꿔서 한다.
(function (root) {
  'use strict';
  const toMin = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13) || 0, +s.slice(14, 16) || 0) / 60000;
  const p2 = (n) => String(n).padStart(2, '0');
  const fromMin = (m) => { const d = new Date(m * 60000); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
  const day = (s) => s.slice(0, 10);
  const DAY = 1440;

  const DEFAULT_QUESTIONS = [
    { id: 'q_clean', label: '청결', text: '센터는 깨끗하게 관리되고 있나요?', scope: 'center' },
    { id: 'q_equip', label: '기구 구성', text: '운동 기구는 충분히 갖춰져 있나요?', scope: 'center' },
    { id: 'q_cond', label: '기구 상태', text: '고장 나거나 망가진 기구 없이 잘 관리되고 있나요?', scope: 'center' },
    { id: 'q_staff', label: '직원 친절', text: '직원과 트레이너는 친절했나요?', scope: 'center' },
    { id: 'q_manner', label: '회원 매너', text: '다른 회원들의 이용 매너는 어땠나요?', scope: 'center' },
    { id: 'q_workout', label: '운동 만족도', text: '이 센터에서의 운동, 전체적으로 만족스러웠나요?', scope: 'center' },
    { id: 'q_app', label: '앱 만족도', text: '니짐내짐 앱은 쓰기 편했나요?', scope: 'hq' },
    { id: 'q_rec', label: '추천 의향', text: '주변 사람에게 니짐내짐을 추천하고 싶으신가요?', scope: 'hq' },
  ];
  const DEFAULT_CFG = {
    enabled: true,
    minVisits: 3, // 이 센터 누적 입장 횟수
    cycleDays: 30, // 같은 센터 회차 시작 사이 간격
    snoozeDays: 3, // «다음에 하기» 후 다시 띄우기까지
    roundDays: 14, // 한 회차가 열려 있는 기간(지나면 응답 없이 닫힘)
    delayMin: 90, // 입장 후 이만큼 지나야 띄움(운동 중 방해 안 함)
    freshHours: 48, // 새 회차는 입장 후 이 시간 안에 앱을 열 때만(기억이 생생할 때)
    dailyMax: 1, // 회원 한 명에게 하루에 띄우는 센터 수
    commentMax: 300,
    questions: DEFAULT_QUESTIONS,
  };
  const LIMITS = { minVisits: [1, 50], cycleDays: [7, 365], snoozeDays: [1, 14], roundDays: [3, 60], delayMin: [0, 600], freshHours: [1, 168], commentMax: [50, 1000], questions: [1, 12], textLen: 40, labelLen: 10 };

  function validateCfg(cfg) {
    const e = {};
    for (const k of ['minVisits', 'cycleDays', 'snoozeDays', 'roundDays', 'delayMin', 'freshHours', 'commentMax']) {
      const v = cfg[k], [lo, hi] = LIMITS[k];
      if (!Number.isInteger(v) || v < lo || v > hi) e[k] = `${lo}~${hi} 사이 숫자로 넣어 주세요.`;
    }
    if (!e.roundDays && !e.cycleDays && cfg.roundDays >= cfg.cycleDays) e.roundDays = '다시 묻는 간격보다 짧아야 해요.';
    if (!e.snoozeDays && !e.roundDays && cfg.snoozeDays >= cfg.roundDays) e.snoozeDays = '설문이 열려 있는 기간보다 짧아야 해요.';
    const qs = cfg.questions || [];
    if (qs.length < LIMITS.questions[0]) e.questions = '질문은 1개 이상 있어야 해요.';
    if (qs.length > LIMITS.questions[1]) e.questions = `질문은 ${LIMITS.questions[1]}개까지 넣을 수 있어요.`;
    const labels = new Set();
    qs.forEach((q, i) => {
      const t = (q.text || '').trim(), l = (q.label || '').trim();
      if (!t) e[`q${i}text`] = '질문 문장을 넣어 주세요.'; else if (t.length > LIMITS.textLen) e[`q${i}text`] = `${LIMITS.textLen}자 안으로 줄여 주세요.`;
      if (!l) e[`q${i}label`] = '짧은 이름을 넣어 주세요.'; else if (l.length > LIMITS.labelLen) e[`q${i}label`] = `${LIMITS.labelLen}자 안으로 줄여 주세요.`;
      else if (labels.has(l)) e[`q${i}label`] = '같은 이름이 이미 있어요.';
      labels.add(l);
      if (q.scope !== 'center' && q.scope !== 'hq') e[`q${i}scope`] = '공개 범위를 골라 주세요.';
    });
    if (qs.length && !qs.some((q) => q.scope === 'center')) e.questions = '센터에 보이는 질문이 1개 이상 있어야 센터 화면이 비지 않아요.';
    return e;
  }

  function newState() { return { visits: [], rounds: [], responses: [], seq: 0 }; }

  // 회차 유효기간이 지난 열린 회차 닫기(서버 배치 또는 조회 시점)
  function expireRounds(st, cfg, now) {
    const n = toMin(now);
    st.rounds.forEach((r) => { if (r.status === 'open' && n >= toMin(r.startAt) + cfg.roundDays * DAY) { r.status = 'expired'; r.closedAt = fromMin(toMin(r.startAt) + cfg.roundDays * DAY); } });
  }

  // 센터별 판정 — 왜 뜨는지/안 뜨는지 이유까지(조작판·시험에서 그대로 보여 줌)
  function centerStatus(st, cfg, m, now) {
    const n = toMin(now);
    const centers = [...new Set(st.visits.filter((v) => v.m === m).map((v) => v.c))];
    return centers.map((c) => {
      const vs = st.visits.filter((v) => v.m === m && v.c === c && toMin(v.at) <= n).sort((a, b) => toMin(b.at) - toMin(a.at));
      const last = vs[0] ? vs[0].at : null, since = last ? n - toMin(last) : Infinity;
      const rs = st.rounds.filter((r) => r.m === m && r.c === c).sort((a, b) => toMin(b.startAt) - toMin(a.startAt));
      const open = rs.find((r) => r.status === 'open');
      const base = { c, visits: vs.length, lastVisit: last };
      if (!cfg.enabled) return { ...base, ok: false, why: 'off' };
      if (open) {
        if (open.snoozeUntil && n < toMin(open.snoozeUntil)) return { ...base, ok: false, why: 'snoozed', until: open.snoozeUntil, round: open.id };
        if (since < cfg.delayMin) return { ...base, ok: false, why: 'working', round: open.id };
        return { ...base, ok: true, kind: 'resume', round: open.id };
      }
      if (rs[0] && n < toMin(rs[0].startAt) + cfg.cycleDays * DAY) return { ...base, ok: false, why: 'cycle', until: fromMin(toMin(rs[0].startAt) + cfg.cycleDays * DAY), last: rs[0].status };
      if (vs.length < cfg.minVisits) return { ...base, ok: false, why: 'visits' };
      if (since < cfg.delayMin) return { ...base, ok: false, why: 'working' };
      if (since > cfg.freshHours * 60) return { ...base, ok: false, why: 'stale' };
      return { ...base, ok: true, kind: 'new' };
    });
  }

  // 앱을 열 때 띄울 설문 하나 고르기. 하루 제한: 오늘 이미 띄운 센터가 있으면 그 센터(아직 답 안 한 같은 회차)만 다시 가능
  function pick(st, cfg, m, now) {
    expireRounds(st, cfg, now);
    const list = centerStatus(st, cfg, m, now);
    const today = day(now);
    const shownToday = new Set(st.rounds.filter((r) => r.m === m && r.shows.some((s) => day(s) === today)).map((r) => r.c));
    const ok = list.filter((x) => x.ok).sort((a, b) => (a.lastVisit < b.lastVisit ? 1 : -1));
    const allowed = shownToday.size >= cfg.dailyMax ? ok.filter((x) => shownToday.has(x.c)) : ok;
    return { pick: allowed[0] || null, list, dailyBlocked: ok.filter((x) => !allowed.includes(x)).map((x) => x.c) };
  }

  function openApp(st, cfg, m, now) {
    const res = pick(st, cfg, m, now);
    if (!res.pick) return { round: null, ...res };
    let r;
    if (res.pick.kind === 'new') {
      r = { id: `r${++st.seq}`, m, c: res.pick.c, startAt: now, status: 'open', snoozeUntil: null, shows: [], closedAt: null,
        qsnap: cfg.questions.map((q) => ({ id: q.id, label: q.label, text: q.text, scope: q.scope })) };
      st.rounds.push(r);
    } else r = st.rounds.find((x) => x.id === res.pick.round);
    r.shows.push(now);
    return { round: r, ...res };
  }

  const cleanText = (s) => String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  // 회원 버튼: later(다음에 하기)·decline(참여 안 함)·submit(제출)
  function act(st, cfg, m, roundId, action, now, body) {
    expireRounds(st, cfg, now);
    const r = st.rounds.find((x) => x.id === roundId);
    if (!r || r.m !== m) return { ok: false, code: 404, err: '설문을 찾을 수 없어요.' };
    if (r.status !== 'open') return { ok: false, code: 409, err: '이미 끝난 설문이에요.' };
    if (action === 'later') { r.snoozeUntil = fromMin(toMin(now) + cfg.snoozeDays * DAY); return { ok: true, round: r }; }
    if (action === 'decline') { r.status = 'declined'; r.closedAt = now; return { ok: true, round: r }; }
    if (action !== 'submit') return { ok: false, code: 400, err: '알 수 없는 동작이에요.' };
    const scores = {}, sc = (body && body.scores) || {};
    for (const q of r.qsnap) {
      const v = sc[q.id];
      if (!Number.isInteger(v) || v < 1 || v > 5) return { ok: false, code: 400, err: `«${q.label}» 별점을 골라 주세요.` };
      scores[q.id] = v;
    }
    const comment = cleanText(body && body.comment);
    if ([...comment].length > cfg.commentMax) return { ok: false, code: 400, err: `의견은 ${cfg.commentMax}자까지 쓸 수 있어요.` };
    r.status = 'submitted'; r.closedAt = now;
    const resp = { id: `a${++st.seq}`, round: r.id, m, c: r.c, at: now, scores, comment, qsnap: r.qsnap };
    st.responses.push(resp);
    return { ok: true, round: r, response: resp };
  }

  // ───── 집계(관리자 API). 센터 관리자는 서버에서 자기 센터·센터 공개 질문·익명으로 잘라서 내려준다.
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
  const maskPhoneInText = (s) => s.replace(/(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g, '$1-****-****');
  const ym = (s) => s.slice(0, 7);
  function monthsBack(to, k) {
    const out = []; let y = +to.slice(0, 4), mo = +to.slice(5, 7);
    for (let i = 0; i < k; i++) { out.unshift(`${y}-${p2(mo)}`); mo--; if (!mo) { mo = 12; y--; } }
    return out;
  }
  // 질문 목록: 지금 설정 순서 + (기간 안 응답에만 있는) 삭제된 질문은 뒤에
  function questionList(cfg, resps, hq) {
    const cur = cfg.questions.map((q) => ({ id: q.id, label: q.label, scope: q.scope, deleted: false }));
    const seen = new Set(cur.map((q) => q.id));
    resps.forEach((a) => a.qsnap.forEach((q) => { if (!seen.has(q.id)) { seen.add(q.id); cur.push({ id: q.id, label: q.label, scope: q.scope, deleted: true }); } }));
    return cur.filter((q) => hq || q.scope === 'center');
  }
  function summarize(resps, rounds, qs) {
    const centerQ = qs.filter((q) => q.scope === 'center').map((q) => q.id);
    const perQ = qs.map((q) => {
      const v = resps.map((a) => a.scores[q.id]).filter((x) => x != null);
      const dist = [1, 2, 3, 4, 5].map((k) => v.filter((x) => x === k).length);
      return { id: q.id, label: q.label, scope: q.scope, deleted: q.deleted, n: v.length, avg: round1(avg(v)), dist };
    });
    const centerScores = resps.flatMap((a) => centerQ.map((id) => a.scores[id]).filter((x) => x != null));
    const sub = rounds.filter((r) => r.status === 'submitted').length;
    const low = perQ.filter((q) => q.scope === 'center' && q.n).sort((a, b) => a.avg - b.avg)[0] || null;
    return {
      n: resps.length, shown: rounds.length, submitted: sub, declined: rounds.filter((r) => r.status === 'declined').length,
      open: rounds.filter((r) => r.status === 'open').length, expired: rounds.filter((r) => r.status === 'expired').length,
      rate: rounds.length ? Math.round((sub / rounds.length) * 100) : null, avg: round1(avg(centerScores)), perQ, low,
      comments: resps.filter((a) => a.comment).length,
    };
  }
  function reportApi(st, cfg, centers, session, q) {
    expireRounds(st, cfg, q.now);
    const hq = session.role === 'hq';
    const all = centers.map((c) => c.id);
    const scope = hq ? (q.center && q.center !== 'all' && all.includes(q.center) ? [q.center] : all) : [session.center];
    const inR = (s) => day(s) >= q.from && day(s) <= q.to;
    const resps = st.responses.filter((a) => scope.includes(a.c) && inR(a.at)).sort((a, b) => (a.at < b.at ? 1 : -1));
    const rounds = st.rounds.filter((r) => scope.includes(r.c) && inR(r.startAt));
    const qs = questionList(cfg, resps, hq);
    const out = { scope, questions: qs, sum: summarize(resps, rounds, qs) };
    // 월별 추이: 기간 끝 달까지 6개월(기간 필터와 별개)
    const months = monthsBack(q.to, 6);
    out.trend = months.map((mo) => {
      const ra = st.responses.filter((a) => scope.includes(a.c) && ym(a.at) === mo && a.at.slice(0, 10) <= q.now.slice(0, 10));
      const rr = st.rounds.filter((r) => scope.includes(r.c) && ym(r.startAt) === mo);
      const s = summarize(ra, rr, qs);
      return { month: mo, n: s.n, rate: s.rate, avg: s.avg, perQ: Object.fromEntries(s.perQ.map((x) => [x.id, x.avg])) };
    });
    if (hq) {
      out.rows = resps.map((a) => ({ id: a.id, c: a.c, m: a.m, at: a.at, scores: a.scores, comment: a.comment }));
      out.byCenter = all.map((id) => {
        const ra = st.responses.filter((a) => a.c === id && inR(a.at)), rr = st.rounds.filter((r) => r.c === id && inR(r.startAt));
        return { id, sum: summarize(ra, rr, qs) };
      });
    } else {
      // 익명: 회원 id·이름·연락처·시각 없음, 날짜만. 본사 전용 질문 점수는 아예 안 내려줌
      out.comments = resps.filter((a) => a.comment).map((a) => ({ date: day(a.at), text: maskPhoneInText(a.comment),
        avg: round1(avg(qs.filter((x) => x.scope === 'center').map((x) => a.scores[x.id]).filter((x) => x != null))) }));
    }
    return out;
  }

  const api = { toMin, fromMin, day, DEFAULT_CFG, DEFAULT_QUESTIONS, LIMITS, validateCfg, newState, expireRounds, centerStatus, pick, openApp, act, reportApi, monthsBack, maskPhoneInText, cleanText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SV = api;
})(typeof window !== 'undefined' ? window : globalThis);
