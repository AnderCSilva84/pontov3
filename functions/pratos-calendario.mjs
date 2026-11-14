export const diaPrato=(agora=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(agora));
export const pratoVencido=(p,dia=diaPrato())=>p.ativo!==false&&p.modo==='data'&&/^\d{4}-\d{2}-\d{2}$/.test(p.data||'')&&p.data<dia;
export const ateViradaPrato=(agora=Date.now())=>(Math.floor((agora-10800000)/86400000)+1)*86400000+10800000-agora;
