// Lista de links do menu. O cabeçalho (computador e celular) e o rodapé usam esta mesma lista.
// "grupo" é um item com submenu (o Turismo).
export function itensMenu(t) {
  return [
    { rota: '/', rotulo: t.navInicio },
    { rota: '/sobre', rotulo: t.navSobre },
    {
      rotulo: t.navTurismo,
      grupo: [
        { rota: '/turismo', rotulo: t.navPontos },
        { rota: '/hospedagem', rotulo: t.hospTitulo },
        { rota: '/gastronomia', rotulo: t.gastroTitulo },
      ],
    },
    { rota: '/mapa', rotulo: t.navMapa },
    { rota: '/eventos', rotulo: t.eventos },
    { rota: '/noticias', rotulo: t.noticias },
    { rota: '/contato', rotulo: t.navContato },
  ];
}
