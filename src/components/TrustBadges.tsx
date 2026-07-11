const BENEFICIOS = [
  {
    titulo: 'Envío a todo Colombia',
    texto: 'Recibe tus libros en la puerta de tu casa.',
    icono: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 100-4 2 2 0 000 4zM18 19a2 2 0 100-4 2 2 0 000 4z" />
    ),
  },
  {
    titulo: 'Pago seguro y directo',
    texto: 'Coordinamos tu pago sin intermediarios.',
    icono: <path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5z" />,
  },
  {
    titulo: 'Catálogo curado',
    texto: 'Títulos escogidos para tu caminar de fe.',
    icono: <path d="M4 4h9a3 3 0 013 3v13a3 3 0 00-3-3H4zM20 4h0a3 3 0 00-3 3v13a3 3 0 013-3h0z" />,
  },
  {
    titulo: 'Atención por WhatsApp',
    texto: 'Te acompañamos antes y después de tu compra.',
    icono: <path d="M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3z" />,
  },
];

export function TrustBadges() {
  return (
    <section className="trust">
      <div className="container trust__grid">
        {BENEFICIOS.map((b) => (
          <div key={b.titulo} className="trust__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
                 strokeLinecap="round" strokeLinejoin="round" className="trust__icon" aria-hidden="true">
              {b.icono}
            </svg>
            <div>
              <p className="trust__title">{b.titulo}</p>
              <p className="trust__text">{b.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
