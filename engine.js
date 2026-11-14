/* Motor independiente: calendario de una vuelta, resultados y clasificaciones.
   validateState devuelve { valid, errors }. Los datos de ejemplo son ficticios. */
(function(root){
  'use strict';
  const definitions=[
    ['aurora','Aurora FC','AUR','#b59632','A'],['san-jose','Deportivo San José','SJO','#3a68a4','A'],['norte','Atlético Norte','NOR','#aa5d4c','A'],['esperanza','Real Esperanza','ESP','#36825c','A'],['central','Unión Central','UCE','#8464a7','A'],['estrella','Estrella Roja','ERO','#b84d55','A'],['pinos','Los Pinos','PIN','#417d55','A'],['valle','Sporting del Valle','VAL','#c28a42','A'],['juventud','Juventud Victoria','JUV','#4b929d','A'],['halcones','Halcones FC','HAL','#526682','A'],
    ['santa-cruz','Deportivo Santa Cruz','SCZ','#4c7db4','B'],['sur','Atlético del Sur','SUR','#b15d4c','B'],['san-miguel','Real San Miguel','RSM','#4d8a7c','B'],['flores','Unión Las Flores','FLO','#9a72ac','B'],['racing','Racing Municipal','RAC','#bd913c','B'],['condores','Cóndores FC','CON','#687681','B'],['titanes','Titanes de Oriente','TIT','#4c7ca4','B'],['olimpico','Olímpico FC','OLI','#569876','B'],['aguilas','Águilas Doradas','AGU','#ad8d35','B'],['independiente','Independiente','IND','#a9657e','B']
  ];
  const names=['Luis','Carlos','José','Diego','Andrés','Javier','Pablo','Miguel','Daniel','Óscar','Kevin','Sergio','Mario','Ángel','Marco','David','Juan','Emilio','Hugo','Fernando'];
  const surnames=['López','García','Pérez','Hernández','Martínez','Ramírez','Gómez','Castillo','Morales','Reyes','Méndez','Vásquez','Cruz','Herrera','Flores','Aguilar','Ramos','Ortiz','Molina','Fuentes'];
  const alpha=(a,b)=>a.localeCompare(b,'es');
  function createBlankState(){
    const teams=definitions.map(([id,name,short,color,group],i)=>({id,name,short,color,group,players:[1,7,9,10,11].map((number,j)=>({id:id+'-p'+(j+1),name:names[(i*3+j*7)%20]+' '+surnames[(i+j*3)%20],number,position:j===0?'goalkeeper':'player'}))}));
    const matches=[];
    for(const group of ['A','B']){
      let rotation=teams.filter(t=>t.group===group).map(t=>t.id);
      for(let round=1;round<=9;round++){
        for(let slot=0;slot<5;slot++){
          let homeId=rotation[slot],awayId=rotation[9-slot];
          if((round+slot)%2===0)[homeId,awayId]=[awayId,homeId];
          matches.push({id:`m-${group.toLowerCase()}-${round}-${slot+1}`,round,group,homeId,awayId,date:new Date(Date.UTC(2026,10,7+(round-1)*7)).toISOString().slice(0,10),time:['12:00','14:00','16:00','18:00','20:00'][slot],venue:'Estadio Municipal · Cancha '+(group==='A'?1:2),played:false,homeScore:null,awayScore:null,events:[],homeKeeperId:homeId+'-p1',awayKeeperId:awayId+'-p1'});
        }
        rotation=[rotation[0],rotation[9],...rotation.slice(1,-1)];
      }
    }
    matches.sort((a,b)=>a.round-b.round||alpha(a.time,b.time)||alpha(a.group,b.group));
    return {version:1,demo:false,tournament:{name:'Copa Navidad',season:'2026',venue:'Estadio Municipal'},teams,matches};
  }
  function createDemoState(){
    const state=createBlankState();state.demo=true;
    state.matches.forEach((m,i)=>{
      if(m.round>4)return;
      let seed=Math.imul(i+1+m.round*97,0x9e3779b1)>>>0;
      const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
      const dist=[0,0,1,1,1,2,2,2,3,3,4];m.played=true;m.homeScore=dist[Math.floor(random()*11)];m.awayScore=dist[Math.floor(random()*11)];
      const map=new Map();const event=id=>{if(!map.has(id))map.set(id,{playerId:id,goals:0,yellow:0,red:0});return map.get(id);};
      [[m.homeId,m.homeScore],[m.awayId,m.awayScore]].forEach(([id,score])=>{
        const team=state.teams.find(t=>t.id===id);const out=team.players.slice(1);
        for(let g=0;g<score;g++)event(out[Math.floor(random()*out.length)].id).goals++;
        const cards=Math.floor(random()*4);for(let c=0;c<cards;c++)event(team.players[Math.floor(random()*team.players.length)].id).yellow=1;
        if(random()<.06)event(out[Math.floor(random()*out.length)].id).red=1;
      });m.events=[...map.values()];
    });return state;
  }
  function played(state){return state.matches.filter(m=>m.played).slice().sort((a,b)=>alpha(a.date,b.date)||alpha(a.time,b.time)||a.round-b.round||alpha(a.id,b.id));}
  function playerIndex(state){return new Map(state.teams.flatMap(team=>team.players.map(player=>[player.id,{player,team}])));}
  function findPlayer(state,id){return playerIndex(state).get(id)||null;}
  function standings(state,group){
    const rows=new Map(state.teams.filter(t=>!group||t.group===group).map(team=>[team.id,{team,w:0,d:0,l:0,p:0,gf:0,ga:0,gd:0,pts:0,form:[]}]));
    played(state).forEach(m=>{const h=rows.get(m.homeId),a=rows.get(m.awayId);if(!h||!a)return;h.p++;a.p++;h.gf+=m.homeScore;h.ga+=m.awayScore;a.gf+=m.awayScore;a.ga+=m.homeScore;
      if(m.homeScore>m.awayScore){h.w++;h.pts+=3;a.l++;h.form.push('W');a.form.push('L');}else if(m.homeScore<m.awayScore){a.w++;a.pts+=3;h.l++;h.form.push('L');a.form.push('W');}else{h.d++;a.d++;h.pts++;a.pts++;h.form.push('D');a.form.push('D');}});
    return [...rows.values()].map(r=>({...r,gd:r.gf-r.ga,form:r.form.slice(-5)})).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||b.w-a.w||alpha(a.team.name,b.team.name));
  }
  function scorers(state){const index=playerIndex(state),rows=new Map();played(state).forEach(m=>m.events.forEach(e=>{if(!e.goals)return;const v=index.get(e.playerId);if(!v)return;if(!rows.has(e.playerId))rows.set(e.playerId,{...v,goals:0});rows.get(e.playerId).goals+=e.goals;}));return [...rows.values()].sort((a,b)=>b.goals-a.goals||alpha(a.player.name,b.player.name));}
  function discipline(state){const index=playerIndex(state),rows=new Map();played(state).forEach(m=>m.events.forEach(e=>{if(!e.yellow&&!e.red)return;const v=index.get(e.playerId);if(!v)return;if(!rows.has(e.playerId))rows.set(e.playerId,{...v,yellow:0,red:0});const r=rows.get(e.playerId);r.yellow+=e.yellow;r.red+=e.red;}));return [...rows.values()].sort((a,b)=>(b.yellow+3*b.red)-(a.yellow+3*a.red)||b.red-a.red||alpha(a.player.name,b.player.name));}
  function goalkeepers(state){const index=playerIndex(state),rows=new Map();played(state).forEach(m=>[[m.homeKeeperId,m.awayScore],[m.awayKeeperId,m.homeScore]].forEach(([id,conceded])=>{const v=index.get(id);if(!v)return;if(!rows.has(id))rows.set(id,{...v,played:0,conceded:0,cleanSheets:0});const r=rows.get(id);r.played++;r.conceded+=conceded;if(!conceded)r.cleanSheets++;}));return [...rows.values()].map(r=>({...r,average:r.conceded/r.played})).sort((a,b)=>a.average-b.average||b.cleanSheets-a.cleanSheets||b.played-a.played||alpha(a.player.name,b.player.name));}
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const text=(v,max=100)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  function validateState(s){
    const errors=[];const check=(v,message)=>{if(!v)errors.push(message);return v;};
    if(!record(s))return {valid:false,errors:['El archivo debe contener un objeto JSON.']};
    check(s.version===1,'Versión del archivo no compatible.');
    if(!record(s.tournament)||!text(s.tournament.name)||!text(s.tournament.season,30)||!text(s.tournament.venue,150))errors.push('Datos del torneo no válidos.');
    if(!Array.isArray(s.teams)||!Array.isArray(s.matches))return {valid:false,errors:[...errors,'Faltan los equipos o el calendario.']};
    if(s.teams.length!==20||s.matches.length!==90)return {valid:false,errors:[...errors,'Se necesitan 20 equipos y 90 partidos.']};
    const teams=new Map(),players=new Map(),groups={A:0,B:0};
    s.teams.forEach((t,i)=>{
      const label=`Equipo ${i+1}: `;if(!record(t)){errors.push(label+'datos no válidos.');return;}
      check(text(t.id)&&!teams.has(t.id),label+'identificador inválido o repetido.');teams.set(t.id,t);
      check(text(t.name)&&text(t.short,8)&&/^#[0-9a-f]{6}$/i.test(t.color),label+'nombre, abreviatura o color no válido.');
      check(['A','B'].includes(t.group),label+'grupo no válido.');if(t.group in groups)groups[t.group]++;
      if(!Array.isArray(t.players)||t.players.length<2||t.players.length>50){errors.push(label+'debe tener entre 2 y 50 jugadores.');return;}
      const numbers=new Set();let keepers=0,field=0;
      t.players.forEach(p=>{if(!record(p)){errors.push(label+'jugador no válido.');return;}
        check(text(p.id)&&!players.has(p.id),label+'ID de jugador inválido o repetido.');players.set(p.id,{player:p,team:t});
        check(text(p.name)&&integer(p.number,1,99)&&!numbers.has(p.number),label+'nombre o dorsal de jugador inválido o repetido.');numbers.add(p.number);
        check(['goalkeeper','player'].includes(p.position),label+'posición no válida.');if(p.position==='goalkeeper')keepers++;if(p.position==='player')field++;
      });check(keepers>0&&field>0,label+'incluye al menos un portero y un jugador de campo.');
    });check(groups.A===10&&groups.B===10,'Cada grupo debe tener 10 equipos.');
    const ids=new Set(),pairs=new Set(),rounds=new Set(),counts=new Map();
    s.matches.forEach((m,i)=>{
      const label=`Partido ${i+1}: `;if(!record(m)){errors.push(label+'datos no válidos.');return;}
      check(text(m.id)&&!ids.has(m.id),label+'identificador inválido o repetido.');ids.add(m.id);
      check(integer(m.round,1,9)&&['A','B'].includes(m.group),label+'jornada o grupo no válido.');
      let dateValid=false;try{dateValid=/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&new Date(m.date+'T00:00:00Z').toISOString().slice(0,10)===m.date;}catch{}
      check(dateValid&&/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)&&text(m.venue,150),label+'fecha, hora o sede no válida.');
      const home=teams.get(m.homeId),away=teams.get(m.awayId);
      check(home&&away&&home.id!==away.id&&home.group===m.group&&away.group===m.group,label+'equipos o grupo no válidos.');
      const pair=[m.homeId,m.awayId].sort().join('|');check(!pairs.has(pair),label+'enfrentamiento repetido.');pairs.add(pair);
      [m.homeId,m.awayId].forEach(id=>{const key=id+'|'+m.round;check(!rounds.has(key),label+'equipo repetido en la jornada.');rounds.add(key);});
      const key=m.group+'|'+m.round;counts.set(key,(counts.get(key)||0)+1);
      [['homeKeeperId',m.homeId],['awayKeeperId',m.awayId]].forEach(([prop,id])=>{const p=players.get(m[prop]);check(p&&p.team.id===id&&p.player.position==='goalkeeper',label+'portero no válido.');});
      check(typeof m.played==='boolean',label+'estado no válido.');
      check(m.played?(integer(m.homeScore,0,50)&&integer(m.awayScore,0,50)):(m.homeScore===null&&m.awayScore===null),label+'marcador no válido.');
      if(!Array.isArray(m.events)||m.events.length>100){errors.push(label+'eventos no válidos.');return;}
      check(m.played||m.events.length===0,label+'un partido pendiente no puede tener eventos.');const seen=new Set();let hg=0,ag=0;
      m.events.forEach(e=>{if(!record(e)){errors.push(label+'evento no válido.');return;}const p=players.get(e.playerId);
        check(p&&(p.team.id===m.homeId||p.team.id===m.awayId)&&!seen.has(e.playerId),label+'jugador de evento inválido o repetido.');seen.add(e.playerId);
        check(integer(e.goals,0,50)&&integer(e.yellow,0,2)&&integer(e.red,0,1),label+'goles o tarjetas no válidos.');
        if(p&&integer(e.goals,0,50)){if(p.team.id===m.homeId)hg+=e.goals;if(p.team.id===m.awayId)ag+=e.goals;}
      });if(m.played)check(hg===m.homeScore&&ag===m.awayScore,label+'los goles de los jugadores deben sumar el marcador.');
    });for(const g of ['A','B'])for(let r=1;r<=9;r++)check(counts.get(g+'|'+r)===5,`Grupo ${g}, jornada ${r}: debe haber 5 partidos.`);
    return {valid:errors.length===0,errors};
  }
  root.LigaEngine=Object.freeze({createDemoState,createBlankState,standings,scorers,discipline,goalkeepers,findPlayer,validateState});
})(globalThis);
