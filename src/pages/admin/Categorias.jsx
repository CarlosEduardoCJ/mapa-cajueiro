// Categorias: o nome de cada categoria em português, inglês e espanhol.
// Traduções feitas pela equipe (sem tradução automática).
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const IDIOMAS_ADMIN = [
  { codigo: 'pt', rotulo: 'Português' },
  { codigo: 'en', rotulo: 'Inglês' },
  { codigo: 'es', rotulo: 'Espanhol' },
];

export default function Categorias() {
  const [categorias, setCategorias] = useState(null);
  const [nomes, setNomes] = useState({}); // { [categoriaId]: { pt, en, es } }
  const [mensagem, setMensagem] = useState(null);
  const [salvandoId, setSalvandoId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categorias')
        .select('id, slug, tipo, ordem, categorias_traducoes ( nome, idioma )')
        .order('tipo')
        .order('ordem');
      const lista = data || [];
      setCategorias(lista);
      const mapa = {};
      lista.forEach((c) => {
        mapa[c.id] = { pt: '', en: '', es: '' };
        (c.categorias_traducoes || []).forEach((t) => {
          mapa[c.id][t.idioma] = t.nome;
        });
      });
      setNomes(mapa);
    })();
  }, []);

  function mudar(id, idioma, valor) {
    setNomes((n) => ({ ...n, [id]: { ...n[id], [idioma]: valor } }));
  }

  async function salvar(categoria) {
    setSalvandoId(categoria.id);
    setMensagem(null);
    const linhas = IDIOMAS_ADMIN.filter((i) => nomes[categoria.id][i.codigo]?.trim()).map((i) => ({
      categoria_id: categoria.id,
      idioma: i.codigo,
      nome: nomes[categoria.id][i.codigo].trim(),
    }));
    if (!nomes[categoria.id].pt?.trim()) {
      setSalvandoId(null);
      setMensagem({ tipo: 'erro', texto: 'O nome em português é obrigatório.' });
      return;
    }
    const { error } = await supabase.from('categorias_traducoes').upsert(linhas);
    setSalvandoId(null);
    setMensagem(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: `Nomes de "${nomes[categoria.id].pt}" salvos.` });
  }

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Categorias</h1>
      <p style={{ margin: 0, color: '#4A6380', fontSize: 14 }}>
        Preencha o nome em inglês e espanhol. Se ficar vazio, o site mostra o nome em português.
      </p>
      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}
      {categorias === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}

      {categorias?.map((c) => (
        <section key={c.id} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <strong>{c.tipo === 'ponto_turistico' ? 'Ponto turístico' : 'Estabelecimento'} · {c.slug}</strong>
          <div className="grade-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {IDIOMAS_ADMIN.map((i) => (
              <label key={i.codigo} className="campo">
                {i.rotulo}{i.codigo === 'pt' ? ' *' : ''}
                <input value={nomes[c.id]?.[i.codigo] || ''} onChange={(e) => mudar(c.id, i.codigo, e.target.value)} />
              </label>
            ))}
          </div>
          <div>
            <button className="btn btn-azul" disabled={salvandoId === c.id} onClick={() => salvar(c)}>
              {salvandoId === c.id ? 'Salvando…' : 'Salvar nomes'}
            </button>
          </div>
        </section>
      ))}
    </>
  );
}
