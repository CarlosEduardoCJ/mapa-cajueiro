// Lista de locais no painel. Clicar em "Editar" abre o cadastro completo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { nomeCategoria } from '../../lib/locais.js';

const ROTULO_STATUS = { rascunho: 'Rascunho', publicado: 'Publicado', inativo: 'Inativo' };

export default function Locais() {
  const [locais, setLocais] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    const { data, error } = await supabase
      .from('locais')
      .select('id, nome, tipo, status, eh_demonstracao, categorias ( categorias_traducoes ( nome, idioma ) )')
      .order('criado_em', { ascending: false });
    if (error) setErro('Não foi possível carregar os locais.');
    setLocais(data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Locais</h1>
        <Link to="/admin/locais/novo" className="btn btn-azul">Cadastrar novo local</Link>
      </div>

      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {locais === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {locais && locais.length === 0 ? (
        <p className="aviso aviso-info">Nenhum local cadastrado ainda.</p>
      ) : null}

      {locais && locais.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {locais.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.nome} {l.eh_demonstracao ? <span className="etiqueta-demo">Demonstração</span> : null}
                  </td>
                  <td>{l.tipo === 'ponto_turistico' ? 'Ponto turístico' : 'Estabelecimento'}</td>
                  <td>{nomeCategoria(l) || '—'}</td>
                  <td>{ROTULO_STATUS[l.status] || l.status}</td>
                  <td>
                    <Link to={`/admin/locais/${l.id}`}>Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
