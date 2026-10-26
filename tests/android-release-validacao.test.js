import test from 'node:test';
import assert from 'node:assert/strict';
import {validarConfiguracaoRelease} from '../scripts/android-release-validacao.mjs';
const config={nomePublico:'AP1303',applicationId:'br.app.casa',versionName:'1.0.0',versionCode:1,versionCodeDisponivel:true,firebaseProjectId:'casa-final',suporteUrl:'https://casa.com/suporte',privacidadeUrl:'https://casa.com/privacidade',exclusaoUrl:'https://casa.com/exclusao',recuperacaoUrl:'https://casa.com/recuperar',identidadeAprovada:true,privacidadeAprovada:true,assinaturaAprovada:true,backendAndroidValidado:true,acessoRevisaoValidado:true};
const opcoes={capacitor:{appId:'br.app.casa',android:{allowMixedContent:false}},stamp:{destino:'producao',emuladores:false,projectId:'casa-final'},google:{project_info:{project_id:'casa-final'},client:[{client_info:{android_client_info:{package_name:'br.app.casa'}}}]},assinatura:{storeFile:'upload.jks',keyAlias:'upload',certificadoSha256:'ab'.repeat(32)},arquivoExiste:()=>true,env:{AP1303_STORE_PASSWORD:'ficticia',AP1303_KEY_PASSWORD:'ficticia'}};

test('artefato local separa documentos pendentes sem dispensar segurança ou homologação',()=>{
 const pendente={...config,privacidadeAprovada:false,suporteUrl:'',privacidadeUrl:'',exclusaoUrl:'',recuperacaoUrl:''};
 assert.ok(validarConfiguracaoRelease(pendente,opcoes).length);
 const local={...opcoes,somenteArtefato:true};
 assert.equal(validarConfiguracaoRelease(pendente,local).length,0);
 for(const campo of ['assinaturaAprovada','backendAndroidValidado','acessoRevisaoValidado','versionCodeDisponivel'])assert.ok(validarConfiguracaoRelease({...pendente,[campo]:false},local).length);
 assert.ok(validarConfiguracaoRelease(pendente,{...local,stamp:{...opcoes.stamp,emuladores:true}}).length);
 assert.ok(validarConfiguracaoRelease(pendente,{...local,env:{}}).length);
});
test('preparação release recusa identidade debug, emuladores, assinatura/URLs ausentes e mistura Firebase',()=>{
 assert.equal(validarConfiguracaoRelease(config,opcoes).length,0);
 for(const c of [{...config,applicationId:'br.app.casa.dev'},{...config,privacidadeUrl:'http://127.0.0.1/p'},{...config,exclusaoUrl:'https://u:p@casa.com/p'},{...config,firebaseProjectId:'demo-ap1303'},{...config,identidadeAprovada:false}])assert.ok(validarConfiguracaoRelease(c,opcoes).length);
 for(const o of [{...opcoes,stamp:{...opcoes.stamp,emuladores:true}},{...opcoes,capacitor:{...opcoes.capacitor,server:{url:'https://casa.com'}}},{...opcoes,google:{}},{...opcoes,env:{}},{...opcoes,arquivoExiste:()=>false}])assert.ok(validarConfiguracaoRelease(config,o).length);
 const erros=validarConfiguracaoRelease({},{}).join(' ');assert.doesNotMatch(erros,/ficticia/);assert.ok(erros.includes('applicationId'));
});
test('release não aceita chave debug nem confunde PWA publicado com Android homologado',()=>{
 for(const campo of ['assinaturaAprovada','backendAndroidValidado','acessoRevisaoValidado','versionCodeDisponivel'])assert.ok(validarConfiguracaoRelease({...config,[campo]:false},opcoes).length);
 for(const assinatura of [{...opcoes.assinatura,keyAlias:'androiddebugkey'},{...opcoes.assinatura,storeFile:'C:\\seguro\\debug.keystore'},{...opcoes.assinatura,certificadoSha256:''},{...opcoes.assinatura,certificadoSha256:'6a4b3f5f402f9e72415f5aa50511d408651152c3e1a01880b3ad790ed461ea06'}])assert.ok(validarConfiguracaoRelease(config,{...opcoes,assinatura}).length);
 assert.equal(validarConfiguracaoRelease(config,{...opcoes,assinatura:{...opcoes.assinatura,certificadoSha256:Array(32).fill('AB').join(':')}}).length,0);
});
