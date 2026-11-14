import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('rebranding mantém identidade da instalação PWA e caminhos de entrada',()=>{
 const m=JSON.parse(read('public/manifest.json'));
 assert.deepEqual([m.id,m.scope,m.start_url],['/','/','/ponto']);
 assert.equal(m.name,'Tá no Ponto');assert.equal(m.short_name,m.name);
 for(const icon of m.icons){const png=readFileSync('public'+icon.src);const [w,h]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);}
});
test('rebranding preserva canais, contratos, fila e cache existentes',()=>{
 assert.match(read('src/services/pontoFila.js'),/nome='ap1303-ponto-v1'/);
 assert.match(read('functions/no-bolso-bridge.cjs'),/source: 'AP1303'/);
 const sw=read('public/firebase-messaging-sw.js');assert.match(sw,/ap1303-shell-/);assert.match(sw,/ap1303-push-sessao/);assert.match(sw,/data.uid !== parametros.get\("uid"\)/);
 assert.match(read('vite.config.js'),/publicos=\[[^\]]*marca-ta-no-ponto.png/);
 const config=JSON.parse(read('capacitor.config.json'));assert.equal(config.appId,'br.dev.acstech.ap1303.dev');assert.equal(config.appName,'Tá no Ponto');
 assert.match(read('android/app/build.gradle'),/variant.applicationId.set\('br.dev.acstech.ap1303'\)/);
 for(const variant of ['main','debug','release'])assert.doesNotMatch(read(`android/app/src/${variant}/res/values/strings.xml`),/>AP1303(?: Teste)?</);
});
