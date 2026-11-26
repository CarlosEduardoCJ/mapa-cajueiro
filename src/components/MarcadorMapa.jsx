// Marcador de um local sobre o mapa (usado no mapa público e no editor do painel).
// - estilo "logo": mostra o logo do local (ou a inicial, se não houver logo).
// - estilo "area": círculo transparente sobre um logo que já está desenhado no mapa. Ao passar o mouse,
//   focar ou tocar, aparece o anel amarelo e o nome do local num balão.
import { urlImagem } from '../lib/supabase.js';
import { inicial } from '../lib/utils.js';

export default function MarcadorMapa({ nome, logoPath, estilo = 'logo', className = '', style, ...resto }) {
  const area = estilo === 'area';
  return (
    <button
      type="button"
      data-marcador
      className={`marcador${area ? ' marcador-area' : ''} ${className}`.trim()}
      style={style}
      // Sem menu do botão direito sobre os marcadores
      onContextMenu={(e) => e.preventDefault()}
      aria-label={nome}
      {...resto}
    >
      {area ? (
        <span className="marcador-balao" aria-hidden="true">{nome}</span>
      ) : logoPath ? (
        <img src={urlImagem(logoPath)} alt="" draggable={false} className="marcador-logo" />
      ) : (
        <span className="marcador-pino">{inicial(nome)}</span>
      )}
    </button>
  );
}
