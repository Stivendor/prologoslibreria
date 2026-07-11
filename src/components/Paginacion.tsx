interface Props {
  pagina: number;
  totalPaginas: number;
  alCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, totalPaginas, alCambiar }: Props) {
  if (totalPaginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button
        className="paginacion__btn"
        disabled={pagina <= 1}
        onClick={() => alCambiar(pagina - 1)}
      >
        ← Anterior
      </button>
      <span className="paginacion__info">
        Página {pagina} de {totalPaginas}
      </span>
      <button
        className="paginacion__btn"
        disabled={pagina >= totalPaginas}
        onClick={() => alCambiar(pagina + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}
