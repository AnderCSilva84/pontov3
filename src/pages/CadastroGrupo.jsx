import SenhaInput from '../components/SenhaInput';
import { useEffect, useState } from 'react';
import { cadastrarTitular, observarCadastroTitular } from '../services/auth';
import {ambiente} from '../services/firebase';
import { PageHeader } from '../components/ui';

export default function CadastroGrupo({ user, onNavigate }) {
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  const [cadastro,setCadastro]=useState({autenticada:false,rascunho:null});
  useEffect(()=>observarCadastroTitular(setCadastro),[]);
  async function salvar(e) {
    e.preventDefault(); const dados = Object.fromEntries(new FormData(e.currentTarget));
    if (!cadastro.autenticada && dados.senha !== dados.confirmacaoSenha) { setErro('As senhas não coincidem. Confira e tente novamente.'); return; }
    delete dados.confirmacaoSenha;
    setOcupado(true); setErro('');
    try { await cadastrarTitular(dados); window.location.assign('/admin'); }
    catch (e) {
      const etapa=e.etapaCadastro==='grupo'?'criação do grupo':'criação da conta';
      setErro(e.code === 'auth/email-already-in-use' ? 'Este email já tem login. Entre na conta existente e volte aqui para concluir o grupo.' : ['auth/network-request-failed','functions/unavailable','functions/deadline-exceeded'].includes(e.code)?`Falha de conexão na ${etapa} (${e.code}). ${e.etapaCadastro==='grupo'?'Sua conta foi criada. Restabeleça a conexão e toque em Concluir meu grupo, sem criar outra conta.':'Confira a conexão com o ambiente de teste antes de tentar novamente.'}`:e.message);
    }
    finally { setOcupado(false); }
  }
  return <div className="page-bg"><main className="page-shell"><PageHeader title="Seu grupo no Tá no Ponto" subtitle="Cada pessoa tem seu próprio login. Os dados ficam no seu grupo." back={() => onNavigate(user ? '/admin' : '/ponto')} /><section className="card">{user ? <><p>Você já possui acesso a um grupo. Seus dados e acessos atuais foram preservados.</p><button className="btn btn-primary" onClick={() => onNavigate('/admin')}>Acessar meu grupo</button></> : <form key={cadastro.rascunho?.uid||'nova'} className="compras-form" onSubmit={salvar}>
    {cadastro.autenticada && <p role="status">Sua conta já está conectada. Conclua a criação do grupo sem cadastrar outro login.</p>}
    <label className="field"><span>Seu nome</span><input name="nome" required maxLength={120} autoComplete="name" defaultValue={cadastro.rascunho?.nome||''} /></label><label className="field"><span>Nome do grupo</span><input name="nomeGrupo" required maxLength={80} placeholder="Ex.: Casa da família" defaultValue={cadastro.rascunho?.nomeGrupo||''} /></label>
    {!cadastro.autenticada && <><label className="field"><span>Email</span><input type="email" name="email" required autoComplete="email" /></label><label className="field"><span>Senha</span><SenhaInput name="senha" required minLength={8} maxLength={128} autoComplete="new-password" /></label><label className="field"><span>Confirme a senha</span><SenhaInput name="confirmacaoSenha" required minLength={8} maxLength={128} autoComplete="new-password" /></label></>}
    {erro && <p role="alert" className="mensagem erro">{erro}</p>}<button className="btn btn-primary" disabled={ocupado}>{ocupado ? 'Criando seu grupo…' : cadastro.autenticada?'Concluir meu grupo':'Criar minha conta e grupo'}</button><p className="text-muted">Depois, cadastre as pessoas e escolha seus perfis em Gestão.</p>
    {ambiente.destino==='emuladores' && <details><summary>Conexão de desenvolvimento</summary><p>Projeto demo-ap1303 · host {ambiente.host} · Auth 9098 · Firestore 8877 · Functions 5007.</p><p>No celular USB, use o APK com host 127.0.0.1, autorize a depuração e configure adb reverse para as três portas. Mantenha os três emuladores em execução no computador. 10.0.2.2 é exclusivo do Android Emulator.</p></details>}
  </form>}</section></main></div>;
}
