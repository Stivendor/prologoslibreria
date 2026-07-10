interface Props {
  valor: number;
  resenas?: number;
}

// Estrellas en tono monocromático (llenas / vacías) según la calificación.
export function StarRating({ valor, resenas }: Props) {
  const estrellas = [1, 2, 3, 4, 5];
  return (
    <span className="stars" aria-label={`${valor} de 5 estrellas`}>
      {estrellas.map((n) => (
        <svg key={n} viewBox="0 0 20 20" className={`star ${valor >= n - 0.5 ? 'star--on' : ''}`} aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.8 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
      {resenas !== undefined && <span className="stars__count">({resenas})</span>}
    </span>
  );
}
