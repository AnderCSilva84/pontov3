import { useEffect, useRef, useState } from 'react';
import { consultarPontoTitular, selecionarPontoTitular, registrarPontoTitular, reconciliarPontoTitular, lerTentativaTitular } from '../services/pontoTitular';
import { cadastrarFuncionario } from '../services/funcionariosCadastro';
import { obterPosicaoAtual } from '../utils/localizacao';
const labels = { ENTRADA: 'Registrar entrada', SAIDA_INTERVALO: 'Iniciar intervalo', ENTRADA_INTERVALO: 'Retornar do intervalo', SAIDA: 'Registrar saída', ENCERRADO: 'Jornada encerrada' };

export default function PontoTitular({ user }) {
  const [info, setInfo] = useState(null), [selecionados, setSelecionados] = useState([]), [funcionarioId, setFuncionarioId] = useState('');
  const [confirmado, setConfirmado] = useState(false), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState(''), [aviso, setAviso] = useState(''), [pendente, setPendente] = useState(null), [nome, setNome] = useState('');
  const vivo = useRef(true), trava = useRef(false), cadastro = useRef(null);
  const pessoa = info?.funcionarios?.find(f => f.id === funcionarioId);
  useEffect(() => {
    vivo.current = true;
    const parar = () => { vivo.current = false; };
    window.addEventListener('ap1303-ponto-sair', parar);
    if (user.grupoId) {
      try { setPendente(lerTentativaTitular(user)); } catch (e) { setErro(e.message); }
      consultarPontoTitular(user).then(r => { if (vivo.current) { setInfo(r); setSelecionados(r.funcionarioIds || []); } }).catch(e => { if (vivo.current) setErro(e.message || 'Não foi possível consultar o terminal.'); });
    }
    return () => { vivo.current = false; window.removeEventListener('ap1303-ponto-sair', parar); };
  }, [user.uid, user.grupoId, user]);
  async function atualizar() {
    const r = await consultarPontoTitular(user);
    if (vivo.current) { setInfo(r); setSelecionados(r.funcionarioIds || []); setPendente(lerTentativaTitular(user)); }
  }
  async function executar(fn) {
    if (trava.current || !vivo.current) return;
    trava.current = true; setOcupado(true); setErro(''); setAviso('');
    try { await fn(); if (vivo.current) await atualizar(); }
    catch (e) { if (vivo.current) { setErro(e.message || 'Não foi possível concluir.'); try { setPendente(lerTentativaTitular(user)); } catch { /* A mensagem original permanece; não sobrescrever pendência inválida. */ } } }
    finally { trava.current = false; if (vivo.current) setOcupado(false); }
  }
  const mostrarResultado = r => {
    if (!vivo.current || !r) return;
    if (r.status === 'confirmado') setAviso(`Marcação confirmada em ${r.dataKey} às ${r.hora}. Registrada pelo titular para o funcionário selecionado.`);
    else setAviso(r.mensagem || 'Tentativa reconciliada sem nova marcação.');
    setConfirmado(false);
  };
  if (!user.grupoId || info?.habilitado === false && !pendente) return null;
  return <section className="card" aria-busy={ocupado}><h2>Ponto no aparelho do titular · Free</h2><p>Até dois funcionários, sem login individual. Cada marcação identifica o titular e o funcionário. Este terminal requer conexão.</p>
    {erro && <p role="alert">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
    {pendente ? <><p role="alert">Há um envio sem resultado conhecido. Reconcilie a tentativa original antes de registrar outra marcação; o GPS não será recapturado.</p><button className="btn btn-secondary" disabled={ocupado} onClick={() => executar(async () => mostrarResultado(await reconciliarPontoTitular(user)))}>Reconciliar tentativa</button></> : info?.habilitado ? <>
      <details><summary>Funcionários autorizados para novas entradas ({selecionados.length}/2)</summary><p>A escolha deve ser confirmada. Retirar alguém da seleção não impede concluir uma jornada já aberta.</p>
        {info.funcionarios.map(f => <div key={f.id}><label><input type="checkbox" checked={selecionados.includes(f.id)} disabled={ocupado || !f.ativo || !selecionados.includes(f.id) && selecionados.length >= 2} onChange={e => setSelecionados(ids => e.target.checked ? [...ids, f.id] : ids.filter(id => id !== f.id))} /> {f.nome}{!f.ativo && ' · arquivado'}</label>{f.ativo && <button type="button" className="compras-link" disabled={ocupado || f.aberta} onClick={() => { if (window.confirm(`Arquivar ${f.nome}, preservando o histórico?`)) executar(() => cadastrarFuncionario('arquivar', f.id)); }}>Arquivar</button>}</div>)}
        <button className="btn btn-secondary" disabled={ocupado} onClick={() => executar(() => selecionarPontoTitular(user, selecionados, crypto.randomUUID()))}>Confirmar seleção</button>
        <form onSubmit={e => { e.preventDefault(); executar(async () => { const n = nome.trim(); if (!n) return; if (cadastro.current?.nome !== n) cadastro.current = { nome: n, id: crypto.randomUUID() }; await cadastrarFuncionario('criar', cadastro.current.id, n); cadastro.current = null; if (vivo.current) setNome(''); }); }}><label className="field">Cadastrar funcionário sem login<input value={nome} maxLength={120} onChange={e => setNome(e.target.value)} required disabled={ocupado} /></label><button className="btn btn-secondary" disabled={ocupado}>Cadastrar funcionário</button></form>
      </details>
      {!info.selecaoConfirmada && <p role="status">Confirme a seleção de até dois funcionários antes de iniciar jornadas.</p>}
      <label className="field">Quem está registrando o ponto?<select value={funcionarioId} disabled={ocupado} onChange={e => { setFuncionarioId(e.target.value); setConfirmado(false); }}>{!funcionarioId && <option value="">Selecione</option>}{info.funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}{f.aberta ? ' · jornada aberta' : !f.selecionado ? ' · fora da seleção' : ''}</option>)}</select></label>
      {pessoa && <><p>Hoje: entrada {pessoa.dia.entrada || '—'} · intervalo {pessoa.dia.saidaIntervalo || '—'} / {pessoa.dia.entradaIntervalo || '—'} · saída {pessoa.dia.saida || '—'}</p><label><input type="checkbox" checked={confirmado} disabled={ocupado} onChange={e => setConfirmado(e.target.checked)} /> Confirmo que estou registrando para {pessoa.nome}.</label><button className="btn btn-primary" disabled={ocupado || !confirmado || pessoa.proximaAcao === 'ENCERRADO' || pessoa.proximaAcao === 'ENTRADA' && (!pessoa.selecionado || !info.selecaoConfirmada || !pessoa.ativo)} onClick={() => executar(async () => {
        if (navigator.onLine === false) throw Error('Conecte o aparelho antes de registrar. Nenhum horário foi enviado.');
        const posicao = await obterPosicaoAtual(); if (!vivo.current) return;
        const r = await registrarPontoTitular(user, { acao: 'registrar', funcionarioId: pessoa.id, tipo: pessoa.proximaAcao, operacaoId: crypto.randomUUID(), latitude: posicao.latitude, longitude: posicao.longitude, confirmouFuncionario: true, dataEsperada: info.dataKey });
        mostrarResultado(r);
      })}>{ocupado ? 'Aguarde…' : labels[pessoa.proximaAcao]}</button></>}
    </> : <button className="btn btn-secondary" disabled={ocupado} onClick={() => executar(atualizar)}>Consultar disponibilidade</button>}
    <p>Configure os locais e a jornada em Gestão → Ponto, ajustes e locais. Jornadas de datas anteriores devem ser revisadas em Gestão.</p>
  </section>;
}
