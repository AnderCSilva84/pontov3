import "../styles/carregando.css";

export default function CarregandoGatinho() {
  return (
    <div className="carregando-gatinho" role="status" aria-live="polite">
      <div className="carregando-pista" aria-hidden="true">
        <svg className="gatinho-relogio" viewBox="0 0 64 100">
          <rect x="3" y="3" width="58" height="88" rx="12" fill="#2f7b5f" />
          <rect x="10" y="12" width="44" height="25" rx="5" fill="#e5f2e8" />
          <text x="32" y="29" textAnchor="middle" fontSize="12" fontFamily="monospace" fill="#245f49">08:00</text>
          <rect x="15" y="46" width="34" height="31" rx="8" fill="#245f49" />
          <path d="M24 61 Q24 51 32 51 Q40 51 40 61 M28 65 V59 Q32 54 36 59 V67 M32 59 V70" fill="none" stroke="#a5ccb5" strokeWidth="2" strokeLinecap="round" />
          <g className="gatinho-confirmacao">
            <circle cx="32" cy="61" r="14" fill="#e5f2e8" />
            <path d="M25 61 L30 66 L39 56" fill="none" stroke="#2f7b5f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="M19 96 H45" stroke="#b6ae9f" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="gatinho-corredor">
          <svg viewBox="0 0 100 72" className="gatinho-desenho">
            <ellipse cx="49" cy="64" rx="31" ry="3" fill="#73624c" opacity=".12" />
            <g fill="none" stroke="#c98b51" strokeWidth="9" strokeLinecap="round">
              <path className="gatinho-cauda" d="M29 40 Q5 37 13 17" />
              <path className="gatinho-pata gatinho-pata-atras" d="M35 47 L24 61" />
              <path className="gatinho-pata gatinho-pata-frente" d="M62 47 L75 61" />
            </g>
            <ellipse cx="46" cy="40" rx="27" ry="17" fill="#e9ad70" />
            <g fill="none" stroke="#e9ad70" strokeWidth="9" strokeLinecap="round">
              <path className="gatinho-pata gatinho-pata-frente" d="M34 48 L43 61" />
              <path className="gatinho-pata gatinho-pata-toque" d="M61 47 L55 61" />
            </g>
            <g className="gatinho-cabeca">
              <path d="M58 28 L57 7 L72 17 L87 9 L88 33Z" fill="#e9ad70" />
              <path d="M61 13 L63 25 L70 20 M79 21 L84 15 L84 27" fill="#edbfaf" />
              <ellipse cx="73" cy="31" rx="19" ry="17" fill="#e9ad70" />
              <ellipse cx="79" cy="39" rx="11" ry="7" fill="#fff2df" />
              <path d="M68 29 Q71 25 74 29" fill="none" stroke="#493727" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M83 32 L87 34 L83 37Z" fill="#a25f56" />
              <path d="M72 37 L61 35 M72 41 L61 43" stroke="#a46f47" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M63 18 L67 22 M72 16 L74 21" stroke="#c98b51" strokeWidth="3" strokeLinecap="round" />
            </g>
            <path d="M39 25 L37 33 M49 24 L47 31" stroke="#c98b51" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="carregando-mensagem">
        <p>Preparando seu app<span className="carregando-reticencias" aria-hidden="true">...</span></p>
        <span>O gatinho já está indo bater o ponto!</span>
      </div>
    </div>
  );
}
