import test from 'node:test';
import assert from 'node:assert/strict';
import {resolverAmbiente,prefixosCliente} from '../src/utils/ambiente.js';
const env={VITE_AP1303_DESTINO:'producao',VITE_FIREBASE_PROJECT_ID:'ponto-app-1c55a',VITE_FIREBASE_API_KEY:'publica-ficticia',VITE_FIREBASE_APP_ID:'app-ficticio',VITE_FIREBASE_AUTH_DOMAIN:'ponto-app-1c55a.firebaseapp.com',VITE_FIREBASE_MESSAGING_SENDER_ID:'123'};
test('release explicito compartilha projeto sem habilitar producao no demo',()=>{
 const final=resolverAmbiente(env,'mobile-release');
 assert.equal(final.mobile,true);assert.equal(final.emuladores,false);assert.equal(final.host,'');assert.equal(final.config.projectId,'ponto-app-1c55a');
 assert.deepEqual(final.config,resolverAmbiente(env,'production').config);
 assert.throws(()=>resolverAmbiente(env,'mobile'),/inválido/);
 for(const mod of [{VITE_AP1303_DESTINO:''},{VITE_AP1303_DESTINO:'emuladores'},{VITE_FIREBASE_PROJECT_ID:'outro-projeto'},{VITE_EMULATOR_HOST:'127.0.0.1'},{VITE_TEST_FIREBASE_EMULADORES:'true'},{VITE_FIREBASE_API_KEY:''}])assert.throws(()=>resolverAmbiente({...env,...mod},'mobile-release'));
 const prefixes=prefixosCliente('mobile-release');
 assert.ok(prefixes.some(p=>'VITE_FIREBASE_PROJECT_ID'.startsWith(p)));
 assert.equal(prefixes.some(p=>'VITE_TEST_FIREBASE_API_KEY'.startsWith(p)),false);
});
