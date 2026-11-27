// Ficha de um local: logo, fotos, descrição, serviços, contatos e como chegar.
// Usada tanto no modal do mapa quanto na página própria do local.
import { Link } from 'react-router-dom';
import { IconeInstagram, IconeLocal, IconeSeta, IconeWhatsApp } from './Icones.jsx';
import { useIdioma } from '../i18n/IdiomaContext.jsx';
import { urlImagem } from '../lib/supabase.js';
import { nomeCategoria } from '../lib/locais.js';
import { inicial, linkGoogleMaps, linkWaze, linkWhatsApp } from '../lib/utils.js';

export default function FichaLocal({ detalhe, mostrarVerNoMapa = false }) {
  const { lang, t, caminho, numeroSuporte } = useIdioma();
  const { local, traducao, usouPortugues, fotos } = detalhe;

  const temCoordenadas = local.latitude != null && local.longitude != null;
  const linkWa = linkWhatsApp(local.whatsapp, t.msgFalarLocal(local.nome));
  const linkAtualizar = linkWhatsApp(numeroSuporte, t.msgAtualizar(local.nome));
  const instagram = local.instagram
    ? local.instagram.startsWith('http')
      ? local.instagram
      : `https://instagram.com/${local.instagram.replace('@', '')}`
    : '';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 48 }}>
        {local.logo_path ? (
          <img src={urlImagem(local.logo_path)} alt="" style={{ width: 72, height: 72, borderRadius: '50%', flex: 'none', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,.12)' }} />
        ) : (
          <span style={{ width: 72, height: 72, borderRadius: '50%', flex: 'none', background: '#1A5FB4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26 }}>
            {inicial(local.nome)}
          </span>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#18324F' }}>{local.nome}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: '#1A5FB4', fontWeight: 700 }}>{nomeCategoria(local, lang)}</span>
            {local.eh_demonstracao ? <span className="etiqueta-demo">{t.demonstracao}</span> : null}
          </div>
        </div>
      </div>

      {usouPortugues ? <div className="aviso aviso-info">{t.semTraducao}</div> : null}

      {fotos.length > 0 ? (
        <div className="lista-galeria">
          {fotos.map((f, i) => (
            <img key={f.path} src={urlImagem(f.path)} alt={f.legenda || `${t.foto} ${i + 1} — ${local.nome}`} />
          ))}
        </div>
      ) : null}

      <p style={{ margin: 0, lineHeight: 1.55, color: '#3A4E66' }}>{traducao?.descricao || t.descricaoVazia}</p>

      {traducao?.servicos?.length ? (
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 800 }}>{t.servicos}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {traducao.servicos.map((s) => (
              <span key={s} className="chip-servico">{s}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#3A4E66' }}>
        <IconeLocal />
        <span>
          <strong>{local.endereco || t.enderecoAFazer}</strong>
          {local.horario_funcionamento ? <><br />{t.horario}: {local.horario_funcionamento}</> : null}
        </span>
      </div>

      {local.telefone ? <p style={{ margin: 0, fontSize: 14 }}>{t.telefone}: {local.telefone}</p> : null}
      {instagram ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          {t.instagram}: <a href={instagram} target="_blank" rel="noopener">{local.instagram}</a>
        </p>
      ) : null}
      {local.site ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          {t.site}: <a href={local.site} target="_blank" rel="noopener">{local.site}</a>
        </p>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {linkWa ? (
          <a href={linkWa} target="_blank" rel="noopener" className="btn btn-verde">
            <IconeWhatsApp size={20} /> WhatsApp
          </a>
        ) : (
          <span className="btn" style={{ background: '#EDEFF2', color: '#5A6573', cursor: 'default', fontSize: 14 }}>
            {t.waNaoCadastrado}
          </span>
        )}
        {instagram ? (
          <a href={instagram} target="_blank" rel="noopener" className="btn btn-instagram">
            <IconeInstagram size={20} /> Instagram
          </a>
        ) : null}
        {temCoordenadas ? (
          <>
            <a href={linkGoogleMaps(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-azul">
              {t.comoChegar} · Google Maps <IconeSeta size={18} />
            </a>
            <a href={linkWaze(local.latitude, local.longitude)} target="_blank" rel="noopener" className="btn btn-contorno">
              Waze
            </a>
          </>
        ) : null}
        {mostrarVerNoMapa ? (
          <Link to={caminho(`/mapa?local=${local.id}`)} className="btn btn-contorno">
            {t.verNoMapa}
          </Link>
        ) : null}
      </div>

      <a href={linkAtualizar} target="_blank" rel="noopener" className="btn" style={{ background: '#E6F6EA', color: '#155F2A' }}>
        {t.atualizar}
      </a>
    </>
  );
}
