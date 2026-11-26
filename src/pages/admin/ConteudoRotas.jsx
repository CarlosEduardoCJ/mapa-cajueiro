// Invólucros das rotas do painel: cada um escolhe o tipo de conteúdo (evento ou notícia).
import { FormConteudo, ListaConteudo } from './Conteudo.jsx';

export function EventosAdminLista() {
  return <ListaConteudo tipo="evento" />;
}
export function EventosAdminForm() {
  return <FormConteudo tipo="evento" />;
}
export function NoticiasAdminLista() {
  return <ListaConteudo tipo="noticia" />;
}
export function NoticiasAdminForm() {
  return <FormConteudo tipo="noticia" />;
}
