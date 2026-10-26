import {recursosWeb} from './plataforma';
let tarefa=Promise.resolve();
export function registrarWorker(url, somenteAusente=false) {
  const proxima=tarefa.catch(()=>{}).then(async()=>{
    if(!recursosWeb()||!('serviceWorker' in navigator))return null;
    const anterior=await navigator.serviceWorker.getRegistration('/');
    if(somenteAusente&&anterior){try{await anterior.update();}catch{/* A versão já instalada continua disponível offline. */}return anterior;}
    return navigator.serviceWorker.register(url,{updateViaCache:'none'});
  });
  tarefa=proxima;return proxima;
}
export function registrarShell(){return registrarWorker('/firebase-messaging-sw.js',true);}
