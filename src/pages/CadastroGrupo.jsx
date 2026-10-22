import { useState } from 'react';
import { cadastrarTitular } from '../services/auth';
import { PageHeader } from '../components/ui';

export default function CadastroGrupo({ user, onNavigate }) {
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false);
  async function salvar(e) {
    e.preventDefault(); const dados = Object.fromEntries(new FormData(e.currentTarget));
    setOcupado(true); setErro('');
    try { await cadastrarTitular(dados); window.location.assign('/admin'); }
    catch (e) { setErro(e.code === 'auth/email-already-in-use' ? 'Este email já tem login. Entre na conta existente para acessar seus dados.' : e.message); }
    finally { setOcupado(false); }
  }
  return <div className="page-bg"><main className="page-shell"><PageHeader title="Seu grupo no AP1303" subtitle="Cada pessoa tem seu próprio login. Os dados ficam no seu grupo." back={() => onNavigate(user ? '/admin' : '/ponto')} /><section className="card">{user ? <><p>Você já possui acesso a um grupo. Seus dados e acessos atuais foram preservados.</p><button className="btn btn-primary" onClick={() => onNavigate('/admin')}>Acessar meu grupo</button></> : <form className="compras-form" onSubmit={salvar}><label className="field"><span>Seu nome</span><input name="nome" required maxLength={120} autoComplete="name" /></label><label className="field"><span>Nome do grupo</span><input name="nomeGrupo" required maxLength={80} placeholder="Ex.: Casa da família" /></label><label className="field"><span>Email</span><input type="email" name="email" required autoComplete="email" /></label><label className="field"><span>Senha</span><input type="password" name="senha" required minLength={8} maxLength={128} autoComplete="new-password" /></label>{erro && <p role="alert" className="mensagem erro">{erro}</p>}<button className="btn btn-primary" disabled={ocupado}>{ocupado ? 'Criando seu grupo…' : 'Criar minha conta e grupo'}</button><p className="text-muted">Depois, cadastre as pessoas e escolha seus perfis em Gestão.</p></form>}</section></main></div>;
}
