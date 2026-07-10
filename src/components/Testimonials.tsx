const RESENAS = [
  {
    texto:
      'Pedí tres devocionales y llegaron en dos días, muy bien empacados. La atención por WhatsApp fue cercana y rápida.',
    autor: 'Laura M.',
    ciudad: 'Medellín',
  },
  {
    texto:
      'Me encanta que sea una librería cristiana con títulos escogidos. Encontré libros que no conseguía en otro lado.',
    autor: 'Andrés P.',
    ciudad: 'Bogotá',
  },
  {
    texto:
      'Compré la Biblia de estudio y quedé feliz con la calidad. Volveré a comprar sin duda.',
    autor: 'Carolina R.',
    ciudad: 'Cali',
  },
];

export function Testimonials() {
  return (
    <section className="testimonios">
      <div className="container">
        <p className="eyebrow eyebrow--center">Nuestros lectores dicen</p>
        <h2 className="section-title section-title--center">Confianza que se construye libro a libro</h2>
        <div className="testimonios__grid">
          {RESENAS.map((r) => (
            <figure key={r.autor} className="testimonio">
              <div className="testimonio__stars" aria-hidden="true">★★★★★</div>
              <blockquote>{r.texto}</blockquote>
              <figcaption>
                <strong>{r.autor}</strong> · {r.ciudad}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
