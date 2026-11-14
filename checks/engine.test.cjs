const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,demo=E.createDemoState(),blank=E.createBlankState();
assert.deepEqual(E.validateState(demo),{valid:true,errors:[]});
assert.deepEqual(E.validateState(blank),{valid:true,errors:[]});
assert.equal(demo.teams.length,20);assert.equal(demo.matches.length,90);
assert.equal(new Set(demo.matches.map(m=>[m.homeId,m.awayId].sort().join('|'))).size,90);
assert.equal(demo.matches.filter(m=>m.played).length,40);
for(const group of ['A','B']){
  const rows=E.standings(demo,group);assert.equal(rows.length,10);
  assert(rows.every(r=>r.p===4&&r.p===r.w+r.d+r.l&&r.pts===3*r.w+r.d));
  assert.equal(rows.reduce((a,r)=>a+r.gf,0),rows.reduce((a,r)=>a+r.ga,0));
  for(let round=1;round<=9;round++){
    const matches=demo.matches.filter(m=>m.group===group&&m.round===round);
    assert.equal(matches.length,5);assert.equal(new Set(matches.flatMap(m=>[m.homeId,m.awayId])).size,10);
  }
}
const goals=demo.matches.filter(m=>m.played).reduce((a,m)=>a+m.homeScore+m.awayScore,0);
assert.equal(E.scorers(demo).reduce((a,r)=>a+r.goals,0),goals);
assert.equal(E.goalkeepers(demo).reduce((a,r)=>a+r.conceded,0),goals);
assert.equal(E.goalkeepers(demo).reduce((a,r)=>a+r.played,0),80);
assert.equal(E.scorers(blank).length,0);assert.equal(E.goalkeepers(blank).length,0);
// Empate sin goles, edición y retirada del resultado.
const match=blank.matches[0];Object.assign(match,{played:true,homeScore:0,awayScore:0});
assert(E.validateState(blank).valid);assert.equal(E.goalkeepers(blank).filter(r=>r.cleanSheets===1).length,2);
assert.equal(E.standings(blank,match.group).filter(r=>r.pts===1).length,2);
const scorer=blank.teams.find(t=>t.id===match.homeId).players[1];
Object.assign(match,{homeScore:2,awayScore:0,events:[{playerId:scorer.id,goals:2,yellow:1,red:0}]});
assert(E.validateState(blank).valid);assert.equal(E.scorers(blank)[0].goals,2);
assert.equal(E.standings(blank,match.group).find(r=>r.team.id===match.homeId).pts,3);
match.homeScore=1;match.events[0].goals=1;
assert.equal(E.scorers(blank)[0].goals,1);assert.equal(E.discipline(blank)[0].yellow,1);
match.homeScore=2;assert.equal(E.validateState(blank).valid,false);
Object.assign(match,{played:false,homeScore:null,awayScore:null,events:[]});
assert(E.validateState(blank).valid);assert.equal(E.goalkeepers(blank).length,0);assert.equal(E.scorers(blank).length,0);
for(const mutate of [s=>s.teams[0].group='B',s=>s.matches[0].awayId=s.matches[0].homeId,s=>s.matches[0].homeKeeperId=s.teams[0].players[1].id,s=>s.teams[0].players[1].number=1,s=>s.matches[0].date='2026-02-30']){
  const invalid=structuredClone(demo);mutate(invalid);assert.equal(E.validateState(invalid).valid,false);
}
assert.deepEqual(E.createDemoState(),demo);
console.log('PASS: 90 cruces, 9 jornadas, grupos, puntos, goles, porteros, edición y validación de importaciones.');
