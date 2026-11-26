// Cadastro e edição de um local, em abas: Informações | Contatos | Localização | Logo e fotos | Traduções | Publicação.
// Barra fixa embaixo com "Salvar" e "Salvar e publicar". Avisa se a pessoa sair com alterações não salvas.
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase, BUCKET_MIDIA, urlImagem } from '../../lib/supabase.js';
import { enviarImagem, nomeUnico } from '../../lib/imagens.js';
import { gerarSlug, inicial, linkWhatsApp } from '../../lib/utils.js';
import { mensagemAmigavel } from '../../lib/erros.js';
import { lerLinkGoogleMaps } from '../../lib/mapsLink.js';

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

const ABAS = [
  { id: 'info', rotulo: 'Informações' },
  { id: 'contatos', rotulo: 'Contatos' },
  { id: 'local', rotulo: 'Localização' },
  { id: 'midia', rotulo: 'Logo e fotos' },
  { id: 'traducoes', rotulo: 'Traduções' },
  { id: 'publicacao', rotulo: 'Publicação' },
];

const ROTULO_STATUS = { rascunho: 'Rascunho', publicado: 'Publicado', inativo: 'Inativo' };

export default function LocalForm() {
  const { id } = useParams(); // undefined quando é cadastro novo
  const editando = Boolean(id);
  const navigate = useNavigate();
  const localizacao = useLocation();

  const [aba, setAba] = useState('info');
  const [form, setForm] = useState(VAZIO);
  const [statusOriginal, setStatusOriginal] = useState('rascunho');
  const [slugOriginal, setSlugOriginal] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [logoPath, setLogoPath] = useState('');
  const [logoNovo, setLogoNovo] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  // Fotos em ordem: existentes (já no banco) e novas (ainda não enviadas)
  const [fotos, setFotos] = useState([]); // { chave, tipo: 'existente'|'nova', id?, path?, file?, url? }
  const [fotosRemovidas, setFotosRemovidas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null); // { tipo: 'erro' | 'ok', texto }
  const [slugManual, setSlugManual] = useState(false);
  const [trads, setTrads] = useState({ en: { ...VAZIO_TRAD }, es: { ...VAZIO_TRAD } });
  const [sujo, setSujo] = useState(false); // há alterações não salvas?
  const [linkMapa, setLinkMapa] = useState('');
  const [avisoMapa, setAvisoMapa] = useState(null);

  // Mensagem vinda de outra tela (ex.: depois de cadastrar um local novo)
  useEffect(() => {
    if (localizacao.state?.salvo) {
      setMensagem({ tipo: 'ok', texto: 'Salvo! Confira as abas e, se preciso, posicione o local no mapa.' });
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
      if (editando) await carregarLocal();
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Prévia da imagem do logo escolhido
  useEffect(() => {
    if (!logoNovo) return setLogoUrl('');
    const url = URL.createObjectURL(logoNovo);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoNovo]);

  // Aviso ao fechar a aba ou atualizar a página com alterações não salvas
  useEffect(() => {
    if (!sujo) return;
    function aoSair(e) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [sujo]);

  // Aviso ao clicar em qualquer link para outra tela do painel (menu lateral, Voltar etc.)
  useEffect(() => {
    if (!sujo) return;
    function aoClicar(e) {
      const a = e.target.closest?.('a[href]');
      if (!a) return;
      const destino = new URL(a.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname + destino.search === window.location.pathname + window.location.search) return;
      if (!window.confirm('Você tem alterações que ainda não foram salvas. Sair mesmo assim?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener('click', aoClicar, true);
    return () => document.removeEventListener('click', aoClicar, true);
  }, [sujo]);

  // Lê tudo do banco para o formulário (ao abrir e depois de salvar)
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
    setSujo(false);
  }

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === form.tipo), [categorias, form.tipo]);

  function mudar(campo, valor) {
    setSujo(true);
    setForm((f) => {
      const proximo = { ...f, [campo]: valor };
      // Enquanto o endereço não foi mexido à mão, ele acompanha o nome
      if (campo === 'nome' && !slugManual) proximo.slug = gerarSlug(valor);
      // Ao trocar o tipo, a categoria antiga pode não existir mais
      if (campo === 'tipo') proximo.categoria_id = '';
      return proximo;
    });
  }

  function mudarTrad(idioma, campo, valor) {
    setSujo(true);
    setTrads((x) => ({ ...x, [idioma]: { ...x[idioma], [campo]: valor } }));
  }

  // Converte o texto digitado em número (aceita vírgula ou ponto); vazio vira null
  function numero(valor) {
    if (valor === '' || valor == null) return null;
    const n = Number(String(valor).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // Lê o link do Google Maps e preenche latitude e longitude
  function extrairDoLink() {
    const r = lerLinkGoogleMaps(linkMapa);
    if (r.erro) {
      setAvisoMapa({ tipo: 'erro', texto: r.erro });
      return;
    }
    mudar('latitude', String(r.lat));
    mudar('longitude', String(r.lng));
    setAvisoMapa({ tipo: 'ok', texto: `Pronto! Latitude ${r.lat} e longitude ${r.lng} preenchidas.` });
  }

  // ---------- Fotos ----------

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
    setSujo(true);
    setFotos((f) => [...f, ...novas]);
  }

  function moverFoto(indice, direcao) {
    setSujo(true);
    setFotos((lista) => {
      const outro = indice + direcao;
      if (outro < 0 || outro >= lista.length) return lista;
      const copia = [...lista];
      [copia[indice], copia[outro]] = [copia[outro], copia[indice]];
      return copia;
    });
  }

  function removerFoto(foto) {
    setSujo(true);
    setFotos((lista) => lista.filter((f) => f.chave !== foto.chave));
    if (foto.tipo === 'existente') setFotosRemovidas((r) => [...r, foto.id]);
  }

  // ---------- Salvar ----------

  // "publicar" = true quando o botão é "Salvar e publicar"
  async function salvar(publicar = false) {
    setMensagem(null);
    const statusFinal = publicar ? 'publicado' : form.status;
    const lat = numero(form.latitude);
    const lng = numero(form.longitude);
    const whatsappLimpo = form.whatsapp.replace(/\D/g, '');

    // Confere os campos e leva a pessoa até a aba com o problema
    if (!form.nome.trim()) return erroEm('info', 'Informe o nome do local.');
    if (!form.categoria_id) return erroEm('info', 'Escolha uma categoria.');
    if (whatsappLimpo && !/^\d{10,15}$/.test(whatsappLimpo)) {
      return erroEm('contatos', 'O WhatsApp não parece válido. Use DDD + número, só números, por exemplo 86999999999.');
    }
    if ((lat === null) !== (lng === null)) {
      return erroEm('local', 'Preencha a latitude e a longitude juntas, ou deixe as duas vazias.');
    }
    if (statusFinal === 'publicado' && (lat === null || lng === null)) {
      return erroEm('local', 'Para publicar, falta a localização. Cole o link do Google Maps nesta aba, ou escreva a latitude e a longitude.');
    }
    if (editando && statusOriginal === 'publicado' && statusFinal !== 'publicado') {
      if (!window.confirm('Este local está publicado e vai sair do site. Deseja continuar?')) return;
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
        status: statusFinal,
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

      // 3) Textos em inglês e espanhol (só os que têm conteúdo)
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
      const texto = statusFinal === 'publicado'
        ? 'Salvo! O local está no ar e aparece no site.'
        : 'Salvo! O local ainda não aparece no site (está como rascunho).';

      if (!editando) {
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

  // Mostra o erro e leva para a aba onde está o problema
  function erroEm(aba, texto) {
    setAba(aba);
    setMensagem({ tipo: 'erro', texto });
  }

  if (carregando) return <p style={{ color: '#4A6380' }}>Carregando…</p>;

  const vagasFotos = MAX_FOTOS - fotos.length;
  const nomeCat = categorias.find((c) => c.id === form.categoria_id)?.categorias_traducoes?.find((t) => t.idioma === 'pt')?.nome || '';
  const coordenadasOk = numero(form.latitude) !== null && numero(form.longitude) !== null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); salvar(false); }} className="formulario-local">
      <div className="cabecalho-pagina">
        <div>
          <p className="texto-apoio" style={{ margin: 0 }}>
            <Link to="/admin/locais">← Voltar à lista</Link>
            {sujo ? <span className="etiqueta-status etiqueta-rascunho" style={{ marginLeft: 10 }}>Alterações não salvas</span> : null}
          </p>
          <h1 className="titulo-pacifico" style={{ fontSize: 34, margin: '6px 0 0' }}>
            {editando ? (form.nome || 'Editar local') : 'Novo local'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`etiqueta-status etiqueta-${form.status}`}>{ROTULO_STATUS[form.status] || form.status}</span>
          {editando && coordenadasOk ? (
            <Link to={`/admin/mapa?local=${id}`} className="btn btn-contorno">Posicionar no mapa</Link>
          ) : null}
        </div>
      </div>

      {mensagem ? (
        <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`} role="status" style={{ fontWeight: 700 }}>
          {mensagem.texto}
        </div>
      ) : null}

      {/* Abas */}
      <nav className="abas" role="tablist" aria-label="Partes do cadastro">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={`aba${aba === a.id ? ' ativa' : ''}`} onClick={() => setAba(a.id)}>
            {a.rotulo}
          </button>
        ))}
      </nav>

      {aba === 'info' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Informações</h2>
          <div className="grade-2">
            <label className="campo">
              Nome do local *
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
                <option value="">Escolha uma categoria…</option>
                {categoriasDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>{c.categorias_traducoes.find((t) => t.idioma === 'pt')?.nome || c.slug}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              Endereço da página no site
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  mudar('slug', gerarSlug(e.target.value));
                }}
                placeholder="criado a partir do nome"
              />
            </label>
          </div>
          <label className="campo">
            Descrição (em português)
            <textarea value={form.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Conte, em poucas frases, o que o visitante encontra aqui." />
          </label>
          <label className="campo">
            Serviços (separados por vírgula)
            <input value={form.servicos} onChange={(e) => mudar('servicos', e.target.value)} placeholder="Wi-Fi, Café da manhã, Estacionamento" />
          </label>
          <label className="campo">
            Horário de funcionamento
            <input value={form.horario_funcionamento} onChange={(e) => mudar('horario_funcionamento', e.target.value)} placeholder="Seg. a sáb., 8h às 18h" />
          </label>
        </section>
      ) : null}

      {aba === 'contatos' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Contatos</h2>
          <p className="texto-apoio" style={{ margin: 0 }}>O botão "WhatsApp" do site usa este número. Deixe em branco se o local não tiver.</p>
          <div className="grade-2">
            <label className="campo">
              WhatsApp (DDD + número)
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
          </div>
        </section>
      ) : null}

      {aba === 'local' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Localização</h2>
          <label className="campo">
            Endereço (escrito, para o visitante ler)
            <input value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} placeholder="Av. Geraldo Laura, 120" />
          </label>

          <div className="caixa-mapa">
            <h3 style={{ margin: 0, fontSize: 16 }}>Pegar a localização do Google Maps</h3>
            <p className="texto-apoio" style={{ margin: 0 }}>
              Abra o local no Google Maps, copie o link da barra de endereço e cole aqui. Depois clique em "Preencher".
            </p>
            <div className="linha-mapa">
              <input value={linkMapa} onChange={(e) => setLinkMapa(e.target.value)} placeholder="Cole o link do Google Maps" aria-label="Link do Google Maps" />
              <button type="button" className="btn btn-azul" onClick={extrairDoLink}>Preencher</button>
            </div>
            {avisoMapa ? <div className={`aviso ${avisoMapa.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{avisoMapa.texto}</div> : null}
          </div>

          <div className="grade-2">
            <label className="campo">
              Latitude
              <input value={form.latitude} onChange={(e) => mudar('latitude', e.target.value)} placeholder="-2,9312" inputMode="decimal" />
            </label>
            <label className="campo">
              Longitude
              <input value={form.longitude} onChange={(e) => mudar('longitude', e.target.value)} placeholder="-41,3432" inputMode="decimal" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {coordenadasOk ? (
              <a
                className="btn btn-contorno"
                href={`https://www.google.com/maps/search/?api=1&query=${numero(form.latitude)},${numero(form.longitude)}`}
                target="_blank"
                rel="noopener"
              >
                Testar no Google Maps
              </a>
            ) : (
              <span className="btn btn-contorno cartao-desativado" title="Preencha a latitude e a longitude primeiro">Testar no Google Maps</span>
            )}
          </div>
        </section>
      ) : null}

      {aba === 'midia' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Logo e fotos</h2>

          <div className="linha-logo">
            {logoUrl ? (
              <img src={logoUrl} alt="Prévia do logo escolhido" className="logo-grande" />
            ) : logoPath ? (
              <img src={urlImagem(logoPath)} alt="Logo atual" className="logo-grande" />
            ) : (
              <span className="logo-grande logo-vazio">{inicial(form.nome)}</span>
            )}
            <label className="campo" style={{ flex: '1 1 240px' }}>
              Trocar o logo (JPG, PNG ou WebP, até 5 MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { setSujo(true); setLogoNovo(e.target.files?.[0] || null); }} />
            </label>
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontWeight: 800 }}>
              Fotos ({fotos.length} de {MAX_FOTOS}). A primeira é a principal. Use as setas para mudar a ordem.
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
            {vagasFotos > 0 ? (
              <label className="campo" style={{ marginTop: 12 }}>
                Adicionar fotos (faltam {vagasFotos})
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { adicionarFotos(e.target.files || []); e.target.value = ''; }} />
              </label>
            ) : (
              <p className="texto-apoio">Já são {MAX_FOTOS} fotos. Remova uma para adicionar outra.</p>
            )}
          </div>
        </section>
      ) : null}

      {aba === 'traducoes' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Traduções</h2>
          <p className="texto-apoio" style={{ margin: 0 }}>
            Escreva em inglês e espanhol. Se ficar vazio, o site mostra o português com um aviso. Marque "revisado" só depois de conferir.
          </p>
          {[{ codigo: 'en', rotulo: 'Inglês' }, { codigo: 'es', rotulo: 'Espanhol' }].map((i) => (
            <div key={i.codigo} className="bloco-traducao">
              <strong>{i.rotulo}</strong>
              <label className="campo">
                Descrição
                <textarea value={trads[i.codigo].descricao} onChange={(e) => mudarTrad(i.codigo, 'descricao', e.target.value)} />
              </label>
              <label className="campo">
                Serviços (separados por vírgula)
                <input value={trads[i.codigo].servicos} onChange={(e) => mudarTrad(i.codigo, 'servicos', e.target.value)} />
              </label>
              <label className="caixa-marcar">
                <input type="checkbox" checked={trads[i.codigo].revisado} onChange={(e) => mudarTrad(i.codigo, 'revisado', e.target.checked)} />
                Tradução revisada por uma pessoa
              </label>
            </div>
          ))}
        </section>
      ) : null}

      {aba === 'publicacao' ? (
        <section className="cartao painel-aba">
          <h2 className="titulo-aba">Publicação</h2>
          <label className="campo">
            Situação
            <select value={form.status} onChange={(e) => mudar('status', e.target.value)}>
              <option value="rascunho">Rascunho: guardado, não aparece no site</option>
              <option value="publicado">Publicado: aparece no site</option>
              <option value="inativo">Inativo: escondido, sem apagar</option>
            </select>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            <label className="caixa-marcar">
              <input type="checkbox" checked={form.destaque} onChange={(e) => mudar('destaque', e.target.checked)} />
              Destaque (aparece na página inicial)
            </label>
            <label className="caixa-marcar" style={{ color: '#7A5600' }}>
              <input type="checkbox" checked={form.eh_demonstracao} onChange={(e) => mudar('eh_demonstracao', e.target.checked)} />
              É dado de demonstração
            </label>
          </div>

          <h3 style={{ margin: '10px 0 0', fontSize: 16 }}>Como vai aparecer no site</h3>
          <PreviaFicha
            nome={form.nome || 'Nome do local'}
            categoria={nomeCat}
            descricao={form.descricao}
            servicos={form.servicos}
            endereco={form.endereco}
            logo={logoUrl || (logoPath ? urlImagem(logoPath) : '')}
            whatsapp={form.whatsapp}
            latitude={numero(form.latitude)}
            longitude={numero(form.longitude)}
            demo={form.eh_demonstracao}
          />
        </section>
      ) : null}

      {/* Barra fixa: sempre visível embaixo */}
      <div className="barra-salvar">
        <div className="barra-salvar-texto">
          {sujo ? 'Você tem alterações não salvas.' : 'Tudo salvo.'}
        </div>
        <button type="submit" className="btn btn-contorno" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" className="btn btn-azul" disabled={salvando} onClick={() => salvar(true)}>
          Salvar e publicar
        </button>
      </div>
    </form>
  );
}

// Prévia simples de como a ficha aparece no modal do mapa (não é o modal de verdade, só a aparência)
function PreviaFicha({ nome, categoria, descricao, servicos, endereco, logo, whatsapp, latitude, longitude, demo }) {
  const listaServicos = servicos.split(',').map((s) => s.trim()).filter(Boolean);
  const wa = linkWhatsApp(whatsapp, `Olá! Vim pelo Mapa Cajueiro e quero falar com ${nome}.`);
  const temCoords = latitude != null && longitude != null;
  return (
    <div className="previa-ficha">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {logo ? <img src={logo} alt="" className="previa-logo" /> : <span className="previa-logo previa-logo-vazio">{inicial(nome)}</span>}
        <div>
          <strong className="previa-nome">{nome}</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#1A5FB4', fontWeight: 700, fontSize: 14 }}>{categoria || 'Categoria'}</span>
            {demo ? <span className="etiqueta-demo">Demonstração</span> : null}
          </div>
        </div>
      </div>
      <p style={{ margin: 0, color: '#3A4E66', lineHeight: 1.5 }}>{descricao || 'Descrição ainda não cadastrada.'}</p>
      {listaServicos.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {listaServicos.map((s) => <span key={s} className="chip-servico">{s}</span>)}
        </div>
      ) : null}
      <p style={{ margin: 0, fontSize: 14 }}><strong>{endereco || 'Endereço a confirmar'}</strong></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {wa ? <span className="btn btn-verde" style={{ minHeight: 40, fontSize: 14 }}>WhatsApp</span> : <span className="btn" style={{ background: '#EDEFF2', color: '#5A6573', minHeight: 40, fontSize: 14 }}>WhatsApp não cadastrado</span>}
        {temCoords ? <span className="btn btn-azul" style={{ minHeight: 40, fontSize: 14 }}>Como chegar</span> : null}
      </div>
      <p className="texto-apoio" style={{ margin: 0, fontSize: 12 }}>Prévia aproximada. O visual real aparece no site.</p>
    </div>
  );
}
