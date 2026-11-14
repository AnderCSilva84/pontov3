import { normalizarLeituraQr } from './scannerQr.js';
import { normalizarQrCupom } from './cupomQr.js';

const mensagens = {
  'qr/indisponivel': 'Leitor Google indisponível neste Android. Use o outro leitor.',
  'qr/servicos': 'Google Play services indisponível. Use o leitor atual.',
  'qr/ocupado': 'Feche a leitura nativa anterior com Voltar antes de tentar novamente.',
  'qr/modulo': 'Não foi possível preparar o módulo. Confira a conexão ou use o leitor atual.',
  'qr/cancelado': 'Leitura cancelada. Toque em Ler para uma nova tentativa.',
};

// Texto somente em memória durante a sessão; nunca publicado no painel ou persistido.
export function criarTesteQrNativo({ plugin, contextoValido = () => true, aoEstado = () => {}, aoLer, agora = () => performance.now() }) {
  let ativo = true, ocupado = false, candidato = null, versao = 0, suspenso = false;
  const valido = () => ativo && contextoValido();
  const publicar = estado => { if (valido()) { try { aoEstado(estado); } catch { /* Painel não controla a captura. */ } } };
  const erro = e => publicar({ fase: 'erro', mensagem: mensagens[e?.code] || 'Leitor nativo indisponível. Use o leitor atual.' });
  async function executar(preparar) {
    if (!valido() || ocupado || suspenso) return;
    ocupado = true; candidato = null; const rodada = ++versao;
    const vigente = () => valido() && versao === rodada;
    try {
      publicar({ fase: preparar ? 'preparando' : 'verificando' });
      if (preparar) { await plugin.prepararScannerNativo(); if (!vigente()) return; }
      const estado = await plugin.estadoScannerNativo(); if (!vigente()) return;
      if (!estado.disponivel) {
        publicar({ fase: 'modulo-ausente', mensagem: preparar ? 'Preparação solicitada. Aguarde o download do Google e toque em Ler para verificar novamente.' : 'Módulo ausente. Prepare o leitor com conexão antes do teste offline.' });
        return;
      }
      if (preparar) { publicar({ fase: 'pronto' }); return; }
      publicar({ fase: 'lendo' }); const inicio = agora();
      const resultado = await plugin.escanearNativo(); if (!vigente()) return;
      const leitura = normalizarLeituraQr(resultado?.textoBruto, 'android-nativo');
      if (!normalizarQrCupom(leitura.textoBruto)) { publicar({ fase: 'incompativel' }); return; }
      candidato = leitura;
      publicar({ fase: 'aguardando-confirmacao', tempoMs: Math.max(0, Math.round(agora() - inicio)) });
    } catch (e) { if (vigente()) erro(e); }
    finally { if (versao === rodada) ocupado = false; }
  }
  return {
    ler: () => executar(false), preparar: () => executar(true),
    confirmar() {
      if (!valido() || suspenso || !candidato || ocupado) return;
      const resultado = candidato; candidato = null;
      ativo = false; versao++;
      aoLer(resultado);
    },
    // Abrir a tela Google pode pausar a Activity. Nunca entrega automaticamente no retorno.
    pausar() {
      suspenso = true;
      if (candidato) publicar({ fase: 'pronto', mensagem: 'Leitura descartada ao sair do app. Faça uma nova tentativa.' });
      candidato = null;
    },
    retomar() {
      const interrompido = suspenso && ocupado;
      suspenso = false;
      if (!valido() || !interrompido) return;
      // Não aguarda um Task que pode ter perdido sua tela ao minimizar.
      // A ponte mantém a trava nativa até o SDK encerrar a captura anterior.
      versao++; ocupado = false; candidato = null;
      try { Promise.resolve(plugin.cancelarScannerNativo()).catch(() => {}); } catch { /* Binário antigo. */ }
      publicar({ fase: 'pronto', mensagem: 'Leitura interrompida ao sair do app. Toque em Ler para tentar novamente.' });
    },
    parar() {
      if (!ativo) return;
      ativo = false; versao++; candidato = null;
      try { Promise.resolve(plugin.cancelarScannerNativo()).catch(() => {}); } catch { /* Binário antigo. */ }
    },
  };
}
