// Página inicial no painel: banners (foto do topo com textos) e ordem/visibilidade das seções.
import { useEffect, useState } from 'react';
import { supabase, urlImagem } from '../../lib/supabase.js';
import { enviarImagem, nomeUnico } from '../../lib/imagens.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const NOMES_SECOES = {
  banner: 'Topo (banner)',
  categorias: 'Faixa de categorias',
  mapa: 'No mapa (todos os locais)',
  destaques: 'Destaques',
  pontos_turisticos: 'Turismo e pontos turísticos',
  hospedagem: 'Hospedagem',
  gastronomia: 'Gastronomia',
  eventos: 'Eventos',
  noticias: 'Notícias',
  contato: 'Contato (WhatsApp)',
};

export default function PaginaInicio() {
  const [secoes, setSecoes] = useState(null);
  const [banners, setBanners] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [editando, setEditando] = useState(null); // banner em edição ou { novo: true }

  async function carregar() {
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('secoes_inicio').select('chave, ordem, visivel').order('ordem'),
      supabase.from('banners').select('id, imagem_path, link, ordem, ativo, banners_traducoes ( idioma, titulo, subtitulo, texto_botao )').order('ordem'),
    ]);
    setSecoes(s || []);
    setBanners(b || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  // Troca a posição de duas seções (sobe ou desce uma)
  async function moverSecao(indice, direcao) {
    const outro = indice + direcao;
    if (outro < 0 || outro >= secoes.length) return;
    const a = secoes[indice];
    const b = secoes[outro];
    const { error: e1 } = await supabase.from('secoes_inicio').update({ ordem: b.ordem }).eq('chave', a.chave);
    const { error: e2 } = await supabase.from('secoes_inicio').update({ ordem: a.ordem }).eq('chave', b.chave);
    if (e1 || e2) setMensagem({ tipo: 'erro', texto: mensagemAmigavel(e1 || e2, 'mudar a ordem') });
    await carregar();
  }

  async function alternarVisivel(secao) {
    const { error } = await supabase.from('secoes_inicio').update({ visivel: !secao.visivel }).eq('chave', secao.chave);
    if (error) setMensagem({ tipo: 'erro', texto: mensagemAmigavel(error, 'salvar') });
    await carregar();
  }

  if (!secoes || !banners) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  if (editando) {
    return (
      <FormBanner
        banner={editando.novo ? null : editando}
        proximaOrdem={banners.length + 1}
        aoVoltar={() => {
          setEditando(null);
          carregar();
        }}
      />
    );
  }

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Página inicial</h1>
      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Ordem das seções</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#4A6380' }}>Use as setas para mudar a ordem. Desmarque "mostrar" para esconder uma seção.</p>
        {secoes.map((s, i) => (
          <div key={s.chave} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #EEF3FA', paddingTop: 10 }}>
            <span style={{ flex: '1 1 220px', fontWeight: 700 }}>{i + 1}. {NOMES_SECOES[s.chave] || s.chave}</span>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
              <input type="checkbox" checked={s.visivel} onChange={() => alternarVisivel(s)} /> mostrar
            </label>
            <button className="btn btn-contorno" style={{ minHeight: 38 }} onClick={() => moverSecao(i, -1)} disabled={i === 0}>▲</button>
            <button className="btn btn-contorno" style={{ minHeight: 38 }} onClick={() => moverSecao(i, 1)} disabled={i === secoes.length - 1}>▼</button>
          </div>
        ))}
      </section>

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Banners do topo</h2>
          <button className="btn btn-azul" onClick={() => setEditando({ novo: true })}>Novo banner</button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#4A6380' }}>
          Só o primeiro banner ativo (pela ordem) aparece no topo. Se não houver banner, o site mostra o desenho do pôr do sol.
        </p>
        {banners.length === 0 ? <p className="aviso aviso-info">Nenhum banner cadastrado.</p> : null}
        {banners.map((b) => {
          const pt = b.banners_traducoes?.find((t) => t.idioma === 'pt');
          return (
            <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #EEF3FA', paddingTop: 10 }}>
              {b.imagem_path ? <img src={urlImagem(b.imagem_path)} alt="" style={{ width: 120, height: 70, objectFit: 'cover', borderRadius: 10 }} /> : null}
              <span style={{ flex: '1 1 200px' }}>
                <strong>{pt?.titulo || 'Sem título'}</strong>
                <br />
                <small style={{ color: '#4A6380' }}>ordem {b.ordem} · {b.ativo ? 'ativo' : 'inativo'}</small>
              </span>
              <button className="btn btn-contorno" style={{ minHeight: 38 }} onClick={() => setEditando(b)}>Editar</button>
            </div>
          );
        })}
      </section>
    </>
  );
}

// Formulário de um banner (foto, link, ordem, ativo e textos nos três idiomas)
function FormBanner({ banner, proximaOrdem, aoVoltar }) {
  const [imagem, setImagem] = useState(null);
  const [dados, setDados] = useState({
    link: banner?.link || '',
    ordem: banner?.ordem ?? proximaOrdem,
    ativo: banner ? banner.ativo : true,
    imagem_path: banner?.imagem_path || '',
  });
  const [trads, setTrads] = useState(() => {
    const base = { pt: { titulo: '', subtitulo: '', texto_botao: '' }, en: { titulo: '', subtitulo: '', texto_botao: '' }, es: { titulo: '', subtitulo: '', texto_botao: '' } };
    (banner?.banners_traducoes || []).forEach((t) => {
      base[t.idioma] = { titulo: t.titulo || '', subtitulo: t.subtitulo || '', texto_botao: t.texto_botao || '' };
    });
    return base;
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      let id = banner?.id;
      const base = { link: dados.link.trim() || null, ordem: Number(dados.ordem) || 0, ativo: dados.ativo };
      if (id) {
        const { error } = await supabase.from('banners').update(base).eq('id', id);
        if (error) throw error;
      } else {
        id = nomeUnico();
        if (!imagem) throw new Error('Envie a foto do banner.');
        const { error } = await supabase.from('banners').insert({ ...base, id, imagem_path: `banners/${id}.webp` });
        if (error) throw error;
      }
      if (imagem) {
        const caminho = `banners/${id}.webp`;
        await enviarImagem(imagem, caminho);
        const { error } = await supabase.from('banners').update({ imagem_path: caminho }).eq('id', id);
        if (error) throw error;
      }
      for (const idioma of ['pt', 'en', 'es']) {
        const t = trads[idioma];
        if (!t.titulo.trim() && !t.subtitulo.trim() && !t.texto_botao.trim()) continue;
        const { error } = await supabase.from('banners_traducoes').upsert({
          banner_id: id,
          idioma,
          titulo: t.titulo.trim() || null,
          subtitulo: t.subtitulo.trim() || null,
          texto_botao: t.texto_botao.trim() || null,
        });
        if (error) throw error;
      }
      setSalvando(false);
      aoVoltar();
    } catch (erro) {
      setSalvando(false);
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar o banner') });
    }
  }

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>{banner ? 'Editar banner' : 'Novo banner'}</h1>
        <button type="button" onClick={aoVoltar} style={{ background: 'none', border: 0, color: '#1A5FB4', fontWeight: 700, cursor: 'pointer' }}>← Voltar</button>
      </div>
      {mensagem ? <div className="aviso aviso-erro">{mensagem.texto}</div> : null}

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {dados.imagem_path && !imagem ? <img src={urlImagem(dados.imagem_path)} alt="" style={{ width: 280, borderRadius: 12 }} /> : null}
        <label className="campo">
          Foto do topo (de preferência na horizontal, até 5 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImagem(e.target.files?.[0] || null)} />
        </label>
        <div className="grade-2">
          <label className="campo">
            Ordem (menor aparece primeiro)
            <input type="number" value={dados.ordem} onChange={(e) => setDados({ ...dados, ordem: e.target.value })} />
          </label>
          <label className="campo">
            Link do botão (opcional)
            <input value={dados.link} onChange={(e) => setDados({ ...dados, link: e.target.value })} placeholder="/pt/mapa" />
          </label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
          <input type="checkbox" checked={dados.ativo} onChange={(e) => setDados({ ...dados, ativo: e.target.checked })} /> Ativo
        </label>
      </section>

      {[
        { codigo: 'pt', rotulo: 'Português' },
        { codigo: 'en', rotulo: 'Inglês' },
        { codigo: 'es', rotulo: 'Espanhol' },
      ].map((i) => (
        <section key={i.codigo} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <strong>{i.rotulo}</strong>
          <label className="campo">
            Título grande
            <input value={trads[i.codigo].titulo} onChange={(e) => setTrads((t) => ({ ...t, [i.codigo]: { ...t[i.codigo], titulo: e.target.value } }))} />
          </label>
          <label className="campo">
            Frase curta
            <input value={trads[i.codigo].subtitulo} onChange={(e) => setTrads((t) => ({ ...t, [i.codigo]: { ...t[i.codigo], subtitulo: e.target.value } }))} />
          </label>
          <label className="campo">
            Texto do botão principal
            <input value={trads[i.codigo].texto_botao} onChange={(e) => setTrads((t) => ({ ...t, [i.codigo]: { ...t[i.codigo], texto_botao: e.target.value } }))} />
          </label>
        </section>
      ))}

      <div>
        <button type="submit" className="btn btn-azul" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar banner'}</button>
      </div>
    </form>
  );
}
