const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,state=E.createTournamentState();
const dates=[
  '2026-11-22','2026-11-24','2026-11-26','2026-11-29',
  '2026-12-01','2026-12-03','2026-12-06','2026-12-08',
  '2026-12-10','2026-12-13','2026-12-15','2026-12-17',
  '2026-12-20','2026-12-22','2026-12-24','2026-12-27',
  '2026-12-29','2026-12-31'
];
assert(E.validateState(state).valid);
assert.deepEqual([...new Set(state.matches.map(m=>m.date))],dates);
assert.equal(E.matchMinutes,40);
for(const [index,date] of dates.entries()){
  const matches=state.matches.filter(m=>m.date===date);
  assert.equal(matches.length,5);
  assert(matches.every(m=>m.group===(index%2?'B':'A')&&m.round===Math.floor(index/2)+1));
  assert.deepEqual(matches.map(m=>m.time),['18:00','18:40','19:20','20:00','20:40']);
  assert([0,2,4].includes(new Date(date+'T00:00:00Z').getUTCDay()));
  const starts=matches.map(m=>m.time.split(':').reduce((hour,minute)=>Number(hour)*60+Number(minute)));
  assert(starts.slice(1).every((start,i)=>start===starts[i]+E.matchMinutes));
  assert.equal(starts[4]+E.matchMinutes,21*60+20);
  // Guatemala debe mostrar el mismo día, sin desplazamientos por UTC.
  assert.equal(new Intl.DateTimeFormat('es-GT',{timeZone:'America/Guatemala',day:'numeric'}).format(new Date(date+'T12:00:00-06:00')),String(Number(date.slice(-2))));
}
assert.deepEqual(state.matches.filter(m=>m.round===1&&!m.played).map(m=>[m.homeId,m.awayId,m.date,m.time]),[
  ['juventud','halcones','2026-11-22','20:40'],['aguilas','independiente','2026-11-24','20:40']
]);
// Migrar las fechas no cambia marcadores, plantillas ni estadísticas individuales.
const old=E.createDemoState();delete old.scheduleVersion;
old.matches.forEach(m=>{m.date='2026-11-07';m.time='12:00';});
old.matches.reverse();
const original=structuredClone(old),upgraded=E.upgradeSchedule(old);
assert.deepEqual(old,original);
assert(E.validateState(upgraded).valid);
assert.equal(upgraded.teams,old.teams);assert.equal(upgraded.tournament,old.tournament);
assert.deepEqual([...new Set(upgraded.matches.map(m=>m.date))],dates);
for(const match of upgraded.matches){
  const previous=old.matches.find(m=>m.id===match.id);
  const {date,time,...details}=match,{date:oldDate,time:oldTime,...oldDetails}=previous;
  assert.deepEqual(details,oldDetails);
}
for(const calculate of [E.standings,E.scorers,E.discipline,E.goalkeepers])assert.deepEqual(calculate(upgraded),calculate(old));
assert.equal(E.upgradeSchedule(upgraded),upgraded);
// Las correcciones y reprogramaciones posteriores se conservan.
const edited=structuredClone(upgraded);edited.matches[0].date='2027-01-03';edited.matches[0].time='19:10';
assert.equal(E.upgradeSchedule(edited),edited);
assert.equal(E.upgradeSchedule(edited).matches[0].date,'2027-01-03');
assert.deepEqual(E.createTournamentState(),state);
console.log('PASS: 18 fechas alternadas desde el 22 de noviembre, 40 minutos sin cruces, pendientes y migración sin pérdida de resultados.');
