import {Component} from 'react';
export default class RotaCarregamento extends Component {
 state={falhou:false};
 static getDerivedStateFromError(){return {falhou:true};}
 render(){return this.state.falhou?<main className="page-shell"><section className="card"><h1>Não foi possível abrir esta tela</h1><p>Confira sua conexão e tente novamente. Os dados locais não serão apagados.</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Tentar novamente</button></section></main>:this.props.children;}
}
