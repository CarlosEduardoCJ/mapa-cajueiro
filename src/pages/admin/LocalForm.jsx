// Cadastro e edição de um local (estabelecimento ou ponto turístico).
// Salva: dados do local, textos (português, inglês, espanhol), logo e até 3 fotos (com ordem).
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase, BUCKET_MIDIA, urlImagem } from '../../lib/supabase.js';
import { enviarImagem, nomeUnico } from '../../lib/imagens.js';
import { gerarSlug } from '../../lib/utils.js';
import { mensagemAmigavel } from '../../lib/erros.js';

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

const VAZIO_TRAD = { descricao: '', servicos: '', revisado: false };

export default function LocalForm() {
  const { id } = useParams(); // undefined quando é cadastro novo
  const editando = Boolean(id);
  const navigate = useNavigate();
  const localizacao = useLocation();

  const [form, setForm] = useState(VAZIO);
  const [statusOriginal, setStatusOriginal] = useState('rascunho');
  const [slugOriginal, setSlugOriginal] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [logoPath, setLogoPath] = useState('');
  const [logoNovo, setLogoNovo] = useState(null);
  // Fotos em ordem: existentes (já no banco) e novas (ainda não enviadas)
  const [fotos, setFotos] = useState([]); // { chave, tipo: 'existente'|'nova', id?, path?, file?, url? }
  const [fotosRemovidas, setFotosRemovidas] = useState([]); // ids de fotos que serão apagadas
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'erro' | 'ok', texto }
  const [slugManual, setSlugManual] = useState(false);
  // Textos em inglês e espanhol (a equipe escreve; o site não traduz sozinho)
  const [trads, setTrads] = useState({ en: { ...VAZIO_TRAD }, es: { ...VAZIO_TRAD } });

  // Mensagem vinda de outra tela (ex.: depois de cadastrar um local novo)
  useEffect(() => {
    if (localizacao.state?.salvo) {
      setMensagem({ tipo: 'ok', texto: 'Salvo! Confira abaixo e posicione o local no mapa, se ainda não estiver lá.' });
      navigate(localizacao.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        await carregarLocal();
      }
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Lê tudo do banco para o formulário (usado ao abrir e depois de salvar)
  async function carregarLocal() {
    const [{ data: local }, { data: trad }, { data: fotosBanco }, { data: outras }] = await Promise.all([
      supabase.from('locais').select('*').eq('id', id).maybeSingle(),
      supabase.from('locais_traducoes').select('*').eq('local_id', id).eq('idioma', 'pt').maybeSingle(),
      supabase.from('fotos').select('id, path').eq('local_id', id).order('ordem'),
      supabase.from('locais_traducoes').select('idioma, descricao, servicos, revisado').eq('local_id', id).in('idioma', ['en', 'es']),
    ]);
    if (!local) {
      setMensagem({ tipo: 'erro', texto: 'Este local não foi encontrado. Ele pode ter sido apagado.' });
      return;
    }
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
    setStatusOriginal(local.status || 'rascunho');
    setSlugOriginal(local.slug || '');
    setLogoPath(local.logo_path || '');
    setFotos((fotosBanco || []).map((f) => ({ chave: f.id, tipo: 'existente', id: f.id, path: f.path })));
    setFotosRemovidas([]);
    setSlugManual(true);
    const novas = { en: { ...VAZIO_TRAD }, es: { ...VAZIO_TRAD } };
    (outras || []).forEach((o) => {
      novas[o.idioma] = { descricao: o.descricao || '', servicos: (o.servicos || []).join(', '), revisado: Boolean(o.revisado) };
    });
    setTrads(novas);
  }

  // Categorias do tipo escolhido (estabelecimento ou ponto turístico)
  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === form.tipo), [categorias, form.tipo]);

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

  // Converte o texto digitado em número (aceita vírgula ou ponto); vazio vira null
  function numero(valor) {
    if (valor === '' || valor == null) return null;
    const n = Number(String(valor).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // ---------- Fotos ----------

  // Adiciona fotos novas (com prévia), até o limite de 3
  function adicionarFotos(lista) {
    const vagas = MAX_FOTOS - fotos.length;
    if (vagas <= 0) {
      setMensagem({ tipo: 'erro', texto: `Já são ${MAX_FOTOS} fotos. Remova uma antes de adicionar outra.` });
      return;
    }
    const novas = Array.from(lista)
      .slice(0, vagas)
      .map((file) => ({ chave: nomeUnico(), tipo: 'nova', file, url: URL.createObjectURL(file) }));
    if (lista.length > vagas) {
      setMensagem({ tipo: 'erro', texto: `Só cabem mais ${vagas} foto(s). As primeiras foram adicionadas.` });
    }
    setFotos((f) => [...f, ...novas]);
  }

  // Troca a foto de posição com a vizinha (setas)
  function moverFoto(indice, direcao) {
    setFotos((lista) => {
      const outro = indice + direcao;
      if (outro < 0 || outro >= lista.length) return lista;
      const copia = [...lista];
      [copia[indice], copia[outro]] = [copia[outro], copia[indice]];
      return copia;
    });
  }

  function removerFoto(foto) {
    setFotos((lista) => lista.filter((f) => f.chave !== foto.chave));
    if (foto.tipo === 'existente') setFotosRemovidas((r) => [...r, foto.id]);
  }

  // ---------- Salvar ----------

  async function salvar(e) {
    e.preventDefault();
    setMensagem(null);

    const lat = numero(form.latitude);
    const lng = numero(form.longitude);
    const whatsappLimpo = form.whatsapp.replace(/\D/g, '');

    if (!form.nome.trim()) return setMensagem({ tipo: 'erro', texto: 'Informe o nome do local.' });
    if (!form.categoria_id) return setMensagem({ tipo: 'erro', texto: 'Escolha uma categoria.' });
    if (whatsappLimpo && !/^\d{10,15}$/.test(whatsappLimpo)) {
      return setMensagem({ tipo: 'erro', texto: 'WhatsApp inválido. Use DDD + número, só números, ex.: 86999999999.' });
    }
    if ((lat === null) !== (lng === null)) {
      return setMensagem({ tipo: 'erro', texto: 'Informe latitude e longitude juntas, ou deixe as duas vazias.' });
    }
    if (form.status === 'publicado' && (lat === null || lng === null)) {
      return setMensagem({ tipo: 'erro', texto: 'Para publicar, informe latitude e longitude (usadas no "Como chegar").' });
    }
    // Confirmação antes de tirar um local que estava no ar
    if (editando && statusOriginal === 'publicado' && form.status !== 'publicado') {
      const ok = window.confirm('Este local está publicado e vai sair do site. Deseja continuar?');
      if (!ok) return;
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

      // 2) Textos em português
      const servicos = form.servicos.split(',').map((s) => s.trim()).filter(Boolean);
      const { error: erroTrad } = await supabase.from('locais_traducoes').upsert({
        local_id: localId,
        idioma: 'pt',
        descricao: form.descricao.trim() || null,
        servicos,
        revisado: true,
      });
      if (erroTrad) throw erroTrad;

      // 3) Textos em inglês e espanhol (só salva o idioma que tem conteúdo)
      for (const idioma of ['en', 'es']) {
        const t = trads[idioma];
        if (!t.descricao.trim() && !t.servicos.trim()) continue;
        const { error } = await supabase.from('locais_traducoes').upsert({
          local_id: localId,
          idioma,
          descricao: t.descricao.trim() || null,
          servicos: t.servicos.split(',').map((s) => s.trim()).filter(Boolean),
          revisado: t.revisado,
        });
        if (error) throw error;
      }

      // 4) Logo
      if (logoNovo) {
        const caminho = `locais/${localId}/logo.webp`;
        await enviarImagem(logoNovo, caminho);
        const { error } = await supabase.from('locais').update({ logo_path: caminho }).eq('id', localId);
        if (error) throw error;
      }

      // 5) Fotos: apaga as removidas, grava a ordem das existentes e envia as novas
      if (fotosRemovidas.length) {
        const caminhos = [];
        const { data: apagar } = await supabase.from('fotos').select('path').in('id', fotosRemovidas);
        (apagar || []).forEach((f) => caminhos.push(f.path));
        const { error } = await supabase.from('fotos').delete().in('id', fotosRemovidas);
        if (error) throw error;
        if (caminhos.length) await supabase.storage.from(BUCKET_MIDIA).remove(caminhos);
      }
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (foto.tipo === 'existente') {
          const { error } = await supabase.from('fotos').update({ ordem: i }).eq('id', foto.id);
          if (error) throw error;
        } else {
          const caminho = `locais/${localId}/fotos/${nomeUnico()}.webp`;
          await enviarImagem(foto.file, caminho);
          const { error } = await supabase.from('fotos').insert({ local_id: localId, path: caminho, ordem: i });
          if (error) throw error;
        }
      }

      setSalvando(false);
      const aviso = form.status === 'publicado'
        ? 'O local já aparece no site.'
        : 'Ele ainda não aparece no site, porque o status não é "publicado".';
      const texto = `Salvo! ${aviso}`;

      if (!editando) {
        // Vai para a tela de edição do local novo, levando a mensagem
        navigate(`/admin/locais/${localId}`, { replace: true, state: { salvo: true } });
      } else {
        setLogoNovo(null);
        await carregarLocal();
        setMensagem({ tipo: 'ok', texto });
      }
    } catch (erro) {
      setSalvando(false);
      setMensagem({ tipo: 'erro', texto: mensagemAmigavel(erro, 'salvar o local') });
    }
  }

  if (carregando) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  return (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>{editando ? 'Editar local' : 'Novo local'}</h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {editando && form.status === 'publicado' && slugOriginal ? (
            <a href={`/pt/locais/${slugOriginal}`} target="_blank" rel="noopener">Ver no site</a>
          ) : null}
          <Link to="/admin/locais">← Voltar à lista</Link>
        </div>
      </div>

      {mensagem ? (
        <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`} role="status" style={{ fontWeight: 700 }}>
          {mensagem.texto}
        </div>
      ) : null}

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
        <h2 style={{ margin: 0, fontSize: 18 }}>Traduções</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#4A6380' }}>
          Escreva em inglês e espanhol. Se ficar vazio, o site mostra o português com um aviso. Marque "revisado" só depois de conferir a tradução.
        </p>
        {[
          { codigo: 'en', rotulo: 'Inglês' },
          { codigo: 'es', rotulo: 'Espanhol' },
        ].map((i) => (
          <div key={i.codigo} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #EEF3FA', paddingTop: 12 }}>
            <strong>{i.rotulo}</strong>
            <label className="campo">
              Descrição
              <textarea
                value={trads[i.codigo].descricao}
                onChange={(e) => setTrads((x) => ({ ...x, [i.codigo]: { ...x[i.codigo], descricao: e.target.value } }))}
              />
            </label>
            <label className="campo">
              Serviços (separados por vírgula)
              <input
                value={trads[i.codigo].servicos}
                onChange={(e) => setTrads((x) => ({ ...x, [i.codigo]: { ...x[i.codigo], servicos: e.target.value } }))}
              />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={trads[i.codigo].revisado}
                onChange={(e) => setTrads((x) => ({ ...x, [i.codigo]: { ...x[i.codigo], revisado: e.target.checked } }))}
              />
              Tradução revisada por uma pessoa
            </label>
          </div>
        ))}
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
            Logo (JPG, PNG ou WebP, até 5 MB) — você verá uma prévia ao escolher
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogoNovo(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>
            Fotos ({fotos.length} de {MAX_FOTOS}). A primeira é a principal; use as setas para mudar a ordem.
          </p>
          <div className="lista-fotos-editor">
            {fotos.map((foto, i) => (
              <div key={foto.chave} className="foto-editor">
                <img src={foto.tipo === 'nova' ? foto.url : urlImagem(foto.path)} alt={`Foto ${i + 1}`} />
                {foto.tipo === 'nova' ? <span className="etiqueta-status etiqueta-rascunho">nova</span> : null}
                <div className="foto-editor-botoes">
                  <button type="button" onClick={() => moverFoto(i, -1)} disabled={i === 0} aria-label="Mover para antes">◀</button>
                  <button type="button" onClick={() => moverFoto(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover para depois">▶</button>
                  <button type="button" onClick={() => removerFoto(foto)} aria-label="Remover foto" className="remover">Remover</button>
                </div>
              </div>
            ))}
          </div>
          {fotos.length < MAX_FOTOS ? (
            <label className="campo" style={{ marginTop: 10 }}>
              Adicionar fotos (até {MAX_FOTOS - fotos.length})
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { adicionarFotos(e.target.files || []); e.target.value = ''; }} />
            </label>
          ) : (
            <p style={{ fontSize: 13, color: '#4A6380' }}>Limite de {MAX_FOTOS} fotos atingido. Remova uma para adicionar outra.</p>
          )}
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
