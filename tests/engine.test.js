// node tests/engine.test.js  → 주기·대상·제출 검증·권한 시험. 결과 표를 tests/result.md 로도 남김.
'use strict';
const SV = require('../engine.js');
const fs = require('fs');
const rows = [];
let fail = 0;
function t(id, what, cond, expect, got) {
  const ok = !!cond; if (!ok) fail++;
  rows.push(`| ${id} | ${what} | ${expect} | ${got} | ${ok ? '✅' : '❌'} |`);
}
const cfg0 = () => JSON.parse(JSON.stringify(SV.DEFAULT_CFG));
const add = (min, s) => SV.fromMin(SV.toMin(s) + min);
const D = 1440;
const visit = (st, m, c, at) => st.visits.push({ m, c, at });
const open = (st, cfg, m, now) => { const r = SV.openApp(st, cfg, m, now); return r.round ? r.round.c : null; };
const answers = (cfg) => Object.fromEntries(cfg.questions.map((q) => [q.id, 4]));
const show = (x) => x || '안 뜸';

// ── 1. 입장 횟수
{
  const cfg = cfg0(), st = SV.newState();
  visit(st, 'A', 'c1', '2026-11-01 19:00'); visit(st, 'A', 'c1', '2026-11-03 19:00');
  t('T01', '입장 2회 회원 · 입장 2시간 뒤 앱 열기', open(st, cfg, 'A', '2026-11-03 21:00') === null, '안 뜸', show(open(st, cfg, 'A', '2026-11-03 21:00')));
  visit(st, 'A', 'c1', '2026-11-05 19:00');
  const g1 = open(st, cfg, 'A', '2026-11-05 19:30');
  t('T02', '3회째 입장 30분 뒤(운동 중) 앱 열기', g1 === null, '안 뜸', show(g1));
  const g2 = open(st, cfg, 'A', '2026-11-05 20:30');
  t('T03', '3회째 입장 90분 뒤 앱 열기', g2 === 'c1', 'c1 뜸', show(g2));
}
{
  const cfg = cfg0(), st = SV.newState();
  ['2026-11-01', '2026-11-02', '2026-11-03'].forEach((d) => visit(st, 'A', 'c1', `${d} 07:00`));
  const g = open(st, cfg, 'A', '2026-11-06 07:00');
  t('T04', '3회째 입장 후 72시간 지나 앱 열기(48시간 넘음)', g === null, '안 뜸(다음 입장 기다림)', show(g));
  visit(st, 'A', 'c1', '2026-11-07 07:00');
  const g2 = open(st, cfg, 'A', '2026-11-07 12:00');
  t('T05', '이어서 4회째 입장 5시간 뒤 앱 열기', g2 === 'c1', 'c1 뜸', show(g2));
}
// ── 2. 30일 주기 (제출)
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) visit(st, 'A', 'c1', `2026-10-0${i + 1} 19:00`);
  const r = SV.openApp(st, cfg, 'A', '2026-10-03 21:00').round;
  SV.act(st, cfg, 'A', r.id, 'submit', '2026-10-03 21:01', { scores: answers(cfg), comment: '좋아요' });
  const res = [];
  for (const [dd, lab] of [[1, '1일'], [10, '10일'], [29, '29일']]) {
    const at = add(dd * D, '2026-10-03 19:00'); visit(st, 'A', 'c1', at);
    res.push(open(st, cfg, 'A', add(120, at)));
  }
  t('T06', '제출 후 1·10·29일 뒤 다시 입장하고 앱 열기', res.every((x) => x === null), '3번 다 안 뜸', res.map(show).join(' / '));
  const at = add(30 * D, '2026-10-03 19:00'); visit(st, 'A', 'c1', at);
  const g = open(st, cfg, 'A', add(120, at));
  t('T07', '첫 회차 시작 30일 뒤 입장하고 앱 열기', g === 'c1', 'c1 뜸(새 회차)', show(g));
  t('T08', '같은 회차 두 번 제출 막기', SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-05 10:00', { scores: answers(cfg) }).code === 409, '409 거절', SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-05 10:00', { scores: answers(cfg) }).code);
}
// ── 3. 다음에 하기 3일
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) visit(st, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const r = SV.openApp(st, cfg, 'A', '2026-11-03 21:00').round;
  SV.act(st, cfg, 'A', r.id, 'later', '2026-11-03 21:00');
  const a = open(st, cfg, 'A', '2026-11-03 22:00'), b = open(st, cfg, 'A', '2026-11-05 09:00'), c = open(st, cfg, 'A', '2026-11-06 20:59');
  t('T09', '«다음에 하기» 뒤 1시간·1.5일·3일 1분 전 앱 열기', !a && !b && !c, '3번 다 안 뜸', [a, b, c].map(show).join(' / '));
  const d = SV.openApp(st, cfg, 'A', '2026-11-06 21:00');
  t('T10', '«다음에 하기» 3일 뒤 앱 열기(그 사이 입장 없음)', d.round && d.round.id === r.id, '같은 회차 다시 뜸', d.round ? `${d.round.c} 같은 회차=${d.round.id === r.id}` : '안 뜸');
  SV.act(st, cfg, 'A', r.id, 'later', '2026-11-06 21:00');
  const e = open(st, cfg, 'A', '2026-11-09 21:00');
  SV.act(st, cfg, 'A', r.id, 'later', '2026-11-09 21:00');
  const f = open(st, cfg, 'A', '2026-11-12 21:00'); // 9일째
  SV.act(st, cfg, 'A', r.id, 'later', '2026-11-12 21:00');
  const g = open(st, cfg, 'A', '2026-11-17 21:00'); // 14일 지남
  t('T11', '«다음에 하기» 계속 → 회차 시작 14일 지나면 닫힘', e === 'c1' && f === 'c1' && g === null && r.status === 'expired', '6일·9일 뜸, 14일 뒤 안 뜸(만료)', `${show(e)} / ${show(f)} / ${show(g)} · 상태=${r.status}`);
  visit(st, 'A', 'c1', '2026-12-04 18:00');
  const h = open(st, cfg, 'A', '2026-12-04 20:00');
  t('T12', '만료 회차 시작 30일 뒤 입장하고 앱 열기', h === 'c1', 'c1 뜸(새 회차)', show(h));
}
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) visit(st, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const r = SV.openApp(st, cfg, 'A', '2026-11-03 21:00').round;
  SV.act(st, cfg, 'A', r.id, 'later', '2026-11-03 21:00');
  visit(st, 'A', 'c1', '2026-11-06 20:00');
  const a = open(st, cfg, 'A', '2026-11-06 21:00');
  t('T13', '«다음에 하기» 3일 뒤인데 방금 입장(60분, 운동 중)', a === null, '안 뜸', show(a));
  const b = open(st, cfg, 'A', '2026-11-06 21:30');
  t('T14', '같은 날 입장 90분 지나 앱 열기', b === 'c1', 'c1 뜸', show(b));
}
// ── 4. 참여 안 함
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) visit(st, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const r = SV.openApp(st, cfg, 'A', '2026-11-03 21:00').round;
  SV.act(st, cfg, 'A', r.id, 'decline', '2026-11-03 21:00');
  const a = open(st, cfg, 'A', '2026-11-03 21:05');
  visit(st, 'A', 'c1', '2026-11-06 19:00'); const b = open(st, cfg, 'A', '2026-11-06 21:00');
  visit(st, 'A', 'c1', '2026-12-02 19:00'); const c = open(st, cfg, 'A', '2026-12-02 21:00');
  t('T15', '«참여 안 함» 뒤 바로·3일 뒤·29일 뒤(입장 후)', !a && !b && !c && r.status === 'declined', '3번 다 안 뜸', [a, b, c].map(show).join(' / '));
  visit(st, 'A', 'c1', '2026-12-03 19:00'); const d = open(st, cfg, 'A', '2026-12-03 21:00');
  t('T16', '«참여 안 함» 회차 시작 30일 뒤 입장하고 앱 열기', d === 'c1', 'c1 뜸(다음 주기)', show(d));
}
// ── 5. 하루 1개
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) { visit(st, 'B', 'c1', `2026-11-0${i + 1} 07:00`); visit(st, 'B', 'c2', `2026-11-0${i + 1} 19:00`); }
  const r1 = SV.openApp(st, cfg, 'B', '2026-11-03 21:00');
  t('T17', '두 센터 모두 대상 · 앱 열기', r1.round && r1.round.c === 'c2', '최근 입장한 c2 하나만', r1.round ? r1.round.c : '안 뜸');
  SV.act(st, cfg, 'B', r1.round.id, 'submit', '2026-11-03 21:01', { scores: answers(cfg) });
  const b = open(st, cfg, 'B', '2026-11-03 22:00');
  t('T18', '같은 날 c2 제출 후 다시 앱 열기', b === null, '안 뜸(c1은 내일)', show(b));
  visit(st, 'B', 'c1', '2026-11-04 07:00');
  const c = open(st, cfg, 'B', '2026-11-04 09:00');
  t('T19', '다음 날 c1 입장 후 앱 열기', c === 'c1', 'c1 뜸', show(c));
}
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) { visit(st, 'B', 'c1', `2026-11-0${i + 1} 07:00`); visit(st, 'B', 'c2', `2026-11-0${i + 1} 19:00`); }
  const r1 = SV.openApp(st, cfg, 'B', '2026-11-03 21:00').round;
  const again = SV.openApp(st, cfg, 'B', '2026-11-03 21:30').round; // 버튼 안 누르고 앱 껐다 켬
  t('T20', '버튼 안 누르고 앱 다시 열기(같은 날)', again && again.id === r1.id, '같은 c2 회차 다시(새 센터 아님)', again ? `${again.c} 같은 회차=${again.id === r1.id}` : '안 뜸');
  SV.act(st, cfg, 'B', r1.id, 'later', '2026-11-03 21:31');
  const c = open(st, cfg, 'B', '2026-11-03 22:00');
  t('T21', 'c2 «다음에 하기» 직후 같은 날 앱 열기', c === null, '안 뜸(c1도 오늘은 X)', show(c));
}
// ── 6. 설정 반영
{
  const cfg = cfg0(), st = SV.newState(); cfg.minVisits = 5;
  for (let i = 0; i < 4; i++) visit(st, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const a = open(st, cfg, 'A', '2026-11-04 21:00');
  visit(st, 'A', 'c1', '2026-11-05 19:00'); const b = open(st, cfg, 'A', '2026-11-05 21:00');
  t('T22', '최소 입장 5회로 바꿈 → 4회·5회', !a && b === 'c1', '4회 안 뜸 · 5회 뜸', `${show(a)} / ${show(b)}`);
  const cfg2 = cfg0(); cfg2.enabled = false; const st2 = SV.newState();
  for (let i = 0; i < 3; i++) visit(st2, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const c = open(st2, cfg2, 'A', '2026-11-03 21:00');
  t('T23', '기능 끔', c === null, '안 뜸', show(c));
  const bad = SV.validateCfg({ ...cfg0(), cycleDays: 10, roundDays: 14, questions: [] });
  t('T24', '설정 검사(간격 10일<유효기간 14일, 질문 0개)', bad.roundDays && bad.questions, '저장 막힘', Object.keys(bad).join(','));
  const ok = SV.validateCfg(cfg0());
  t('T25', '기본 설정 검사', Object.keys(ok).length === 0, '오류 없음', Object.keys(ok).length + '건');
}
// ── 7. 제출 검사
{
  const cfg = cfg0(), st = SV.newState();
  for (let i = 0; i < 3; i++) visit(st, 'A', 'c1', `2026-11-0${i + 1} 19:00`);
  const r = SV.openApp(st, cfg, 'A', '2026-11-03 21:00').round;
  const sc = answers(cfg); delete sc.q_rec;
  const a = SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-03 21:01', { scores: sc });
  t('T26', '별 하나 빠뜨리고 제출', a.code === 400, '400 거절', `${a.code} ${a.err}`);
  const b = SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-03 21:01', { scores: { ...answers(cfg), q_clean: 6 } });
  t('T27', '별 6점 보냄(조작)', b.code === 400, '400 거절', b.code);
  const c = SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-03 21:01', { scores: answers(cfg), comment: '가'.repeat(301) });
  t('T28', '의견 301자', c.code === 400, '400 거절', c.code);
  const d = SV.act(st, cfg, 'X', r.id, 'submit', '2026-11-03 21:01', { scores: answers(cfg) });
  t('T29', '다른 회원이 이 회차로 제출', d.code === 404, '404 거절', d.code);
  const e = SV.act(st, cfg, 'A', r.id, 'submit', '2026-11-03 21:01', { scores: answers(cfg), comment: '가'.repeat(300) });
  t('T30', '의견 300자 정상 제출', e.ok, '저장', e.ok ? '저장' : e.err);
}
// ── 8. 관리자 집계 권한
{
  const cfg = cfg0(), st = SV.newState();
  const centers = [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
  const mk = (m, c, at, v, comment) => {
    for (let i = 0; i < 3; i++) visit(st, m, c, add(-(i + 1) * D, at));
    const r = SV.openApp(st, cfg, m, add(-1 * D + 120, at)).round || SV.openApp(st, cfg, m, at).round;
    SV.act(st, cfg, m, r.id, 'submit', at, { scores: Object.fromEntries(cfg.questions.map((q) => [q.id, v])), comment });
  };
  mk('A', 'c1', '2026-11-10 21:00', 5, '샤워실 좋아요 010-1234-5678 로 연락주세요');
  mk('B', 'c2', '2026-11-11 21:00', 2, '기구 고장');
  const q = { from: '2026-11-01', to: '2026-11-30', now: '2026-11-26 21:00' };
  const ca = SV.reportApi(st, cfg, centers, { role: 'center', center: 'c1' }, { ...q, center: 'c2' });
  t('T31', 'c1 관리자가 c2를 요청', ca.scope.join() === 'c1' && ca.sum.n === 1, 'c1 것만(1건)', `${ca.scope.join()} ${ca.sum.n}건`);
  const ids = ca.questions.map((x) => x.id);
  t('T32', '센터 응답에 앱·추천 질문', !ids.includes('q_app') && !ids.includes('q_rec') && !JSON.stringify(ca).includes('q_app'), '없음', ids.join(','));
  const raw = JSON.stringify(ca);
  t('T33', '센터 응답에 회원 id·이름·연락처·시각', !('rows' in ca) && !raw.includes('"m"') && !raw.includes('21:00",') && !raw.includes('5678'), '없음(날짜만, 의견 속 번호 가림)', ca.comments.map((c) => `${c.date} ${c.text}`).join(' | '));
  const z = SV.reportApi(st, cfg, centers, { role: 'center', center: 'c3' }, q);
  t('T34', '응답 0건 센터', z.sum.n === 0 && z.sum.avg === null && z.sum.rate === null && z.comments.length === 0, '0건·평균 없음·응답률 없음', `${z.sum.n}건 평균=${z.sum.avg} 응답률=${z.sum.rate}`);
  const h = SV.reportApi(st, cfg, centers, { role: 'hq' }, { ...q, center: 'all' });
  t('T35', '본사 전체', h.sum.n === 2 && h.rows.length === 2 && h.questions.some((x) => x.id === 'q_rec'), '2건·명단·앱/추천 포함', `${h.sum.n}건 명단 ${h.rows.length}`);
  cfg.questions = cfg.questions.filter((x) => x.id !== 'q_manner');
  const h2 = SV.reportApi(st, cfg, centers, { role: 'hq' }, { ...q, center: 'all' });
  const del = h2.questions.find((x) => x.id === 'q_manner');
  t('T36', '질문 삭제 뒤 옛 응답', del && del.deleted && h2.sum.perQ.find((x) => x.id === 'q_manner').n === 2, '삭제된 질문으로 뒤에 남음', del ? `deleted=${del.deleted}` : '없음');
}

const md = ['| 번호 | 조건 | 기대 | 결과 | 판정 |', '|---|---|---|---|---|', ...rows].join('\n');
fs.writeFileSync(__dirname + '/result.md', `# 판정 시험 결과 (${rows.length - fail}/${rows.length} 통과)\n\n${md}\n`);
console.log(md);
console.log(`\n${rows.length - fail}/${rows.length} 통과`);
process.exit(fail ? 1 : 0);
