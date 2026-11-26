// Usuários e permissões (só administradores). A proteção real é o banco; esta tela só organiza os acessos.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

const MODULOS = [
  { chave: 'locais', rotulo: 'Locais' },
  { chave: 'mapa', rotulo: 'Mapa e marcadores' },
  { chave: 'categorias', rotulo: 'Categorias' },
  { chave: 'eventos', rotulo: 'Eventos' },
  { chave: 'noticias', rotulo: 'Notícias' },
  { chave: 'inicio', rotulo: 'Página inicial e banners' },
  { chave: 'midia', rotulo: 'Imagens' },
  { chave: 'traducoes', rotulo: 'Traduções' },
  { chave: 'configuracoes', rotulo: 'Configurações e página Sobre' },
];

export default function Usuarios() {
  const [pessoas, setPessoas] = useState(null);
  const [editando, setEditando] = useState(null); // { id, nome, papel, ativo, modulos: [] }
  const [mensagem, setMensagem] = useState(null);

  async function carregar() {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, papel, ativo, permissoes_editor ( modulo )')
      .order('nome');
    if (error) setMensagem({ tipo: 'erro', texto: error.message });
    setPessoas(data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrir(p) {
    setMensagem(null);
    setEditando({
      id: p.id,
      nome: p.nome || '',
      papel: p.papel,
      ativo: p.ativo,
      modulos: (p.permissoes_editor || []).map((x) => x.modulo),
    });
  }

  function alternarModulo(modulo) {
    setEditando((e) => ({
      ...e,
      modulos: e.modulos.includes(modulo) ? e.modulos.filter((m) => m !== modulo) : [...e.modulos, modulo],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setMensagem(null);
    const { error: erroPerfil } = await supabase
      .from('perfis')
      .update({ nome: editando.nome.trim() || null, papel: editando.papel, ativo: editando.ativo })
      .eq('id', editando.id);
    if (erroPerfil) return setMensagem({ tipo: 'erro', texto: erroPerfil.message });

    // Permissões: apaga as antigas e grava as marcadas (só faz sentido para editores)
    const { error: erroDel } = await supabase.from('permissoes_editor').delete().eq('perfil_id', editando.id);
    if (erroDel) return setMensagem({ tipo: 'erro', texto: erroDel.message });
    if (editando.papel === 'editor' && editando.modulos.length) {
      const linhas = editando.modulos.map((modulo) => ({ perfil_id: editando.id, modulo }));
      const { error: erroIns } = await supabase.from('permissoes_editor').insert(linhas);
      if (erroIns) return setMensagem({ tipo: 'erro', texto: erroIns.message });
    }
    setMensagem({ tipo: 'ok', texto: 'Acesso atualizado.' });
    setEditando(null);
    carregar();
  }

  return (
    <>
      <h1 className="titulo-pacifico" style={{ fontSize: 34 }}>Usuários e permissões</h1>

      <section className="aviso aviso-info" style={{ lineHeight: 1.6 }}>
        <strong>Como adicionar uma pessoa:</strong> no painel do Supabase, em Authentication → Users, convide o e-mail dela.
        Depois que ela aceitar o convite, peça ao responsável técnico para criar o perfil dela (o site não cria contas sozinho).
        Aqui você define o papel (administrador ou editor) e os módulos liberados.
      </section>

      {mensagem ? <div className={`aviso ${mensagem.tipo === 'erro' ? 'aviso-erro' : 'aviso-ok'}`}>{mensagem.texto}</div> : null}
      {pessoas === null ? <p style={{ color: '#4A6380' }}>Carregando…</p> : null}

      {pessoas && pessoas.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
                <th>Ativo</th>
                <th>Módulos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome || '(sem nome)'}</td>
                  <td>{p.papel === 'admin' ? 'Administrador' : 'Editor'}</td>
                  <td>{p.ativo ? 'Sim' : 'Não'}</td>
                  <td>{p.papel === 'admin' ? 'Todos' : (p.permissoes_editor || []).length}</td>
                  <td><button className="btn btn-contorno" style={{ minHeight: 36 }} onClick={() => abrir(p)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editando ? (
        <form onSubmit={salvar} className="cartao" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Editar acesso</h2>
          <label className="campo">
            Nome
            <input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
          </label>
          <label className="campo">
            Papel
            <select value={editando.papel} onChange={(e) => setEditando({ ...editando, papel: e.target.value })}>
              <option value="editor">Editor (só os módulos marcados)</option>
              <option value="admin">Administrador (acesso a tudo)</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
            <input type="checkbox" checked={editando.ativo} onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} /> Conta ativa
          </label>
          {editando.papel === 'editor' ? (
            <fieldset style={{ border: '1px solid #CFE0F5', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend style={{ fontWeight: 800, padding: '0 6px' }}>Módulos liberados</legend>
              {MODULOS.map((m) => (
                <label key={m.chave} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={editando.modulos.includes(m.chave)} onChange={() => alternarModulo(m.chave)} /> {m.rotulo}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-azul">Salvar</button>
            <button type="button" className="btn btn-contorno" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
