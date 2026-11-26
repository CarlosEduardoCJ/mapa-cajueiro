// Cópia de segurança dos dados (só administradores). Gera um arquivo .json para guardar fora do Supabase.
// O plano gratuito não tem backup automático, por isso esta rotina deve ser feita de tempos em tempos.
import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';

// Tabelas com o conteúdo do site (não inclui contas de login, que ficam no Supabase Auth)
const TABELAS = [
  'configuracoes', 'categorias', 'categorias_traducoes', 'locais', 'locais_traducoes', 'fotos',
  'mapas', 'marcadores', 'eventos', 'eventos_traducoes', 'noticias', 'noticias_traducoes',
  'banners', 'banners_traducoes', 'secoes_inicio', 'historico',
];

export default function Backup() {
  const [andamento, setAndamento] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  async function baixar() {
    setAndamento(true);
    setMensagem(null);
    try {
      const copia = { gerado_em: new Date().toISOString(), tabelas: {} };
      for (const tabela of TABELAS) {
        const { data, error } = await supabase.from(tabela).select('*');
        if (error) throw new Error(`${tabela}: ${error.message}`);
        copia.tabelas[tabela] = data || [];
      }
      const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const data = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-mapa-cajueiro-${data}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMensagem({ tipo: 'ok', texto: 'Arquivo baixado. Guarde em outro lugar (pendrive, Google Drive da equipe).' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    }
    setAndamento(false);
  }

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Cópia de segurança</h1>
      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Gera um arquivo com os textos, locais, mapa, eventos, notícias, banners e configurações.
          <strong> As imagens não entram no arquivo</strong>: elas ficam no armazenamento do Supabase (bucket "midia") e devem ser copiadas por lá.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: '#4A6380' }}>Recomendado: uma vez por mês e antes de mudanças grandes.</p>
        <div>
          <button className="btn btn-azul" onClick={baixar} disabled={andamento}>
            {andamento ? 'Gerando arquivo…' : 'Baixar cópia dos dados'}
          </button>
        </div>
        {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}
      </section>
    </>
  );
}
