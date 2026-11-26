// Texto da página Sobre, nos três idiomas. Fica na tabela "configuracoes" (chave "sobre").
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function SobreAdmin() {
  const [textos, setTextos] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'sobre')
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.valor && typeof data.valor === 'object' ? data.valor : {};
        setTextos({ pt: v.pt || '', en: v.en || '', es: v.es || '' });
      });
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    const { error } = await supabase.from('configuracoes').upsert({
      chave: 'sobre',
      valor: textos,
      publico: true,
      descricao: 'Texto da página Sobre (pt, en, es)',
    });
    setSalvando(false);
    setMensagem(error ? { tipo: 'erro', texto: error.message } : { tipo: 'ok', texto: 'Texto da página Sobre salvo.' });
  }

  if (!textos) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Página Sobre</h1>
      <p style={{ margin: 0, fontSize: 14, color: '#4A6380' }}>
        Escreva o texto aqui. Não coloque informações que a equipe ainda não confirmou. Se o inglês ou o espanhol ficar vazio, o site mostra o português.
      </p>
      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}
      {[
        { codigo: 'pt', rotulo: 'Português' },
        { codigo: 'en', rotulo: 'Inglês' },
        { codigo: 'es', rotulo: 'Espanhol' },
      ].map((i) => (
        <label key={i.codigo} className="campo">
          {i.rotulo}
          <textarea style={{ minHeight: 180 }} value={textos[i.codigo]} onChange={(e) => setTextos((t) => ({ ...t, [i.codigo]: e.target.value }))} />
        </label>
      ))}
      <div>
        <button type="submit" className="btn btn-azul" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar texto'}</button>
      </div>
    </form>
  );
}
