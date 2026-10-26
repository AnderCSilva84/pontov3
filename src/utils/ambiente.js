// Compartilhado pelo Vite e pelo cliente: destino de teste nunca tem fallback de produção.
export const prefixosCliente = modo => modo === 'mobile' ? ['VITE_AP1303_', 'VITE_EMULATOR_', 'VITE_TEST_'] : modo === 'mobile-release' ? ['VITE_AP1303_', 'VITE_FIREBASE_'] : 'VITE_';
export function resolverAmbiente(env, modo = '') {
  const release = modo === 'mobile-release';
  const mobile = modo === 'mobile' || release;
  const destino = env.VITE_AP1303_DESTINO || (modo === 'compras-test' ? 'emuladores' : 'producao');
  if (mobile && !env.VITE_AP1303_DESTINO) throw Error('Mobile exige VITE_AP1303_DESTINO explícito.');
  if (!['producao', 'emuladores', 'teste'].includes(destino) || (modo === 'mobile' && destino === 'producao')) throw Error('Destino mobile/desenvolvimento inválido. Use o modo final separado para produção.');
  if (release && (destino !== 'producao' || env.VITE_FIREBASE_PROJECT_ID !== 'ponto-app-1c55a' || env.VITE_EMULATOR_HOST || env.VITE_TEST_FIREBASE_EMULADORES)) throw Error('Release exige o projeto compartilhado aprovado, sem configuração de emuladores.');
  let config;
  if (destino === 'emuladores') {
    config = {apiKey:'demo-key', authDomain:'localhost', projectId:'demo-ap1303', appId:'demo-ap1303'};
  } else {
    const prefixo = destino === 'teste' ? 'VITE_TEST_FIREBASE_' : 'VITE_FIREBASE_';
    config = Object.fromEntries(Object.entries({apiKey:'API_KEY',authDomain:'AUTH_DOMAIN',projectId:'PROJECT_ID',storageBucket:'STORAGE_BUCKET',messagingSenderId:'MESSAGING_SENDER_ID',appId:'APP_ID'}).map(([chave,sufixo])=>[chave,env[prefixo+sufixo]]));
    if (destino === 'teste' && (!config.apiKey || !config.appId || !config.authDomain || !config.projectId || config.projectId === 'ponto-app-1c55a' || config.projectId === env.VITE_FIREBASE_PROJECT_ID || config.projectId.startsWith('demo-'))) throw Error('Informe configuração VITE_TEST_FIREBASE_* de um projeto dedicado, diferente da produção.');
  }
  if (release && ['apiKey','authDomain','projectId','appId','messagingSenderId'].some(campo=>!config[campo])) throw Error('Configuração pública de produção incompleta.');
  const flagEmuladores = env.VITE_TEST_FIREBASE_EMULADORES;
  if (flagEmuladores && (destino !== 'teste' || !['true','false'].includes(flagEmuladores))) throw Error('Emuladores do projeto dedicado exigem destino teste e flag true/false explícita.');
  const emuladores = destino === 'emuladores' || (destino === 'teste' && flagEmuladores === 'true');
  const host = env.VITE_EMULATOR_HOST || (mobile ? '' : '127.0.0.1');
  if (emuladores && (!/^[a-zA-Z0-9.-]+$/.test(host) || host === '0.0.0.0')) throw Error('Informe VITE_EMULATOR_HOST sem protocolo/porta; use host local ou LAN de teste.');
  return {mobile,destino,config,host,emuladores,teste:destino !== 'producao'};
}
