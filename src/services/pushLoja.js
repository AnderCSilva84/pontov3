import {suspenderPushAndroid} from './pushNativo';
export async function suspenderPushLocal({remoto=true}={}) {
  try { await suspenderPushAndroid(remoto); } catch { /* Logout continua disponível offline. */ }
}
// O gesto/permissão nativo continua em Minha conta; nenhum worker web na loja.
export async function solicitarPermissaoPushNoLogin() {}
