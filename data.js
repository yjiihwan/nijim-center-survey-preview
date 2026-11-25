// 더미 데이터(시안 전용). 실제 회원·센터 아님.
'use strict';
const CENTERS = [
  { id: 'c_ydp', n: '엔짐 영등포점', admin: '박지훈' },
  { id: 'c_gn', n: '바디웍스 강남역점', admin: '김도희' },
  { id: 'c_long', n: '니짐핏 크로스핏&필라테스 서울숲 성수역 2번 출구점', admin: '최유진' },
  { id: 'c_ss', n: '핏플레이스 성수점', admin: '이수민' },
];
const CLOCK0 = '2026-11-26 21:10'; // 시안의 «지금»
const DEMO_MEMBERS = {
  m_kim: { n: '김하늘', ph: '010-2481-3307', desc: '영등포점 4회 · 오늘 19:20 입장' },
  m_lee: { n: '이도윤', ph: '010-7720-1185', desc: '영등포점 2회 · 오늘 19:00 입장' },
  m_park: { n: '박서연', ph: '010-5133-9042', desc: '영등포점·성수역 2번 출구점 각 3회 · 오늘 둘 다 입장' },
};
const DEMO_VISITS = [
  ['m_kim', 'c_ydp', '2026-11-10 19:05'], ['m_kim', 'c_ydp', '2026-11-14 18:40'], ['m_kim', 'c_ydp', '2026-11-19 20:10'], ['m_kim', 'c_ydp', '2026-11-26 19:20'],
  ['m_lee', 'c_ydp', '2026-11-20 19:00'], ['m_lee', 'c_ydp', '2026-11-26 19:00'],
  ['m_park', 'c_ydp', '2026-11-12 07:00'], ['m_park', 'c_ydp', '2026-11-19 07:10'], ['m_park', 'c_ydp', '2026-11-26 07:05'],
  ['m_park', 'c_long', '2026-11-13 19:00'], ['m_park', 'c_long', '2026-11-20 19:30'], ['m_park', 'c_long', '2026-11-26 18:50'],
];

// 지난 6개월 응답(고정 난수라 매번 같은 값)
function seedHistory(SV) {
  let x = 20261126;
  const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  const FAM = '김이박최정강조윤장임한오서신권황안송류홍', GIV = ['민준', '서연', '지호', '하은', '도현', '수아', '예준', '지민', '시우', '채원', '주원', '다은', '건우', '서윤', '현우', '유나', '태윤', '소율', '준서', '가은'];
  const members = {};
  const mean = {
    c_ydp: { q_clean: 4.4, q_equip: 4.1, q_cond: 3.5, q_staff: 4.6, q_manner: 3.9, q_workout: 4.3, q_app: 4.2, q_rec: 4.0 },
    c_gn: { q_clean: 3.3, q_equip: 4.4, q_cond: 4.2, q_staff: 3.8, q_manner: 3.4, q_workout: 3.9, q_app: 3.9, q_rec: 3.6 },
    c_long: { q_clean: 4.7, q_equip: 3.6, q_cond: 4.5, q_staff: 4.8, q_manner: 4.6, q_workout: 4.6, q_app: 4.3, q_rec: 4.5 },
  };
  const CMT = {
    c_ydp: ['스쿼트 랙 하나가 계속 고장 나 있어요. 빨리 고쳐 주세요.', '트레이너 선생님들이 먼저 인사해 주셔서 좋아요.', '저녁 7~9시엔 사람이 너무 많아서 기구 기다리는 시간이 길어요.', '덤벨 제자리에 안 두는 분들이 많아요. 안내문이라도 붙여 주세요.', '샤워실 수압이 약해요.', '전반적으로 만족합니다!', '러닝머신 벨트 소리가 커요.'],
    c_gn: ['탈의실 바닥이 늘 젖어 있어요. 청소 좀 더 자주 해 주세요.', '기구 종류는 강남에서 제일 많은 것 같아요.', '음악 소리가 너무 커서 이어폰을 껴도 들려요.', '카운터 직원분이 불친절했어요.', '수건이 자주 떨어져 있어요.', '머신 위에서 휴대폰만 보는 분들 때문에 기다려요.'],
    c_long: ['수업 분위기 최고예요.', '바벨 원판이 좀 더 있으면 좋겠어요.', '코치님들이 자세를 꼼꼼히 봐 주세요.', '주차가 불편해요.'],
  };
  const vol = { c_ydp: 15, c_gn: 11, c_long: 6 };
  const st = SV.newState();
  const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const qsnap = SV.DEFAULT_QUESTIONS.map((q) => ({ ...q }));
  let mi = 0;
  for (const c of Object.keys(vol)) {
    months.forEach((mo, k) => {
      const n = Math.round(vol[c] * (0.75 + rnd() * 0.5));
      const lastDay = mo === '2026-11' ? 25 : 28;
      for (let i = 0; i < n; i++) {
        const id = `s${++mi}`;
        members[id] = { n: FAM[Math.floor(rnd() * FAM.length)] + GIV[Math.floor(rnd() * GIV.length)], ph: `010-${String(2000 + Math.floor(rnd() * 7999))}-${String(1000 + Math.floor(rnd() * 8999))}` };
        const d = 1 + Math.floor(rnd() * lastDay), h = 7 + Math.floor(rnd() * 15), mm = Math.floor(rnd() * 60);
        const startAt = `${mo}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        const r = { id: `h${mi}`, m: id, c, startAt, status: 'open', snoozeUntil: null, shows: [startAt], closedAt: null, qsnap };
        const p = rnd();
        const lateOpen = mo === '2026-11' && d >= 20;
        if (p < 0.7 || (p < 0.8 && !lateOpen)) {
          const at = SV.fromMin(SV.toMin(startAt) + (p < 0.6 ? 1 : 3 * 1440 + 2));
          if (at.slice(0, 10) > '2026-11-26') continue;
          r.status = 'submitted'; r.closedAt = at;
          const drift = (k - 3) * 0.06; // 달마다 조금씩 오르내림
          const scores = Object.fromEntries(qsnap.map((q) => [q.id, Math.max(1, Math.min(5, Math.round(mean[c][q.id] + drift + (rnd() - 0.5) * 2.2)))]));
          const comment = rnd() < 0.38 ? CMT[c][Math.floor(rnd() * CMT[c].length)] : '';
          st.responses.push({ id: `ha${mi}`, round: r.id, m: id, c, at, scores, comment, qsnap });
        } else if (p < 0.9) { r.status = 'declined'; r.closedAt = startAt; }
        else if (!lateOpen) { r.status = 'expired'; r.closedAt = SV.fromMin(SV.toMin(startAt) + 14 * 1440); }
        st.rounds.push(r);
      }
    });
  }
  return { st, members };
}
