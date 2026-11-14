import {PageHeader} from '../components/ui';
import BottomNav from '../components/BottomNav';
import ProgramacaoAlimentar from '../components/ProgramacaoAlimentar';
import '../styles/nav.css';

export default function Alimentacao({user,onNavigate}){
 return <div className="page-bg"><main className="page-shell"><PageHeader title="Minha alimentação" subtitle="Sua programação de refeições, separada do ponto e da rotina de trabalho."/>
  {user?<ProgramacaoAlimentar key={user.uid+':'+user.grupoId} user={user}/>:<section className="card"><p>Entre na sua conta para consultar suas refeições.</p><button className="btn btn-primary" onClick={()=>onNavigate('/ponto')}>Entrar na minha conta</button></section>}
 </main><BottomNav activePath="/alimentacao" user={user} onNavigate={onNavigate}/></div>;
}
