const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,state=E.createTournamentState();
const pair=m=>[m.homeId,m.awayId].sort().join('|');
const second=state.matches.filter(m=>m.group==='A'&&m.round===2).sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(second.map(m=>[m.homeId,m.awayId,m.date]),[
  ['norte','aurora','2026-11-26'],
  ['san-jose','estrella','2026-11-26'],
  ['esperanza','pinos','2026-11-26'],
  ['central','halcones','2026-11-26'],
  ['juventud','valle','2026-11-26']
]);
assert.equal(second[2].time,'19:20');
assert(E.validateState(state).valid);
for(const group of ['A','B']){
  assert.equal(new Set(state.matches.filter(m=>m.group===group).map(pair)).size,45);
  for(let round=1;round<=9;round++){
    const matches=state.matches.filter(m=>m.group===group&&m.round===round);
    assert.equal(matches.length,5);
    assert.equal(new Set(matches.flatMap(m=>[m.homeId,m.awayId])).size,10);
  }
}
// Reconstruye la rotación anterior; los IDs identificaban posiciones del calendario.
const legacy=E.createTournamentState();delete legacy.pairingsVersion;
let rotation=['aurora','esperanza','central','pinos','juventud','halcones','valle','estrella','norte','san-jose'];
for(let round=1;round<=9;round++){
  if(round>1)for(let slot=0;slot<5;slot++){
    let homeId=rotation[slot],awayId=rotation[9-slot];
    if((round+slot)%2===0)[homeId,awayId]=[awayId,homeId];
    Object.assign(legacy.matches.find(m=>m.id===`m-a-${round}-${slot+1}`),{homeId,awayId});
  }
  rotation=[rotation[0],rotation[9],...rotation.slice(1,-1)];
}
assert(E.validateState(legacy).valid);
const recorded=legacy.matches.find(m=>m.homeId==='pinos'&&m.awayId==='esperanza');
assert.equal(recorded.round,8);
Object.assign(recorded,{played:true,homeScore:2,awayScore:1,venue:'Cancha confirmada',
  homeKeeperId:'pinos-p1',awayKeeperId:'esperanza-p1',events:[
    {playerId:'pinos-p2',goals:2,yellow:1,red:0},
    {playerId:'esperanza-p2',goals:1,yellow:0,red:1}
  ]});
const original=structuredClone(legacy),updated=E.upgradePairings(legacy);
assert.deepEqual(legacy,original);assert(E.validateState(updated).valid);
assert.equal(updated.teams,legacy.teams);assert.equal(updated.tournament,legacy.tournament);
assert.deepEqual(updated.matches.filter(m=>m.round===1),legacy.matches.filter(m=>m.round===1));
assert.deepEqual(updated.matches.filter(m=>m.group==='B'),legacy.matches.filter(m=>m.group==='B'));
const moved=updated.matches.find(m=>m.id==='m-a-2-3');
assert.equal(moved.homeId,'esperanza');assert.equal(moved.awayId,'pinos');
assert.equal(moved.homeScore,1);assert.equal(moved.awayScore,2);
assert.equal(moved.homeKeeperId,'esperanza-p1');assert.equal(moved.awayKeeperId,'pinos-p1');
assert.deepEqual(moved.events,recorded.events);
assert.equal(moved.date,recorded.date);assert.equal(moved.time,recorded.time);assert.equal(moved.venue,recorded.venue);
assert.equal(updated.matches.find(m=>m.id===recorded.id).played,false);
for(const match of updated.matches){
  const previous=legacy.matches.find(m=>pair(m)===pair(match));
  assert.equal(match.played,previous.played);assert.deepEqual(match.events,previous.events);
  for(const id of [match.homeId,match.awayId]){
    assert.equal(match.homeId===id?match.homeScore:match.awayScore,previous.homeId===id?previous.homeScore:previous.awayScore);
  }
}
for(const calculate of [E.standings,E.scorers,E.discipline,E.goalkeepers])assert.deepEqual(calculate(updated),calculate(legacy));
assert.equal(E.upgradePairings(updated),updated);
const customIds=structuredClone(original);customIds.matches.forEach(m=>{m.id='custom-'+m.id;});
assert(E.validateState(E.upgradePairings(customIds)).valid);
assert.equal(E.upgradePairings(customIds).matches.find(m=>m.id==='custom-m-a-2-3').homeId,'esperanza');
const edited=structuredClone(updated);edited.matches.find(m=>m.id==='m-a-3-1').time='19:10';
assert.equal(E.upgradePairings(edited),edited);
console.log('PASS: Central Club–Calle los Pinos en J2/P3, 90 cruces únicos, primera jornada y grupo B conservados, resultados migrados por rival.');
