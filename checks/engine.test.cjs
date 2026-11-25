const assert=require('node:assert/strict');
require('../engine.js');
const E=globalThis.LigaEngine,demo=E.createDemoState(),blank=E.createBlankState();
assert.deepEqual(E.validateState(demo),{valid:true,errors:[]});
assert.deepEqual(E.validateState(blank),{valid:true,errors:[]});
const expectedGroups={
  A:['Real Aurora','Los Amigos','Fer. La Esperanza','Central Club','Auto. Rep. San Francisco','Club TK','Calle los Pinos','Grupo Master','Cachorros FC','Celajes FC'],
  B:['Los Brothers','Las Palmas','La Gran Manzana','Auto Rep. JR','Fer. Velazquez','Los Panas','Los Primos','Shulú','Real X','Rep. Tel. y Radiadores Velazquez.']
};
for(const group of ['A','B']){
  assert.deepEqual(blank.teams.filter(t=>t.group===group).map(t=>t.name),expectedGroups[group]);
  assert.deepEqual(demo.teams.filter(t=>t.group===group).map(t=>t.name),expectedGroups[group]);
  assert(E.standings(blank,group).every(r=>[r.p,r.w,r.d,r.l,r.gf,r.ga,r.gd,r.pts].every(n=>n===0)));
}
assert.equal(blank.demo,false);assert(blank.matches.every(m=>!m.played&&m.events.length===0));
// Migración de guardados: conserva referencias, estadísticas y personalizaciones.
const legacy=structuredClone(demo),beforeStats={
  standings:E.standings(demo).map(({team,...stats})=>({id:team.id,...stats})),
  scorers:E.scorers(demo).map(({team,...stats})=>({id:team.id,...stats})),
  cards:E.discipline(demo).map(({team,...stats})=>({id:team.id,...stats})),
  keepers:E.goalkeepers(demo).map(({team,...stats})=>({id:team.id,...stats}))
};
Object.assign(legacy.teams[0],{name:'Aurora FC'});
Object.assign(legacy.teams[1],{name:'Deportivo San José',short:'MIO'});
Object.assign(legacy.teams[2],{name:'Mi equipo',short:'MIE'});
Object.assign(legacy.teams[10],{name:'Deportivo Santa Cruz',short:'SCZ'});
const legacySnapshot=structuredClone(legacy),migrated=E.migrateTeamNames(legacy);
assert.deepEqual(E.validateState(migrated),{valid:true,errors:[]});
assert.deepEqual(legacy,legacySnapshot);
assert.equal(migrated.teams[0].name,'Real Aurora');
assert.equal(migrated.teams[1].name,'Los Amigos');assert.equal(migrated.teams[1].short,'MIO');
assert.equal(migrated.teams[2].name,'Mi equipo');assert.equal(migrated.teams[2].short,'MIE');
assert.equal(migrated.teams[10].name,'Los Brothers');assert.equal(migrated.teams[10].short,'BRO');
assert.equal(migrated.matches,legacy.matches);assert.equal(migrated.tournament,legacy.tournament);
assert(migrated.teams.every((t,i)=>t.id===legacy.teams[i].id&&t.players===legacy.teams[i].players&&t.color===legacy.teams[i].color&&t.group===legacy.teams[i].group));
assert.equal(E.migrateTeamNames(migrated),migrated);
assert.equal(E.migrateTeamNames(blank),blank);
// Los empates de la clasificación sí pueden cambiar de orden al cambiar un nombre.
const byId=rows=>rows.sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(byId(E.standings(migrated).map(({team,...stats})=>({id:team.id,...stats}))),byId(beforeStats.standings));
assert.deepEqual(E.scorers(migrated).map(({team,...stats})=>({id:team.id,...stats})),beforeStats.scorers);
assert.deepEqual(E.discipline(migrated).map(({team,...stats})=>({id:team.id,...stats})),beforeStats.cards);
assert.deepEqual(E.goalkeepers(migrated).map(({team,...stats})=>({id:team.id,...stats})),beforeStats.keepers);
const otherGroup=structuredClone(legacy);otherGroup.teams[0].group='B';
assert.equal(E.migrateTeamNames(otherGroup).teams[0].name,'Aurora FC');
const otherId=structuredClone(legacy);otherId.teams[0].id='otro-equipo';
assert.equal(E.migrateTeamNames(otherId).teams[0].name,'Aurora FC');
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
const match=blank.matches[0];Object.assign(match,{played:true,homeScore:0,awayScore:0,homeKeeperId:blank.teams.find(t=>t.id===match.homeId).players[0].id,awayKeeperId:blank.teams.find(t=>t.id===match.awayId).players[0].id});
assert(E.validateState(blank).valid);assert.equal(E.goalkeepers(blank).filter(r=>r.cleanSheets===1).length,2);
assert.equal(E.standings(blank,match.group).filter(r=>r.pts===1).length,2);
const scorer=blank.teams.find(t=>t.id===match.homeId).players[1];
Object.assign(match,{homeScore:2,awayScore:0,events:[{playerId:scorer.id,goals:2,yellow:1,red:0}]});
assert(E.validateState(blank).valid);assert.equal(E.scorers(blank)[0].goals,2);
assert.equal(E.standings(blank,match.group).find(r=>r.team.id===match.homeId).pts,3);
match.homeScore=1;match.events[0].goals=1;
assert.equal(E.scorers(blank)[0].goals,1);assert.equal(E.discipline(blank)[0].yellow,1);
match.homeScore=0;assert.equal(E.validateState(blank).valid,false);
Object.assign(match,{played:false,homeScore:null,awayScore:null,events:[]});
assert(E.validateState(blank).valid);assert.equal(E.goalkeepers(blank).length,0);assert.equal(E.scorers(blank).length,0);
for(const mutate of [s=>s.teams[0].group='B',s=>s.matches[0].awayId=s.matches[0].homeId,s=>s.matches[0].homeKeeperId=s.teams[0].players[1].id,s=>s.teams[0].players[1].number=1,s=>s.matches[0].date='2026-02-30']){
  const invalid=structuredClone(demo);mutate(invalid);assert.equal(E.validateState(invalid).valid,false);
}
assert.deepEqual(E.createDemoState(),demo);
console.log('PASS: equipos oficiales, inicio en cero, migración, 90 cruces, 9 jornadas, puntos, goles, porteros, edición y validación de importaciones.');
