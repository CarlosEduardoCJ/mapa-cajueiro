// Cadastro e edição de um local (estabelecimento ou ponto turístico).
// Salva: dados do local, texto em português, logo e até 3 fotos. Depois, o marcador é posto no mapa.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase, BUCKET_MIDIA, urlImagem } from '../../lib/supabase.js';
import { enviarImagem, nomeUnico } from '../../lib/imagens.js';
import { gerarSlug } from '../../lib/utils.js';

const MAX_FOTOS = 3;

const VAZIO = {
  nome: '',
  tipo: 'estabelecimento',
  categoria_id: '',
  slug: '',
  whatsapp: '',
  telefone: '',
  instagram: '',
  site: '',
  endereco: '',
  latitude: '',
  longitude: '',
  horario_funcionamento: '',
  status: 'rascunho',
  destaque: false,
  eh_demonstracao: false,
  descricao: '',
  servicos: '',
};

export default function LocalForm() {
  const { id } = useParams(); // undefined quando é cadastro novo
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(VAZIO);
  const [categorias, setCategorias] = useState([]);
  const [logoPath, setLogoPath] = useState('');
  const [logoNovo, setLogoNovo] = useState(null);
  const [fotosExistentes, setFotosExistentes] = useState([]); // { id, path }
  const [fotosRemovidas, setFotosRemovidas] = useState([]); // ids
  const [fotosNovas, setFotosNovas] = useState([]); // File[]
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'erro' | 'ok', texto }
  const [slugManual, setSlugManual] = useState(false);

  // Carrega categorias e, se for edição, o local atual
  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, slug, tipo, ordem, categorias_traducoes ( nome, idioma )')
        .eq('ativo', true)
        .order('ordem');
      setCategorias(cats || []);

      if (editando) {
        const [{ data: local }, { data: trad }, { data: fotos }] = await Promise.all([
          supabase.from('locais').select('*').eq('id', id).maybeSingle(),
          supabase.from('locais_traducoes').select('*').eq('local_id', id).eq('idioma', 'pt').maybeSingle(),
          supabase.from('fotos').select('id, path').eq('local_id', id).order('ordem'),
        ]);
        if (!local) {
          setMensagem({ tipo: 'erro', texto: 'Local não encontrado.' });
        } else {
          setForm({
            nome: local.nome || '',
            tipo: local.tipo || 'estabelecimento',
            categoria_id: local.categoria_id || '',
            slug: local.slug || '',
            whatsapp: local.whatsapp || '',
            telefone: local.telefone || '',
            instagram: local.instagram || '',
            site: local.site || '',
            endereco: local.endereco || '',
            latitude: local.latitude ?? '',
            longitude: local.longitude ?? '',
            horario_funcionamento: local.horario_funcionamento || '',
            status: local.status || 'rascunho',
            destaque: Boolean(local.destaque),
            eh_demonstracao: Boolean(local.eh_demonstracao),
            descricao: trad?.descricao || '',
            servicos: (trad?.servicos || []).join(', '),
          });
          setLogoPath(local.logo_path || '');
          setFotosExistentes(fotos || []);
          setSlugManual(true);
        }
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Categorias do tipo escolhido (estabelecimento ou ponto turístico)
  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo],
  );

  function mudar(campo, valor) {
    setForm((f) => {
      const proximo = { ...f, [campo]: valor };
      // Enquanto o slug não foi mexido à mão, ele acompanha o nome
      if (campo === 'nome' && !slugManual) proximo.slug = gerarSlug(valor);
      // Ao trocar o tipo, a categoria antiga pode não existir mais
      if (campo === 'tipo') proximo.categoria_id = '';
      return proximo;
    });
  }

  function escolherFotos(arquivos) {
    const disponiveis = MAX_FOTOS - (fotosExistentes.length - fotosRemovidas.length);
    setFotosNovas(Array.from(arquivos).slice(0, Math.max(disponiveis, 0)));
  }

  function removerFotoExistente(fotoId) {
    setFotosRemovidas((lista) => [...lista, fotoId]);
  }

  // Converte o texto digitado em número (aceita vírgula ou ponto); vazio vira null
  function numero(valor) {
    if (valor === '' || valor == null) return null;
    const n = Number(String(valor).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async function salvar(e) {
    e.preventDefault();
    setMensagem(null);

    const lat = numero(form.latitude);
    const lng = numero(form.longitude);
    const whatsappLimpo = form.whatsapp.replace(/\D/g, '');

    if (!form.nome.trim()) return setMensagem({ tipo: 'erro', texto: 'Informe o nome do local.' });
    if (!form.categoria_id) return setMensagem({ tipo: 'erro', texto: 'Escolha uma categoria.' });
    if (whatsappLimpo && !/^\d{10,15}$/.test(whatsappLimpo)) {
      return setMensagem({ tipo: 'erro', texto: 'WhatsApp inválido. Use DDD + número, ex.: 86999999999.' });
    }
    if ((lat === null) !== (lng === null)) {
      return setMensagem({ tipo: 'erro', texto: 'Informe latitude e longitude juntas, ou deixe as duas vazias.' });
    }
    if (form.status === 'publicado' && (lat === null || lng === null)) {
      return setMensagem({ tipo: 'erro', texto: 'Para publicar, informe latitude e longitude (usadas no "Como chegar").' });
    }

    setSalvando(true);
    try {
      const dados = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        categoria_id: form.categoria_id,
        slug: form.slug || gerarSlug(form.nome),
        whatsapp: whatsappLimpo || null,
        telefone: form.telefone.trim() || null,
        instagram: form.instagram.trim() || null,
        site: form.site.trim() || null,
        endereco: form.endereco.trim() || null,
        latitude: lat,
        longitude: lng,
        horario_funcionamento: form.horario_funcionamento.trim() || null,
        status: form.status,
        destaque: form.destaque,
        eh_demonstracao: form.eh_demonstracao,
      };

      // 1) Dados do local
      let localId = id;
      if (editando) {
        const { error } = await supabase.from('locais').update(dados).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('locais').insert(dados).select('id').single();
        if (error) throw error;
        localId = data.id;
      }

      // 2) Texto em português (os outros idiomas entram na Entrega 3)
      const servicos = form.servicos.split(',').map((s) => s.trim()).filter(Boolean);
      const { error: erroTrad } = await supabase.from('locais_traducoes').upsert({
        local_id: localId,
        idioma: 'pt',
        descricao: form.descricao.trim() || null,
        servicos,
        revisado: true,
      });
      if (erroTrad) throw erroTrad;

      // 3) Logo
      if (logoNovo) {
        const caminho = `locais/${localId}/logo.webp`;
        await enviarImagem(logoNovo, caminho);
        const { error } = await supabase.from('locais').update({ logo_path: caminho }).eq('id', localId);
        if (error) throw error;
      }

      // 4) Fotos: remove as marcadas e envia as novas
      if (fotosRemovidas.length) {
        const caminhos = fotosExistentes.filter((f) => fotosRemovidas.includes(f.id)).map((f) => f.path);
        await supabase.from('fotos').delete().in('id', fotosRemovidas);
        if (caminhos.length) await supabase.storage.from(BUCKET_MIDIA).remove(caminhos);
      }
      const ordemBase = fotosExistentes.length - fotosRemovidas.length;
      for (let i = 0; i < fotosNovas.length; i++) {
        const caminho = `locais/${localId}/fotos/${nomeUnico()}.webp`;
        await enviarImagem(fotosNovas[i], caminho);
        const { error } = await supabase.from('fotos').insert({ local_id: localId, path: caminho, ordem: ordemBase + i });
        if (error) throw error;
      }

      setSalvando(false);
      if (!editando) {
        navigate(`/admin/locais/${localId}`, { replace: true });
      }
      // Recarrega a tela de edição para mostrar o que foi salvo
      setLogoNovo(null);
      setFotosNovas([]);
      setFotosRemovidas([]);
      setMensagem({ tipo: 'ok', texto: 'Salvo! Se o local estiver publicado, ele já aparece no site. Agora posicione o marcador em "Mapa e marcadores".' });
      if (editando) {
        const { data: fotos } = await supabase.from('fotos').select('id, path').eq('local_id', localId).order('ordem');
        setFotosExistentes(fotos || []);
        const { data: local } = await supabase.from('locais').select('logo_path').eq('id', localId).maybeSingle();
        setLogoPath(local?.logo_path || '');
      }
    } catch (erro) {
      setSalvando(false);
      const texto = erro?.message?.includes('duplicate key') && erro?.message?.includes('slug')
        ? 'Já existe um local com este endereço (slug). Mude o nome ou o campo "Endereço no site".'
        : erro?.message || 'Não foi possível salvar. Tente de novo.';
      setMensagem({ tipo: 'erro', texto });
    }
  }

  if (carregando) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  const vagasFotos = MAX_FOTOS - (fotosExistentes.length - fotosRemovidas.length);
  const fotosVisiveis = fotosExistentes.filter((f) => !fotosRemovidas.includes(f.id));

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>{editando ? 'Editar local' : 'Novo local'}</h1>
        <Link to="/admin/locais">← Voltar à lista</Link>
      </div>

      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Dados principais</h2>
        <div className="grade-2">
          <label className="campo">
            Nome *
            <input value={form.nome} onChange={(e) => mudar('nome', e.target.value)} required />
          </label>
          <label className="campo">
            Tipo *
            <select value={form.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
              <option value="estabelecimento">Estabelecimento (loja, hotel, restaurante…)</option>
              <option value="ponto_turistico">Ponto turístico (praia, passeio…)</option>
            </select>
          </label>
          <label className="campo">
            Categoria *
            <select value={form.categoria_id} onChange={(e) => mudar('categoria_id', e.target.value)} required>
              <option value="">Escolha…</option>
              {categoriasDoTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.categorias_traducoes.find((t) => t.idioma === 'pt')?.nome || c.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Endereço no site (slug)
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                mudar('slug', gerarSlug(e.target.value));
              }}
              placeholder="gerado a partir do nome"
            />
          </label>
          <label className="campo">
            Status
            <select value={form.status} onChange={(e) => mudar('status', e.target.value)}>
              <option value="rascunho">Rascunho (não aparece no site)</option>
              <option value="publicado">Publicado (aparece no site)</option>
              <option value="inativo">Inativo (escondido)</option>
            </select>
          </label>
        </div>
        <label className="campo">
          Descrição (português)
          <textarea value={form.descricao} onChange={(e) => mudar('descricao', e.target.value)} />
        </label>
        <label className="campo">
          Serviços (separados por vírgula)
          <input value={form.servicos} onChange={(e) => mudar('servicos', e.target.value)} placeholder="Wi-Fi, Café da manhã, Estacionamento" />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
            <input type="checkbox" checked={form.destaque} onChange={(e) => mudar('destaque', e.target.checked)} /> Destaque
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700, color: '#7A5600' }}>
            <input type="checkbox" checked={form.eh_demonstracao} onChange={(e) => mudar('eh_demonstracao', e.target.checked)} />
            É dado de demonstração (aparece identificado como demonstração)
          </label>
        </div>
      </section>

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Contatos e endereço</h2>
        <div className="grade-2">
          <label className="campo">
            WhatsApp (DDD + número, só números)
            <input value={form.whatsapp} onChange={(e) => mudar('whatsapp', e.target.value)} placeholder="86999999999" inputMode="numeric" />
          </label>
          <label className="campo">
            Telefone
            <input value={form.telefone} onChange={(e) => mudar('telefone', e.target.value)} />
          </label>
          <label className="campo">
            Instagram
            <input value={form.instagram} onChange={(e) => mudar('instagram', e.target.value)} placeholder="@perfil" />
          </label>
          <label className="campo">
            Site
            <input value={form.site} onChange={(e) => mudar('site', e.target.value)} placeholder="https://…" />
          </label>
          <label className="campo" style={{ gridColumn: '1 / -1' }}>
            Endereço
            <input value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} />
          </label>
          <label className="campo">
            Latitude
            <input value={form.latitude} onChange={(e) => mudar('latitude', e.target.value)} placeholder="-2,9xxxxx" inputMode="decimal" />
          </label>
          <label className="campo">
            Longitude
            <input value={form.longitude} onChange={(e) => mudar('longitude', e.target.value)} placeholder="-41,3xxxxx" inputMode="decimal" />
          </label>
          <label className="campo" style={{ gridColumn: '1 / -1' }}>
            Horário de funcionamento
            <input value={form.horario_funcionamento} onChange={(e) => mudar('horario_funcionamento', e.target.value)} />
          </label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#4A6380' }}>
          Latitude e longitude são o ponto real no mapa (use o Google Maps: clique com o botão direito no local e copie as coordenadas).
        </p>
      </section>

      <section className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Logo e fotos</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {logoNovo ? (
            <img src={URL.createObjectURL(logoNovo)} alt="Prévia do logo" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
          ) : logoPath ? (
            <img src={urlImagem(logoPath)} alt="Logo atual" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 80, height: 80, borderRadius: '50%', background: '#E3EEFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A6380', fontSize: 12, textAlign: 'center' }}>sem logo</span>
          )}
          <label className="campo" style={{ flex: '1 1 240px' }}>
            Logo (JPG, PNG ou WebP, até 5 MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogoNovo(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>Fotos (até {MAX_FOTOS})</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {fotosVisiveis.map((f) => (
              <div key={f.id} style={{ position: 'relative' }}>
                <img src={urlImagem(f.path)} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 12 }} />
                <button type="button" className="btn btn-perigo" onClick={() => removerFotoExistente(f.id)} style={{ minHeight: 34, padding: '0 10px', fontSize: 13, position: 'absolute', top: 4, right: 4 }}>
                  Remover
                </button>
              </div>
            ))}
          </div>
          {vagasFotos > 0 ? (
            <label className="campo" style={{ marginTop: 10 }}>
              Adicionar fotos (até {vagasFotos} nesta vez)
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => escolherFotos(e.target.files)} />
            </label>
          ) : (
            <p style={{ fontSize: 13, color: '#4A6380' }}>Limite de {MAX_FOTOS} fotos atingido. Remova uma para adicionar outra.</p>
          )}
          {fotosNovas.length > 0 ? <p style={{ fontSize: 13, color: '#155F2A' }}>{fotosNovas.length} foto(s) prontas para enviar.</p> : null}
        </div>
      </section>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-azul" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar local'}
        </button>
        <Link to="/admin/locais" className="btn btn-contorno">Cancelar</Link>
      </div>
    </form>
  );
}
