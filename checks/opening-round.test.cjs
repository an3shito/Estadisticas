const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,state=E.createTournamentState();
assert.deepEqual(E.validateState(state),{valid:true,errors:[]});
const first=state.matches.filter(m=>m.round===1);
assert.equal(first.length,10);assert.equal(first.filter(m=>m.played).length,8);
assert.equal(first.filter(m=>m.played).reduce((sum,m)=>sum+m.homeScore+m.awayScore,0),34);
assert(first.every(m=>m.events.length===0&&m.homeKeeperId===null&&m.awayKeeperId===null&&m.date===(m.group==='A'?'2026-11-22':'2026-11-24')&&m.time!==null));
assert.equal(E.scorers(state).length,0);assert.equal(E.goalkeepers(state).length,0);
const expected={
  A:[['norte',1,1,0,0,8,2,6,3],['valle',1,1,0,0,3,0,3,3],['central',1,1,0,0,4,2,2,3],['aurora',1,1,0,0,2,1,1,3],['juventud',0,0,0,0,0,0,0,0],['halcones',0,0,0,0,0,0,0,0],['san-jose',1,0,0,1,1,2,-1,0],['estrella',1,0,0,1,2,4,-2,0],['pinos',1,0,0,1,0,3,-3,0],['esperanza',1,0,0,1,2,8,-6,0]],
  B:[['racing',1,1,0,0,4,1,3,3],['san-miguel',1,1,0,0,2,1,1,3],['sur',1,0,1,0,1,1,0,1],['santa-cruz',1,0,1,0,1,1,0,1],['titanes',1,0,1,0,1,1,0,1],['olimpico',1,0,1,0,1,1,0,1],['aguilas',0,0,0,0,0,0,0,0],['independiente',0,0,0,0,0,0,0,0],['flores',1,0,0,1,1,2,-1,0],['condores',1,0,0,1,1,4,-3,0]]
};
for(const group of ['A','B']){
  assert.deepEqual(E.standings(state,group).map(r=>[r.team.id,r.p,r.w,r.d,r.l,r.gf,r.ga,r.gd,r.pts]),expected[group]);
  assert.equal(new Set(state.matches.filter(m=>m.group===group).map(m=>[m.homeId,m.awayId].sort().join('|'))).size,45);
  for(let round=1;round<=9;round++)assert.equal(new Set(state.matches.filter(m=>m.group===group&&m.round===round).flatMap(m=>[m.homeId,m.awayId])).size,10);
}
assert.deepEqual(first.filter(m=>!m.played).map(m=>[m.homeId,m.awayId,m.homeScore,m.awayScore]),[['juventud','halcones',null,null],['aguilas','independiente',null,null]]);
// Un marcador puede registrarse antes que los goleadores o los porteros.
const partial=structuredClone(state),match=partial.matches.find(m=>m.homeId==='norte'&&m.round===1),scorer=partial.teams.find(t=>t.id==='norte').players[1];
match.events=[{playerId:scorer.id,goals:3,yellow:0,red:0}];
assert(E.validateState(partial).valid);assert.equal(E.scorers(partial)[0].goals,3);assert.equal(E.goalkeepers(partial).length,0);
match.events[0].goals=9;assert.equal(E.validateState(partial).valid,false);
match.events[0].goals=3;match.homeKeeperId=partial.teams.find(t=>t.id==='norte').players[0].id;
assert(E.validateState(partial).valid);assert.equal(E.goalkeepers(partial)[0].conceded,2);
// Reproduce el calendario generado anteriormente para probar su actualización.
const legacy=E.createBlankState();delete legacy.initialResultsVersion;
for(const group of ['A','B']){
  let rotation=legacy.teams.filter(t=>t.group===group).map(t=>t.id);
  for(let round=1;round<=9;round++){
    for(let slot=0;slot<5;slot++){
      let homeId=rotation[slot],awayId=rotation[9-slot];if((round+slot)%2===0)[homeId,awayId]=[awayId,homeId];
      Object.assign(legacy.matches.find(m=>m.id===`m-${group.toLowerCase()}-${round}-${slot+1}`),{homeId,awayId});
    }
    rotation=[rotation[0],rotation[9],...rotation.slice(1,-1)];
  }
}
const openingPairs=new Set(first.map(m=>[m.homeId,m.awayId].sort().join('|')));
const previous=legacy.matches.find(m=>m.round>1&&!openingPairs.has([m.homeId,m.awayId].sort().join('|')));
const previousScorer=legacy.teams.find(t=>t.id===previous.homeId).players[1];
Object.assign(previous,{played:true,homeScore:1,awayScore:0,date:'2026-11-22',time:'09:30',venue:'Cancha personalizada',events:[{playerId:previousScorer.id,goals:1,yellow:1,red:0}]});
const original=structuredClone(legacy),upgraded=E.upgradeOpeningRound(legacy);
assert.deepEqual(legacy,original);assert(E.validateState(upgraded).valid);
assert.equal(upgraded.matches.filter(m=>m.round===1&&m.played).length,8);
assert.equal(upgraded.teams,legacy.teams);assert.equal(upgraded.tournament,legacy.tournament);
const preserved=upgraded.matches.find(m=>[m.homeId,m.awayId].sort().join('|')===[previous.homeId,previous.awayId].sort().join('|'));
assert.equal(preserved.date,'2026-11-22');assert.equal(preserved.time,'09:30');assert.equal(preserved.venue,'Cancha personalizada');
assert.deepEqual(preserved.events,previous.events);
assert.equal(preserved.homeId===previous.homeId?preserved.homeScore:preserved.awayScore,1);
assert.equal(E.upgradeOpeningRound(upgraded),upgraded);
const oldDemo=E.createDemoState();delete oldDemo.initialResultsVersion;
const actual=E.upgradeOpeningRound(oldDemo);assert.equal(actual.demo,false);assert.equal(actual.matches.filter(m=>m.played).length,8);assert.equal(E.scorers(actual).length,0);
const cleared=structuredClone(state);cleared.matches.forEach(m=>Object.assign(m,{played:false,homeScore:null,awayScore:null,events:[]}));
assert.equal(E.upgradeOpeningRound(cleared),cleared);assert.equal(E.upgradeOpeningRound(cleared).matches.filter(m=>m.played).length,0);
const corrected=structuredClone(state);corrected.matches.find(m=>m.played).homeScore=5;
assert.equal(E.upgradeOpeningRound(corrected),corrected);
console.log('PASS: primera jornada, 34 goles, dos pendientes, clasificaciones, calendario y actualización de guardados sin inventar estadísticas individuales.');
