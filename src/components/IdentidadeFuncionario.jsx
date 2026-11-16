import AvatarPerfil from './AvatarPerfil';
export default function IdentidadeFuncionario({ funcionario, perfil, children }) {
  const foto = typeof funcionario?.fotoUrl === 'string' && /^https:\/\//.test(funcionario.fotoUrl) ? funcionario.fotoUrl : null;
  const pessoa = perfil || { nome: funcionario?.nome || 'Funcionário', fotoInteracao: foto };
  return <span className="funcionario-identidade"><AvatarPerfil usuario={pessoa} /><span>{children || funcionario?.nome || perfil?.nome || 'Funcionário'}</span></span>;
}
