(async function(){
  'use strict';
  const output=document.querySelector('#test-results'),frame=document.querySelector('iframe'),KEY='copa-navidad-v1';
  let checks=0;
  const check=(condition,label)=>{if(!condition)throw new Error(label);checks++;};
  const waitFor=async predicate=>{for(let attempts=0;attempts<400;attempts++){if(predicate())return;await fetch('/__tick',{cache:'no-store'});}throw new Error('Se agotó la espera de una operación.');};
  const load=action=>new Promise(resolve=>{frame.addEventListener('load',resolve,{once:true});action();});
  const doc=()=>frame.contentDocument;
  const read=()=>JSON.parse(frame.contentWindow.localStorage.getItem(KEY));
  const snapshot=()=>frame.contentWindow.localStorage.getItem(KEY);
  const click=selector=>{const button=doc().querySelector(selector);check(!!button,'Existe '+selector);button.click();};
  const close=()=>{if(doc().querySelector('#modal').open)click('[data-action="close-modal"]');};
  const action=(name,id)=>{const button=doc().createElement('button');button.dataset.action=name;if(id)button.dataset.id=id;doc().body.append(button);button.click();button.remove();};
  const submit=form=>form.dispatchEvent(new frame.contentWindow.Event('submit',{bubbles:true,cancelable:true}));
  const route=async hash=>{frame.contentWindow.location.hash=hash;await waitFor(()=>doc().title.startsWith({inicio:'Vista general',calendario:'Calendario',equipos:'Equipos'}[hash]));};
  const login=async password=>{close();click('[data-action="admin-access"]');doc().querySelector('#admin-password').value=password;submit(doc().querySelector('#access-form'));await waitFor(()=>!!doc().querySelector('[data-action="lock-editing"]')||!!doc().querySelector('#form-error.visible'));};
  try{
    // El ejecutor sirve esta clave solo en memoria y solo durante la prueba local.
    const response=await fetch('/__test_password');
    if(!response.ok)throw new Error('Ejecuta estas pruebas con python checks/run_access_checks.py.');
    const password=await response.text();
    for(const key of [KEY,KEY+'-before-jornada-1',KEY+'-before-calendario-2026',KEY+'-before-cruces-jornada-2-a'])localStorage.removeItem(key);
    await load(()=>{frame.src='../index.html';});
    const initial=snapshot(),first=read().matches[0];
    check(doc().querySelector('#settings-button').hidden,'Configuración oculta sin acceso');
    check(!doc().querySelector('[data-action="choose-match"]'),'Registro oculto sin acceso');
    check(!!doc().querySelector('[data-action="export"]'),'La exportación permanece disponible');
    check(doc().documentElement.scrollWidth<=frame.contentWindow.innerWidth,'Cabecera móvil sin desbordamiento');
    for(const name of ['choose-match','settings','import','confirm-clear','confirm-demo','unplay','execute-clear','execute-demo','execute-unplay','execute-import','add-player','remove-player']){
      action(name,first.id);
      check(!!doc().querySelector('#access-form'),'Contraseña exigida para '+name);
      check(snapshot()===initial,'No se modifican datos con '+name);close();
    }
    for(const id of ['result-form','team-form','settings-form']){
      const form=doc().createElement('form');form.id=id;doc().body.append(form);submit(form);form.remove();
      check(!!doc().querySelector('#access-form'),'Envío protegido: '+id);
      check(snapshot()===initial,'Envío sin acceso no cambia datos');close();
    }
    await route('calendario');
    check(doc().querySelector('.page-subtitle').textContent.includes('40 minutos'),'El calendario explica duración y alternancia');
    check(doc().querySelectorAll('.fixture').length===10,'La primera jornada incluye ambos grupos');
    check([...doc().querySelectorAll('.schedule-day')].map(el=>el.textContent).join('|')==='domingo, 22 de noviembre de 2026|martes, 24 de noviembre de 2026','Fechas iniciales correctas en Guatemala');
    check([...doc().querySelectorAll('.fixture-info')].slice(0,5).map(el=>el.textContent.replace('GRUPO A','')).join('|')==='6:00 p. m.|6:40 p. m.|7:20 p. m.|8:00 p. m.|8:40 p. m.','Cinco inicios separados por 40 minutos');
    const roundFilter=doc().querySelector('#round-filter');roundFilter.value='2';roundFilter.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    check([...doc().querySelectorAll('.schedule-day')].map(el=>el.textContent).join('|')==='jueves, 26 de noviembre de 2026|domingo, 29 de noviembre de 2026','La alternancia continúa entre semanas');
    const third=doc().querySelectorAll('.fixture')[2];
    check(third.querySelector('.fixture-team.home').textContent==='Central Club'&&third.querySelectorAll('.fixture-team')[1].textContent==='Calle los Pinos'&&third.querySelector('.fixture-info').textContent.includes('7:20 p. m.'),'Central Club–Calle los Pinos es el tercer partido de J2/A');
    check(doc().documentElement.scrollWidth<=frame.contentWindow.innerWidth,'Calendario móvil sin desbordamiento');
    click('[data-match]');
    check(!doc().querySelector('#result-form')&&!doc().querySelector('#modal-content input'),'Partido de consulta sin campos editables');close();
    await route('equipos');click('[data-team]');
    check(!doc().querySelector('#team-form')&&!doc().querySelector('#modal-content input'),'Plantilla de consulta sin campos editables');close();
    const guestTransfer=new frame.contentWindow.DataTransfer();guestTransfer.items.add(new frame.contentWindow.File([initial],'copy.json',{type:'application/json'}));
    const guestImport=doc().querySelector('#import-file');guestImport.files=guestTransfer.files;guestImport.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    check(!!doc().querySelector('#access-form')&&snapshot()===initial,'Importación sin acceso bloqueada');close();
    for(const wrong of ['incorrecta',password.slice(0,-1),password+' ']){
      await login(wrong);
      check(!doc().querySelector('[data-action="lock-editing"]'),'Contraseña incorrecta rechazada');
      check(snapshot()===initial,'Clave incorrecta conserva datos');close();
    }
    click('[data-action="admin-access"]');doc().querySelector('#admin-password').value=password;
    submit(doc().querySelector('#access-form'));close();
    await login('incorrecta');
    check(!doc().querySelector('[data-action="lock-editing"]'),'Cancelar invalida la verificación en curso');close();
    await login(password);
    check(!!doc().querySelector('[data-action="lock-editing"]'),'Contraseña correcta habilita edición');
    check(!doc().querySelector('#settings-button').hidden,'Configuración disponible al administrador');
    await route('inicio');click('[data-action="choose-match"]');
    const pendingMatch=read().matches.find(m=>!m.played);click('#chooser-list [data-match="'+pendingMatch.id+'"]');
    let form=doc().querySelector('#result-form');
    const state=read(),match=state.matches.find(m=>m.id===form.dataset.matchId),home=state.teams.find(t=>t.id===match.homeId),away=state.teams.find(t=>t.id===match.awayId);
    form.elements.homeScore.value='2';form.elements.awayScore.value='1';
    form.elements.date.value='2027-01-03';form.elements.time.value='19:10';
    form.elements['goals-'+home.players[1].id].value='2';form.elements['goals-'+away.players[1].id].value='1';
    check(form.checkValidity(),'El resultado admite fecha y porteros sin confirmar');form.requestSubmit();
    check(read().matches.find(m=>m.id===match.id).played,'Administrador guarda un resultado');
    check(frame.contentWindow.LigaEngine.standings(read(),match.group).find(r=>r.team.id===home.id).pts===3,'El resultado autorizado recalcula puntos');
    check(frame.contentWindow.LigaEngine.goalkeepers(read()).length===0,'No se atribuyen goles a porteros sin confirmar');
    await load(()=>frame.contentWindow.location.reload());
    check(read().matches.find(m=>m.id===match.id).date==='2027-01-03'&&read().matches.find(m=>m.id===match.id).time==='19:10','Una reprogramación del administrador se conserva al recargar');
    await login(password);
    await route('calendario');click('[data-match="'+match.id+'"]');form=doc().querySelector('#result-form');
    for(const input of form.querySelectorAll('input[name^="goals-"]'))input.value='0';
    check(form.checkValidity(),'El marcador admite goles pendientes de asignación');form.requestSubmit();
    check(frame.contentWindow.LigaEngine.scorers(read()).length===0,'No se inventan goleadores al guardar solo el marcador');
    await route('equipos');click('[data-team]');form=doc().querySelector('#team-form');
    const teamId=form.dataset.teamId;form.elements.name.value='Equipo de prueba';submit(form);
    check(read().teams.find(t=>t.id===teamId).name==='Equipo de prueba','Administrador puede guardar equipos');
    click('[data-action="settings"]');form=doc().querySelector('#settings-form');form.elements.name.value='Torneo de prueba';submit(form);
    check(read().tournament.name==='Torneo de prueba','Administrador puede guardar configuración');
    await route('calendario');click('[data-match]');
    const staleForm=doc().querySelector('#result-form').cloneNode(true),beforeLock=snapshot();
    action('lock-editing');doc().body.append(staleForm);submit(staleForm);staleForm.remove();
    check(snapshot()===beforeLock&&!!doc().querySelector('#access-form'),'Formulario anterior rechazado tras bloquear');close();
    await login(password);
    let resolveFile;
    const importInput=doc().querySelector('#import-file'),copy=frame.contentWindow.LigaEngine.createDemoState();
    delete copy.scheduleVersion;copy.matches[0].date='2027-01-03';copy.matches[0].time='19:10';
    Object.defineProperty(importInput,'files',{configurable:true,value:[{size:1000,text:()=>new Promise(resolve=>{resolveFile=resolve;})}]});
    importInput.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    action('lock-editing');await login(password);resolveFile(JSON.stringify(copy));
    await new Promise(resolve=>setTimeout(resolve,100));
    check(!doc().querySelector('[data-action="execute-import"]')&&snapshot()===beforeLock,'Lectura de archivo descartada al cambiar de sesión');
    Object.defineProperty(importInput,'files',{configurable:true,value:[{size:1000,text:async()=>JSON.stringify(copy)}]});
    importInput.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    await waitFor(()=>!!doc().querySelector('[data-action="execute-import"]'));
    check(snapshot()===beforeLock,'Importación espera confirmación');
    const staleConfirm=doc().querySelector('[data-action="execute-import"]').cloneNode(true);
    action('lock-editing');doc().body.append(staleConfirm);staleConfirm.click();staleConfirm.remove();
    check(snapshot()===beforeLock,'Confirmación anterior rechazada tras bloquear');close();
    await login(password);
    importInput.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));
    await waitFor(()=>!!doc().querySelector('[data-action="execute-import"]'));click('[data-action="execute-import"]');
    check(read().demo===true&&read().matches.filter(m=>m.played).length===40,'Importación autorizada aplicada');
    const saved=snapshot();await load(()=>frame.contentWindow.location.reload());
    check(!!doc().querySelector('[data-action="admin-access"]')&&!doc().querySelector('[data-action="choose-match"]'),'Recargar vuelve al modo consulta');
    check(snapshot()===saved,'Recargar conserva los resultados');
    check(read().matches[0].date==='2027-01-03'&&read().matches[0].time==='19:10','Una copia importada conserva sus fechas al recargar');
    check(frame.contentWindow.localStorage.length===1&&frame.contentWindow.sessionStorage.length===0,'No se persisten credenciales ni permisos');
    check(!JSON.stringify(read()).includes(password),'La contraseña no forma parte de los datos');
    const legacy=frame.contentWindow.LigaEngine.createTournamentState();delete legacy.scheduleVersion;delete legacy.pairingsVersion;
    let rotation=['aurora','esperanza','central','pinos','juventud','halcones','valle','estrella','norte','san-jose'];
    for(let round=1;round<=9;round++){
      if(round>1)for(let slot=0;slot<5;slot++){
        let homeId=rotation[slot],awayId=rotation[9-slot];if((round+slot)%2===0)[homeId,awayId]=[awayId,homeId];
        Object.assign(legacy.matches.find(m=>m.id===`m-a-${round}-${slot+1}`),{homeId,awayId});
      }
      rotation=[rotation[0],rotation[9],...rotation.slice(1,-1)];
    }
    legacy.matches.forEach(m=>{m.date=null;m.time=null;});
    const oldSaved=JSON.stringify(legacy);frame.contentWindow.localStorage.setItem(KEY,oldSaved);
    await load(()=>frame.contentWindow.location.reload());
    check(frame.contentWindow.localStorage.getItem(KEY+'-before-calendario-2026')===oldSaved,'Se respalda el guardado antes de actualizar fechas');
    check(frame.contentWindow.localStorage.getItem(KEY+'-before-cruces-jornada-2-a')===oldSaved,'Se respalda el guardado antes de actualizar los cruces');
    const changed=read().matches.find(m=>m.id==='m-a-2-3');
    check(changed.homeId==='esperanza'&&changed.awayId==='pinos'&&changed.time==='19:20','Los guardados anteriores reciben el cruce solicitado en J2/A');
    check(read().matches[0].date==='2026-11-22'&&read().matches[5].date==='2026-11-24','El guardado anterior recibe las fechas correctas');
    check(read().matches.filter(m=>m.played).length===8&&read().matches.filter(m=>m.round===1&&!m.played).length===2,'La actualización conserva ocho resultados y dos pendientes');
    const migrated=snapshot();await load(()=>frame.contentWindow.location.reload());
    check(snapshot()===migrated&&frame.contentWindow.localStorage.getItem(KEY+'-before-calendario-2026')===oldSaved,'La migración no se repite ni sobrescribe el respaldo');
    document.body.dataset.testStatus='passed';output.textContent='PASS: '+checks+' comprobaciones de acceso y guardado.';
  }catch(error){document.body.dataset.testStatus='failed';output.textContent='FAIL después de '+checks+' comprobaciones: '+error.message;}
})();
