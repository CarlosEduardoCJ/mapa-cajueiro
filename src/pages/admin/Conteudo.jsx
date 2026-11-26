// Cadastro de eventos e notícias (mesma tela, configurada por tipo).
// Nada é apagado pelo painel: para tirar do ar, muda-se o status para "inativo".
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, urlImagem } from '../../lib/supabase.js';
import { enviarImagem, nomeUnico } from '../../lib/imagens.js';
import { gerarSlug } from '../../lib/utils.js';
import { mensagemAmigavel } from '../../lib/erros.js';

const IDIOMAS = [
  { codigo: 'pt', rotulo: 'Português' },
  { codigo: 'en', rotulo: 'Inglês' },
  { codigo: 'es', rotulo: 'Espanhol' },
];

const CONFIG = {
  evento: {
    tabela: 'eventos',
    tabelaTrad: 'eventos_traducoes',
    fk: 'evento_id',
    pasta: 'eventos',
    rotulo: 'Eventos',
    rota: '/admin/eventos',
    camposTrad: ['titulo', 'descricao', 'local_texto'],
    colunasLista: 'id, slug, inicio, status, eventos_traducoes ( idioma, titulo )',
  },
  noticia: {
    tabela: 'noticias',
    tabelaTrad: 'noticias_traducoes',
    fk: 'noticia_id',
    pasta: 'noticias',
    rotulo: 'Notícias',
    rota: '/admin/noticias',
    camposTrad: ['titulo', 'resumo', 'conteudo'],
    colunasLista: 'id, slug, publicado_em, status, noticias_traducoes ( idioma, titulo )',
  },
};

const ROTULO_STATUS = { rascunho: 'Rascunho', publicado: 'Publicado', inativo: 'Inativo' };

// Formata uma data ISO para o campo "datetime-local" do navegador (hora local)
function paraCampoDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ListaConteudo({ tipo }) {
  const cfg = CONFIG[tipo];
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase
      .from(cfg.tabela)
      .select(cfg.colunasLista)
      .order(tipo === 'evento' ? 'inicio' : 'publicado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro(mensagemAmigavel(error, 'carregar a lista'));
        setItens(data || []);
      });
  }, [tipo, cfg.tabela, cfg.colunasLista]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>{cfg.rotulo}</h1>
        <Link to={`${cfg.rota}/novo`} className="btn btn-azul">Cadastrar novo</Link>
      </div>
      {erro ? <div className="aviso aviso-erro">{erro}</div> : null}
      {itens === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {itens && itens.length === 0 ? <p className="aviso aviso-info">Nada cadastrado ainda.</p> : null}
      {itens && itens.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Título (português)</th>
                <th>{tipo === 'evento' ? 'Início' : 'Publicada em'}</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => {
                const pt = (tipo === 'evento' ? i.eventos_traducoes : i.noticias_traducoes)?.find((t) => t.idioma === 'pt');
                const data = tipo === 'evento' ? i.inicio : i.publicado_em;
                return (
                  <tr key={i.id}>
                    <td>{pt?.titulo || i.slug}</td>
                    <td>{data ? new Date(data).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>{ROTULO_STATUS[i.status] || i.status}</td>
                    <td><Link to={`${cfg.rota}/${i.id}`}>Editar</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

export function FormConteudo({ tipo }) {
  const cfg = CONFIG[tipo];
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  // Um idioma vazio: todos os campos em branco e "revisado" desmarcado
  const vazioTrad = () => ({ ...Object.fromEntries(cfg.camposTrad.map((c) => [c, ''])), revisado: false });
  const [base, setBase] = useState({ slug: '', data: '', dataFim: '', local_id: '', status: 'rascunho', imagem_path: '' });
  const [trads, setTrads] = useState({ pt: vazioTrad(), en: vazioTrad(), es: vazioTrad() });
  const [imagemNova, setImagemNova] = useState(null);
  const [locais, setLocais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [statusOriginal, setStatusOriginal] = useState('rascunho');

  useEffect(() => {
    (async () => {
      const { data: lista } = await supabase.from('locais').select('id, nome').order('nome');
      setLocais(lista || []);
      if (editando) {
        const colunas = tipo === 'evento' ? '*, eventos_traducoes ( * )' : '*, noticias_traducoes ( * )';
        const { data: item } = await supabase.from(cfg.tabela).select(colunas).eq('id', id).maybeSingle();
        if (item) {
          setStatusOriginal(item.status || 'rascunho');
          setBase({
            slug: item.slug || '',
            data: tipo === 'evento' ? paraCampoDataHora(item.inicio) : (item.publicado_em || '').slice(0, 10),
            dataFim: tipo === 'evento' ? paraCampoDataHora(item.fim) : '',
            local_id: item.local_id || '',
            status: item.status || 'rascunho',
            imagem_path: item.imagem_path || '',
          });
          const nova = { pt: vazioTrad(), en: vazioTrad(), es: vazioTrad() };
          const lista2 = (tipo === 'evento' ? item.eventos_traducoes : item.noticias_traducoes) || [];
          lista2.forEach((t) => {
            nova[t.idioma] = { ...Object.fromEntries(cfg.camposTrad.map((c) => [c, t[c] || ''])), revisado: Boolean(t.revisado) };
          });
          setTrads(nova);
        } else {
          setMensagem({ tipo: 'erro', texto: 'Não encontrado.' });
        }
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tipo]);

  function mudarTrad(idioma, campo, valor) {
    setTrads((t) => ({ ...t, [idioma]: { ...t[idioma], [campo]: valor } }));
  }

  async function salvar(e) {
    e.preventDefault();
    setMensagem(null);
    if (!trads.pt.titulo.trim()) return setMensagem({ tipo: 'erro', texto: 'O título em português é obrigatório.' });
    if (!base.data) return setMensagem({ tipo: 'erro', texto: tipo === 'evento' ? 'Informe a data de início.' : 'Informe a data de publicação.' });
    if (editando && statusOriginal === 'publicado' && base.status !== 'publicado') {
      if (!window.confirm(`Este ${tipo === 'evento' ? 'evento' : 'texto'} está publicado e vai sair do site. Deseja continuar?`)) return;
    }

    setSalvando(true);
    try {
      const slug = base.slug || gerarSlug(trads.pt.titulo);
      const dados =
        tipo === 'evento'
          ? {
              slug,
              inicio: new Date(base.data).toISOString(),
              fim: base.dataFim ? new Date(base.dataFim).toISOString() : null,
              local_id: base.local_id || null,
              status: base.status,
            }
          : {
              slug,
              publicado_em: new Date(`${base.data}T12:00:00`).toISOString(),
              status: base.status,
            };

      let itemId = id;
      if (editando) {
        const { error } = await supabase.from(cfg.tabela).update(dados).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from(cfg.tabela).insert(dados).select('id').single();
        if (error) throw error;
        itemId = data.id;
      }

      // Textos em cada idioma que tiver título
      for (const { codigo } of IDIOMAS) {
        const t = trads[codigo];
        if (!t.titulo.trim()) continue;
        const linha = { [cfg.fk]: itemId, idioma: codigo, revisado: codigo === 'pt' ? true : t.revisado };
        cfg.camposTrad.forEach((c) => (linha[c] = t[c].trim() || null));
        const { error } = await supabase.from(cfg.tabelaTrad).upsert(linha);
        if (error) throw error;
      }

      if (imagemNova) {
        const caminho = `${cfg.pasta}/${itemId}.webp`;
        await enviarImagem(imagemNova, caminho);
        const { error } = await supabase.from(cfg.tabela).update({ imagem_path: caminho }).eq('id', itemId);
        if (error) throw error;
        setBase((b) => ({ ...b, imagem_path: caminho }));
        setImagemNova(null);
      }

      setSalvando(false);
      if (!editando) {
        navigate(`${cfg.rota}/${itemId}`, { replace: true });
      } else {
        setStatusOriginal(base.status);
        setMensagem({ tipo: 'ok', texto: 'Salvo! Confira o texto em cada idioma antes de publicar.' });
      }
    } catch (erro) {
      setSalvando(false);
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar') });
    }
  }

  if (carregando) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>{editando ? `Editar ${cfg.rotulo.toLowerCase()}` : `Nova ${tipo === 'evento' ? 'evento' : 'notícia'}`}</h1>
        <Link to={cfg.rota}>← Voltar à lista</Link>
      </div>
      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grade-2">
          <label className="campo">
            {tipo === 'evento' ? 'Início *' : 'Data de publicação *'}
            <input type={tipo === 'evento' ? 'datetime-local' : 'date'} value={base.data} onChange={(e) => setBase({ ...base, data: e.target.value })} required />
          </label>
          {tipo === 'evento' ? (
            <label className="campo">
              Fim (opcional)
              <input type="datetime-local" value={base.dataFim} onChange={(e) => setBase({ ...base, dataFim: e.target.value })} />
            </label>
          ) : null}
          {tipo === 'evento' ? (
            <label className="campo">
              Local (lugar cadastrado)
              <select value={base.local_id} onChange={(e) => setBase({ ...base, local_id: e.target.value })}>
                <option value="">— nenhum —</option>
                {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </label>
          ) : null}
          <label className="campo">
            Status
            <select value={base.status} onChange={(e) => setBase({ ...base, status: e.target.value })}>
              <option value="rascunho">Rascunho (não aparece no site)</option>
              <option value="publicado">Publicado</option>
              <option value="inativo">Inativo (escondido)</option>
            </select>
          </label>
          <label className="campo" style={{ gridColumn: '1 / -1' }}>
            Endereço no site (slug, opcional)
            <input value={base.slug} onChange={(e) => setBase({ ...base, slug: gerarSlug(e.target.value) })} placeholder="gerado a partir do título" />
          </label>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>Imagem</p>
          {base.imagem_path && !imagemNova ? <img src={urlImagem(base.imagem_path)} alt="" style={{ width: 240, borderRadius: 14, marginBottom: 8 }} /> : null}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setImagemNova(e.target.files?.[0] || null)} />
        </div>
      </section>

      {IDIOMAS.map((i) => (
        <section key={i.codigo} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{i.rotulo}{i.codigo === 'pt' ? ' *' : ''}</h2>
          {cfg.camposTrad.map((campo) => (
            <label key={campo} className="campo">
              {rotuloCampo(campo)}
              {campo === 'titulo' ? (
                <input value={trads[i.codigo][campo]} onChange={(e) => mudarTrad(i.codigo, campo, e.target.value)} required={i.codigo === 'pt'} />
              ) : (
                <textarea value={trads[i.codigo][campo]} onChange={(e) => mudarTrad(i.codigo, campo, e.target.value)} />
              )}
            </label>
          ))}
          {i.codigo !== 'pt' ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
              <input type="checkbox" checked={trads[i.codigo].revisado} onChange={(e) => mudarTrad(i.codigo, 'revisado', e.target.checked)} />
              Tradução revisada por uma pessoa
            </label>
          ) : null}
        </section>
      ))}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-azul" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <Link to={cfg.rota} className="btn btn-contorno">Cancelar</Link>
      </div>
    </form>
  );
}

function rotuloCampo(campo) {
  return { titulo: 'Título', descricao: 'Descrição', local_texto: 'Local (texto livre)', resumo: 'Resumo', conteudo: 'Texto da notícia' }[campo] || campo;
}
