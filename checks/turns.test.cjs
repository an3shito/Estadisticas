const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,times=['18:00','18:40','19:20','20:00','20:40'];
function checkBalance(state,adjacent=false){
  assert(E.validateState(state).valid);
  for(const group of ['A','B'])for(let round=1;round<=9;round++){
    assert.deepEqual(state.matches.filter(m=>m.group===group&&m.round===round).map(m=>m.time).sort(),times);
  }
  for(const team of state.teams){
    const games=state.matches.filter(m=>m.homeId===team.id||m.awayId===team.id).sort((a,b)=>a.round-b.round);
    const counts=times.map(time=>games.filter(m=>m.time===time).length);
    assert.deepEqual(counts.slice().sort(),[1,2,2,2,2]);
    if(adjacent)assert(games.slice(1).every((m,i)=>m.time!==games[i].time));
  }
}
const state=E.createTournamentState();
checkBalance(state,true);checkBalance(E.createBlankState(),true);checkBalance(E.createDemoState(),true);
assert.deepEqual(state.matches.filter(m=>m.round===1&&m.group==='A').map(m=>[m.homeId,m.awayId,m.time]),[
  ['aurora','san-jose','18:00'],['norte','esperanza','18:40'],['central','estrella','19:20'],['valle','pinos','20:00'],['juventud','halcones','20:40']
]);
assert.deepEqual(state.matches.filter(m=>m.round===1&&m.group==='B').map(m=>[m.homeId,m.awayId,m.time]),[
  ['santa-cruz','sur','18:00'],['racing','condores','18:40'],['san-miguel','flores','19:20'],['olimpico','titanes','20:00'],['aguilas','independiente','20:40']
]);
const fixed=state.matches.filter(m=>m.round===2&&m.group==='A').sort((a,b)=>a.time.localeCompare(b.time))[2];
assert.equal(fixed.homeId,'esperanza');assert.equal(fixed.awayId,'pinos');assert.equal(fixed.time,'19:20');
assert.deepEqual(state.matches.filter(m=>m.homeId==='aurora'||m.awayId==='aurora').map(m=>m.time).slice(0,5).sort(),times);
function oldTimes(){
  const old=E.createTournamentState();delete old.turnVersion;
  old.matches.forEach(m=>{m.time=times[Number(m.id.slice(-1))-1];});
  return old;
}
const old=oldTimes(),original=structuredClone(old),updated=E.upgradeTurns(old);
assert.deepEqual(old,original);checkBalance(updated,true);
assert.equal(updated.teams,old.teams);assert.equal(updated.tournament,old.tournament);
assert.deepEqual(updated.matches.filter(m=>m.round===1),old.matches.filter(m=>m.round===1));
for(const m of updated.matches){
  const before=old.matches.find(previous=>previous.id===m.id),{time,...details}=m,{time:oldTime,...oldDetails}=before;
  assert.deepEqual(details,oldDetails);
}
for(const calculate of [E.standings,E.scorers,E.discipline,E.goalkeepers])assert.deepEqual(calculate(updated),calculate(old));
assert.equal(E.upgradeTurns(updated),updated);
const recorded=oldTimes(),game=recorded.matches.find(m=>m.id==='m-a-2-1');
Object.assign(game,{played:true,homeScore:1,awayScore:0,events:[{playerId:game.homeId+'-p2',goals:1,yellow:1,red:0}]});
const migrated=E.upgradeTurns(recorded);checkBalance(migrated);
assert.deepEqual(migrated.matches.find(m=>m.id===game.id),game);
assert.deepEqual(E.scorers(migrated),E.scorers(recorded));
const impossible=oldTimes();
for(const round of [2,3])Object.assign(impossible.matches.find(m=>m.round===round&&(m.homeId==='aurora'||m.awayId==='aurora')),{played:true,homeScore:0,awayScore:0});
const snapshot=structuredClone(impossible);let rejected=false;
try{E.upgradeTurns(impossible);}catch{rejected=true;}
assert(rejected);assert.deepEqual(impossible,snapshot);
const manual=structuredClone(updated);manual.matches[0].time='19:10';
assert.equal(E.upgradeTurns(manual),manual);
console.log('PASS: los 20 equipos usan cada turno una o dos veces, sin repeticiones consecutivas; J1 y J2/P3 conservados; migración sin cambiar cruces ni resultados.');
