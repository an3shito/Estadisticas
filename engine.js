/* Motor independiente: calendario de una vuelta, resultados y clasificaciones.
   validateState devuelve { valid, errors }. La demostración usa resultados ficticios. */
(function(root){
  'use strict';
  const definitions=[
    ['aurora','Real Aurora','AUR','#b59632','A'],['san-jose','Los Amigos','AMI','#3a68a4','A'],['norte','Fer. La Esperanza','ESP','#aa5d4c','A'],['esperanza','Central Club','CEN','#36825c','A'],['central','Auto. Rep. San Francisco','SFR','#8464a7','A'],['estrella','Club TK','TK','#b84d55','A'],['pinos','Calle los Pinos','PIN','#417d55','A'],['valle','Grupo Master','MAS','#c28a42','A'],['juventud','Cachorros FC','CAC','#4b929d','A'],['halcones','Celajes FC','CEL','#526682','A'],
    ['santa-cruz','Los Brothers','BRO','#4c7db4','B'],['sur','Las Palmas','PAL','#b15d4c','B'],['san-miguel','La Gran Manzana','MAN','#4d8a7c','B'],['flores','Auto Rep. JR','JR','#9a72ac','B'],['racing','Fer. Velazquez','VEL','#bd913c','B'],['condores','Los Panas','PAN','#687681','B'],['titanes','Los Primos','PRI','#4c7ca4','B'],['olimpico','Shulú','SHU','#569876','B'],['aguilas','Real X','RX','#ad8d35','B'],['independiente','Rep. Tel. y Radiadores Velazquez.','RAV','#a9657e','B']
  ];
  // Se mantienen los IDs para conservar referencias de calendarios y copias anteriores.
  const legacyLabels=[
    ['Aurora FC','AUR'],['Deportivo San José','SJO'],['Atlético Norte','NOR'],['Real Esperanza','ESP'],['Unión Central','UCE'],['Estrella Roja','ERO'],['Los Pinos','PIN'],['Sporting del Valle','VAL'],['Juventud Victoria','JUV'],['Halcones FC','HAL'],
    ['Deportivo Santa Cruz','SCZ'],['Atlético del Sur','SUR'],['Real San Miguel','RSM'],['Unión Las Flores','FLO'],['Racing Municipal','RAC'],['Cóndores FC','CON'],['Titanes de Oriente','TIT'],['Olímpico FC','OLI'],['Águilas Doradas','AGU'],['Independiente','IND']
  ];
  const openingRound={
    A:[['aurora','san-jose',2,1],['norte','esperanza',8,2],['central','estrella',4,2],['valle','pinos',3,0],['juventud','halcones',null,null]],
    B:[['santa-cruz','sur',1,1],['racing','condores',4,1],['san-miguel','flores',2,1],['olimpico','titanes',1,1],['aguilas','independiente',null,null]]
  };
  const pairKey=(a,b)=>[a,b].sort().join('|');
  function migrateTeamNames(state){
    const teams=state.teams.map(team=>{
      const i=definitions.findIndex(([id,,,,group])=>team.id===id&&team.group===group);
      if(i<0||team.name!==legacyLabels[i][0])return team;
      return {...team,name:definitions[i][1],short:team.short===legacyLabels[i][1]?definitions[i][2]:team.short};
    });
    return teams.some((team,i)=>team!==state.teams[i])?{...state,teams}:state;
  }
  const names=['Luis','Carlos','José','Diego','Andrés','Javier','Pablo','Miguel','Daniel','Óscar','Kevin','Sergio','Mario','Ángel','Marco','David','Juan','Emilio','Hugo','Fernando'];
  const surnames=['López','García','Pérez','Hernández','Martínez','Ramírez','Gómez','Castillo','Morales','Reyes','Méndez','Vásquez','Cruz','Herrera','Flores','Aguilar','Ramos','Ortiz','Molina','Fuentes'];
  const alpha=(a,b)=>a.localeCompare(b,'es');
  const matchMinutes=40,venue='Cancha Municipal';
  const matchTimes=Object.freeze(['18:00','18:40','19:20','20:00','20:40']);
  const turnPlans=new Map(),turnPermutations=[];
  (function permute(used,values){
    if(values.length===5){turnPermutations.push(values);return;}
    for(let i=0;i<5;i++)if(!(used&(1<<i)))permute(used|(1<<i),[...values,i]);
  })(0,[]);
  function balancedTurns(matches,group){
    const teams=[...new Set(matches.flatMap(m=>[m.homeId,m.awayId]))].sort(alpha),index=new Map(teams.map((id,i)=>[id,i]));
    const rounds=Array.from({length:9},(_,r)=>matches.filter(m=>m.round===r+1).sort((a,b)=>alpha(a.id,b.id)));
    const edges=rounds.map(games=>games.map(m=>[index.get(m.homeId),index.get(m.awayId)]));
    const fixed=rounds.map(games=>games.map(m=>{
      let turn=-1;
      if(m.round===1||m.played){turn=matchTimes.indexOf(m.time);if(turn<0)throw new Error('Hay un partido jugado o de la primera jornada con un horario fuera de los cinco turnos.');}
      if(group==='A'&&m.round===2&&pairKey(m.homeId,m.awayId)===pairKey('esperanza','pinos')){
        if(turn>=0&&turn!==2)throw new Error('Central Club–Calle los Pinos ya tiene un resultado registrado en otro turno.');
        turn=2;
      }
      return turn;
    }));
    const key=JSON.stringify([edges,fixed]);
    let plan=turnPlans.get(key);
    if(!plan){
      const counts=teams.map(()=>Array(5).fill(0)),assigned=Array(9).fill(null),teamTurn=Array.from({length:9},()=>Array(10).fill(-1));
      let nodes=0;
      function apply(r,p,delta){
        for(let i=0;i<5;i++)for(const t of edges[r][i]){counts[t][p[i]]+=delta;teamTurn[r][t]=delta>0?p[i]:-1;}
        assigned[r]=delta>0?p:null;
      }
      function candidates(r,avoidAdjacent){
        const choices=[];
        for(const p of turnPermutations){
          if(p.some((turn,i)=>fixed[r][i]>=0&&turn!==fixed[r][i]))continue;
          let score=0,valid=true;
          for(let i=0;i<5&&valid;i++)for(const t of edges[r][i]){
            if(counts[t][p[i]]>=2){valid=false;break;}
            const adjacent=(r>0&&teamTurn[r-1][t]===p[i])||(r<8&&teamTurn[r+1][t]===p[i]);
            if(avoidAdjacent&&adjacent){valid=false;break;}
            score+=counts[t][p[i]]*2+(adjacent?100:0);
          }
          if(valid)choices.push({p,score});
        }
        return choices.sort((a,b)=>a.score-b.score);
      }
      function visit(left,avoidAdjacent){
        if(!left)return true;
        if(++nodes>25000)return false;
        let selected=-1,options=null;
        // Elegir primero la jornada con menos órdenes posibles reduce la búsqueda.
        for(let r=0;r<9;r++)if(!assigned[r]){
          const choices=candidates(r,avoidAdjacent);if(!choices.length)return false;
          if(!options||choices.length<options.length){selected=r;options=choices;}
        }
        for(const {p} of options){apply(selected,p,1);if(visit(left-1,avoidAdjacent))return true;apply(selected,p,-1);}
        return false;
      }
      if(!visit(9,true)){nodes=0;if(!visit(9,false))throw new Error('No se encontró un reparto de una o dos apariciones por turno compatible con los horarios ya jugados.');}
      // Nueve partidos y un máximo de dos en cada turno obligan a usar los cinco.
      if(!counts.every(row=>row.every(n=>n===1||n===2)))throw new Error('La distribución de turnos no es válida.');
      plan=assigned.map(p=>p.slice());turnPlans.set(key,plan);
    }
    return new Map(rounds.flatMap((games,r)=>games.map((m,i)=>[m.id,matchTimes[plan[r][i]]])));
  }
  function upgradeTurns(state){
    if(state.turnVersion>=1)return state;
    const times=new Map(['A','B'].flatMap(group=>[...balancedTurns(state.matches.filter(m=>m.group===group),group)]));
    const matches=state.matches.map(m=>m.time===times.get(m.id)?m:{...m,time:times.get(m.id)}).sort((a,b)=>alpha(a.date||'',b.date||'')||alpha(a.time||'',b.time||'')||alpha(a.id,b.id));
    return {...state,turnVersion:1,matches};
  }
  function normalizeVenue(state){
    const tournament=state.tournament.venue===venue?state.tournament:{...state.tournament,venue};
    const matches=state.matches.map(match=>match.venue===venue?match:{...match,venue});
    return tournament!==state.tournament||matches.some((match,i)=>match!==state.matches[i])?{...state,tournament,matches}:state;
  }
  function upgradeSchedule(state){
    if(state.scheduleVersion>=1)return state;
    const dates=[],day=new Date('2026-11-22T00:00:00Z');
    while(dates.length<18){
      if([0,2,4].includes(day.getUTCDay()))dates.push(day.toISOString().slice(0,10));
      day.setUTCDate(day.getUTCDate()+1);
    }
    const slots=new Map();
    const matches=state.matches.slice().sort((a,b)=>a.round-b.round||alpha(a.group,b.group)||alpha(a.id,b.id)).map(match=>{
      const key=match.group+'|'+match.round,slot=slots.get(key)||0;
      slots.set(key,slot+1);
      const minutes=18*60+slot*matchMinutes;
      return {...match,date:dates[(match.round-1)*2+(match.group==='B'?1:0)],time:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`};
    }).sort((a,b)=>alpha(a.date,b.date)||alpha(a.time,b.time)||alpha(a.id,b.id));
    return {...state,scheduleVersion:1,matches};
  }
  function createBlankState(){
    const teams=definitions.map(([id,name,short,color,group])=>({id,name,short,color,group,players:[1,7,9,10,11].map((number,j)=>({id:id+'-p'+(j+1),name:j===0?'Portero':'Jugador '+number,number,position:j===0?'goalkeeper':'player'}))}));
    const matches=[];
    for(const group of ['A','B']){
      let rotation=Array(10);
      openingRound[group].forEach(([homeId,awayId],slot)=>{rotation[slot]=slot%2?awayId:homeId;rotation[9-slot]=slot%2?homeId:awayId;});
      // Invertir este par conserva sus rivales de J1 y lleva Central Club–Pinos a J2/P3.
      if(group==='A')[rotation[3],rotation[6]]=[rotation[6],rotation[3]];
      for(let round=1;round<=9;round++){
        for(let slot=0;slot<5;slot++){
          let homeId=rotation[slot],awayId=rotation[9-slot];
          if((round+slot)%2===0)[homeId,awayId]=[awayId,homeId];
          if(round===1)[homeId,awayId]=openingRound[group][slot];
          else if(group==='A'&&round===2&&slot===2)[homeId,awayId]=[awayId,homeId];
          matches.push({id:`m-${group.toLowerCase()}-${round}-${slot+1}`,round,group,homeId,awayId,date:null,time:null,venue,played:false,homeScore:null,awayScore:null,events:[],homeKeeperId:null,awayKeeperId:null});
        }
        rotation=[rotation[0],rotation[9],...rotation.slice(1,-1)];
      }
    }
    return upgradeTurns(upgradeSchedule({version:1,initialResultsVersion:1,pairingsVersion:1,demo:false,tournament:{name:'Campeonato Municipal',season:'2026',venue},teams,matches}));
  }
  function upgradePairings(state){
    if(state.pairingsVersion>=1)return state;
    if(!definitions.filter(([, , , ,group])=>group==='A').every(([id])=>state.teams.some(t=>t.id===id&&t.group==='A')))return {...state,pairingsVersion:1};
    const planned=new Map(createBlankState().matches.filter(m=>m.group==='A'&&m.round>1).map(m=>[m.id,m]));
    const previous=new Map(state.matches.filter(m=>m.group==='A').map(m=>[pairKey(m.homeId,m.awayId),m]));
    const counts=new Map(),replacements=new Map();
    state.matches.filter(m=>m.group==='A'&&m.round>1).slice().sort((a,b)=>a.round-b.round||alpha(a.id,b.id)).forEach(m=>{
      const slot=(counts.get(m.round)||0)+1;counts.set(m.round,slot);
      replacements.set(m.id,planned.get(`m-a-${m.round}-${slot}`));
    });
    const matches=state.matches.map(slot=>{
      if(slot.group!=='A'||slot.round===1)return slot;
      const scheduled=replacements.get(slot.id),old=previous.get(pairKey(scheduled.homeId,scheduled.awayId));
      const sameHome=old.homeId===scheduled.homeId;
      return {...slot,homeId:scheduled.homeId,awayId:scheduled.awayId,played:old.played,events:old.events,
        homeScore:sameHome?old.homeScore:old.awayScore,awayScore:sameHome?old.awayScore:old.homeScore,
        homeKeeperId:sameHome?old.homeKeeperId:old.awayKeeperId,awayKeeperId:sameHome?old.awayKeeperId:old.homeKeeperId,
        ...(old.played?{date:old.date,time:old.time,venue:old.venue}:{})};
    });
    return {...state,pairingsVersion:1,matches};
  }
  function seedOpeningRound(state){
    const previous=new Map(state.matches.map(m=>[pairKey(m.homeId,m.awayId),m]));
    const matches=createBlankState().matches.map(scheduled=>{
      const old=state.demo?null:previous.get(pairKey(scheduled.homeId,scheduled.awayId));
      let match=scheduled;
      if(old){
        const sameHome=old.homeId===scheduled.homeId;
        match={...old,...scheduled,date:old.date,time:old.time,venue:old.venue,played:old.played,events:old.events,
          homeScore:sameHome?old.homeScore:old.awayScore,awayScore:sameHome?old.awayScore:old.homeScore,
          homeKeeperId:sameHome?old.homeKeeperId:old.awayKeeperId,awayKeeperId:sameHome?old.awayKeeperId:old.homeKeeperId};
      }
      if(scheduled.round!==1)return match;
      const result=openingRound[scheduled.group].find(([homeId,awayId])=>homeId===scheduled.homeId&&awayId===scheduled.awayId);
      const [, ,homeScore,awayScore]=result,played=homeScore!==null;
      let events=old?.played&&played?old.events:[];
      // Conserva los detalles ya registrados cuando caben en el marcador corregido.
      const goalsFor=id=>events.filter(e=>state.teams.find(t=>t.id===id).players.some(p=>p.id===e.playerId)).reduce((sum,e)=>sum+e.goals,0);
      const excess=new Set([[scheduled.homeId,homeScore],[scheduled.awayId,awayScore]].filter(([id,score])=>goalsFor(id)>(score??0)).flatMap(([id])=>state.teams.find(t=>t.id===id).players.map(p=>p.id)));
      if(excess.size)events=events.map(e=>excess.has(e.playerId)?{...e,goals:0}:e).filter(e=>e.goals||e.yellow||e.red);
      return {...match,date:old?.played?old.date:scheduled.date,time:old?.played?old.time:scheduled.time,venue:old?.played?old.venue:venue,
        played,homeScore,awayScore,events,homeKeeperId:old?.played&&played?match.homeKeeperId:null,awayKeeperId:old?.played&&played?match.awayKeeperId:null};
    });
    return {...state,initialResultsVersion:1,demo:false,matches};
  }
  function createTournamentState(){return seedOpeningRound(createBlankState());}
  function upgradeOpeningRound(state){
    if(state.initialResultsVersion>=1)return state;
    if(!definitions.every(([id,,,,group])=>state.teams.some(t=>t.id===id&&t.group===group)))return {...state,initialResultsVersion:1};
    return seedOpeningRound(state);
  }
  function createDemoState(){
    const state=createBlankState();state.demo=true;
    state.teams.forEach((team,i)=>team.players.forEach((player,j)=>{player.name=names[(i*3+j*7)%20]+' '+surnames[(i+j*3)%20];}));
    state.matches.forEach((m,i)=>{
      m.homeKeeperId=m.homeId+'-p1';m.awayKeeperId=m.awayId+'-p1';
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
  function played(state){return state.matches.filter(m=>m.played).slice().sort((a,b)=>alpha(a.date||'',b.date||'')||alpha(a.time||'',b.time||'')||a.round-b.round||alpha(a.id,b.id));}
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
      let dateValid=m.date===null;try{if(m.date!==null)dateValid=/^\d{4}-\d{2}-\d{2}$/.test(m.date)&&new Date(m.date+'T00:00:00Z').toISOString().slice(0,10)===m.date;}catch{}
      check(dateValid&&(m.time===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time))&&text(m.venue,150),label+'fecha, hora o sede no válida.');
      const home=teams.get(m.homeId),away=teams.get(m.awayId);
      check(home&&away&&home.id!==away.id&&home.group===m.group&&away.group===m.group,label+'equipos o grupo no válidos.');
      const pair=[m.homeId,m.awayId].sort().join('|');check(!pairs.has(pair),label+'enfrentamiento repetido.');pairs.add(pair);
      [m.homeId,m.awayId].forEach(id=>{const key=id+'|'+m.round;check(!rounds.has(key),label+'equipo repetido en la jornada.');rounds.add(key);});
      const key=m.group+'|'+m.round;counts.set(key,(counts.get(key)||0)+1);
      [['homeKeeperId',m.homeId],['awayKeeperId',m.awayId]].forEach(([prop,id])=>{const p=players.get(m[prop]);check(m[prop]===null||(p&&p.team.id===id&&p.player.position==='goalkeeper'),label+'portero no válido.');});
      check(typeof m.played==='boolean',label+'estado no válido.');
      check(m.played?(integer(m.homeScore,0,50)&&integer(m.awayScore,0,50)):(m.homeScore===null&&m.awayScore===null),label+'marcador no válido.');
      if(!Array.isArray(m.events)||m.events.length>100){errors.push(label+'eventos no válidos.');return;}
      check(m.played||m.events.length===0,label+'un partido pendiente no puede tener eventos.');const seen=new Set();let hg=0,ag=0;
      m.events.forEach(e=>{if(!record(e)){errors.push(label+'evento no válido.');return;}const p=players.get(e.playerId);
        check(p&&(p.team.id===m.homeId||p.team.id===m.awayId)&&!seen.has(e.playerId),label+'jugador de evento inválido o repetido.');seen.add(e.playerId);
        check(integer(e.goals,0,50)&&integer(e.yellow,0,2)&&integer(e.red,0,1),label+'goles o tarjetas no válidos.');
        if(p&&integer(e.goals,0,50)){if(p.team.id===m.homeId)hg+=e.goals;if(p.team.id===m.awayId)ag+=e.goals;}
      });if(m.played)check(hg<=m.homeScore&&ag<=m.awayScore,label+'los goles asignados a jugadores no pueden superar el marcador.');
    });for(const g of ['A','B'])for(let r=1;r<=9;r++)check(counts.get(g+'|'+r)===5,`Grupo ${g}, jornada ${r}: debe haber 5 partidos.`);
    return {valid:errors.length===0,errors};
  }
  root.LigaEngine=Object.freeze({createDemoState,createBlankState,createTournamentState,upgradeOpeningRound,upgradeSchedule,upgradePairings,upgradeTurns,normalizeVenue,matchMinutes,matchTimes,venue,migrateTeamNames,standings,scorers,discipline,goalkeepers,findPlayer,validateState});
})(globalThis);
