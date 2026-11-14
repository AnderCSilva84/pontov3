import {useContext} from 'react';
import AvatarPerfil from './AvatarPerfil';
import {PessoasInteracoesContext} from '../context/PessoasInteracoesContext';
import '../styles/pessoa-interacao.css';
export default function PessoaInteracao({uid,nome,rotulo}){
 const pessoas=useContext(PessoasInteracoesContext),p=pessoas[uid];
 const usuario={uid,nome:nome||p?.nome||'Autoria não disponível',fotoPerfilVersao:p?.fotoPerfilVersao||0,fotoInteracao:p?.fotoInteracao||null};
 return <span className="pessoa-interacao"><AvatarPerfil usuario={usuario} className="pessoa-interacao-avatar"/><span className="pessoa-interacao-nome">{rotulo&&<small>{rotulo}</small>}<strong>{usuario.nome}</strong></span></span>;
}
