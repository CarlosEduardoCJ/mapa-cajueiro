// Histórico de alterações (só administradores): quem mudou o quê, com o antes e o depois.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const TABELAS = ['locais', 'locais_traducoes', 'fotos', 'mapas', 'marcadores', 'categorias', 'categorias_traducoes', 'eventos', 'eventos_traducoes', 'noticias', 'noticias_traducoes', 'banners', 'banners_traducoes', 'secoes_inicio', 'configuracoes', 'perfis', 'permissoes_editor'];

export default function Historico() {
  const [linhas, setLinhas] = useState(null);
  const [tabela, setTabela] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLinhas(null);
    let consulta = supabase.from('historico').select('id, tabela, registro_id, acao, usuario_id, antes, depois, criado_em').order('criado_em', { ascending: false }).limit(200);
    if (tabela) consulta = consulta.eq('tabela', tabela);
    consulta.then(({ data, error }) => {
      if (error) setErro(mensagemAmigavel(error, 'carregar o histórico'));
      setLinhas(data || []);
    });
  }, [tabela]);

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Histórico</h1>
      <p style={{ margin: 0, color: '#4A6380', fontSize: 14 }}>As 200 alterações mais recentes. Ninguém pode apagar este histórico pelo painel.</p>
      <label className="campo" style={{ maxWidth: 360 }}>
        Mostrar só
        <select value={tabela} onChange={(e) => setTabela(e.target.value)}>
          <option value="">Todas as tabelas</option>
          {TABELAS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {linhas === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {linhas && linhas.length === 0 ? <p className="aviso aviso-info">Nada registrado ainda.</p> : null}
      {linhas?.map((l) => (
        <details key={l.id} className="cartao" style={{ padding: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
            {new Date(l.criado_em).toLocaleString('pt-BR')} · {l.acao} · {l.tabela}
          </summary>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div>
              <strong>Antes</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F4F9FF', padding: 8, borderRadius: 10 }}>{l.antes ? JSON.stringify(l.antes, null, 2) : '—'}</pre>
            </div>
            <div>
              <strong>Depois</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#F4F9FF', padding: 8, borderRadius: 10 }}>{l.depois ? JSON.stringify(l.depois, null, 2) : '—'}</pre>
            </div>
          </div>
        </details>
      ))}
    </>
  );
}
