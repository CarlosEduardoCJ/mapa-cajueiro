// Configurações do site (tabela "configuracoes"). A página Sobre tem tela própria, por isso fica de fora aqui.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { mensagemAmigavel } from '../../lib/erros.js';

export default function Configuracoes() {
  const [itens, setItens] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [salvandoChave, setSalvandoChave] = useState(null);

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('chave, valor, publico, descricao')
      .neq('chave', 'sobre')
      .order('chave')
      .then(({ data, error }) => {
        if (error) setMensagem({ tipo: 'erro', texto: mensagemAmigavel(error, 'carregar as configurações') });
        setItens((data || []).map((i) => ({ ...i, texto: typeof i.valor === 'string' ? i.valor : JSON.stringify(i.valor, null, 2) })));
      });
  }, []);

  function mudar(chave, texto) {
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, texto } : i)));
  }

  async function salvar(item) {
    setMensagem(null);
    setSalvandoChave(item.chave);
    let valor = item.texto;
    // Valores que não são texto (ex.: listas) precisam ser JSON válido
    if (typeof item.valor !== 'string') {
      try {
        valor = JSON.parse(item.texto);
      } catch (e) {
        setSalvandoChave(null);
        return setMensagem({ tipo: 'erro', texto: `"${item.chave}": o conteúdo precisa estar em formato JSON válido.` });
      }
    }
    if (item.chave === 'whatsapp_suporte' && !/^\d{10,15}$/.test(String(valor).replace(/\D/g, ''))) {
      setSalvandoChave(null);
      return setMensagem({ tipo: 'erro', texto: 'WhatsApp de suporte: use código do país + DDD + número, só números (ex.: 5586999933162).' });
    }
    const { error } = await supabase.from('configuracoes').update({ valor: item.chave === 'whatsapp_suporte' ? String(valor).replace(/\D/g, '') : valor }).eq('chave', item.chave);
    setSalvandoChave(null);
    setMensagem(error ? { tipo: 'erro', texto: mensagemAmigavel(error, 'salvar') } : { tipo: 'ok', texto: `"${item.chave}" salvo.` });
  }

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Configurações</h1>
      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}
      {itens === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}
      {itens?.map((item) => (
        <section key={item.chave} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <strong>{item.chave}</strong>
          {item.descricao ? <span style={{ fontSize: 13, color: '#4A6380' }}>{item.descricao}</span> : null}
          <textarea
            value={item.texto}
            onChange={(e) => mudar(item.chave, e.target.value)}
            style={{ minHeight: typeof item.valor === 'string' ? 46 : 120, width: '100%', borderRadius: 14, border: '1.5px solid #CFE0F5', padding: 10, fontFamily: typeof item.valor === 'string' ? 'inherit' : 'monospace' }}
          />
          <div>
            <button className="btn btn-azul" disabled={salvandoChave === item.chave} onClick={() => salvar(item)}>
              {salvandoChave === item.chave ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </section>
      ))}
    </>
  );
}
