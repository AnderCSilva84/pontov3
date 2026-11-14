import { useState } from 'react';

export default function SenhaInput(props) {
  const [visivel, setVisivel] = useState(false);
  return <span className="senha-controle"><input {...props} type={visivel ? 'text' : 'password'} /><button type="button" className="btn btn-secondary" aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visivel} onClick={() => setVisivel(v => !v)}>{visivel ? 'Ocultar' : 'Mostrar'}</button></span>;
}
