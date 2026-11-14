import { useEffect, useRef, useState } from 'react';

export default function TesteQrNativo({ aoLer, fechar, iniciar, usarAlternativo }) {
  const sessao = useRef(null), callbacks = useRef({ aoLer, fechar });
  const [estado, setEstado] = useState({ fase: 'pronto' });
  useEffect(() => { callbacks.current = { aoLer, fechar }; }, [aoLer, fechar]);
  useEffect(() => {
    let ativo = true;
    sessao.current = iniciar({ aoEstado: e => { if (ativo) setEstado(e); },
      aoLer: r => { if (ativo) callbacks.current.aoLer(r.textoBruto); }, aoCancelar: () => { if (ativo) callbacks.current.fechar(); } });
    return () => { ativo = false; sessao.current.parar(); };
  }, [iniciar]);
  const ocupado = ['verificando', 'preparando', 'lendo'].includes(estado.fase);
  return <section className="compras-form" aria-label="Leitor Google de QR Code"><h3>Ler QR Code com Google</h3>
    <p>A leitura acontece no celular. Se necessário, prepare o leitor com conexão à internet. Ler o QR não confirma nenhuma compra.</p>
    <p role="status">{estado.fase === 'aguardando-confirmacao' ? 'QR compatível reconhecido em ' + (estado.tempoMs / 1000).toFixed(1) + ' s. Confirme para preencher o link.' : estado.fase === 'modulo-ausente' ? estado.mensagem : estado.fase === 'incompativel' ? 'QR decodificado, mas incompatível com a validação fiscal atual.' : estado.mensagem || ({ pronto: 'Pronto para tentar.', verificando: 'Verificando módulo…', preparando: 'Preparando módulo…', lendo: 'Leitura na tela Google. Use Voltar para cancelar.' }[estado.fase])}</p>
    <div className="compras-acoes-principais"><button type="button" disabled={ocupado} onClick={() => sessao.current.ler()}>Ler com Google</button>
    <button type="button" disabled={ocupado} onClick={() => sessao.current.preparar()}>Preparar leitor (usa internet)</button>
    {estado.fase === 'aguardando-confirmacao' && <button type="button" onClick={() => sessao.current.confirmar()}>Usar leitura</button>}
    {usarAlternativo && <button type="button" disabled={ocupado} onClick={() => { sessao.current.parar(); usarAlternativo(); }}>Usar outro leitor</button>}
    <button type="button" onClick={fechar}>{usarAlternativo ? 'Cancelar leitura' : 'Voltar à comparação'}</button></div>
  </section>;
}
