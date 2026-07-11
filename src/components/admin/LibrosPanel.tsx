import { useCallback, useEffect, useState } from 'react';
import type { Categoria, Libro } from '../../types';
import {
  actualizarLibro,
  eliminarLibro,
  obtenerCategorias,
  obtenerLibrosAdmin,
} from '../../data/catalogo';
import { formatearPrecio } from '../../lib/format';
import { LibroForm } from './LibroForm';
import { Paginacion } from '../Paginacion';

const LIBROS_POR_PAGINA = 15;

// Normaliza para buscar sin distinguir mayúsculas ni tildes.
const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function LibrosPanel() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Libro | 'nuevo' | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [ls, cs] = await Promise.all([obtenerLibrosAdmin(), obtenerCategorias()]);
      setLibros(ls);
      setCategorias(cs);
    } catch {
      setError('No se pudieron cargar los libros.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarActivo(libro: Libro) {
    setError('');
    try {
      await actualizarLibro(libro.id, { activo: !libro.activo });
      cargar();
    } catch {
      setError('No se pudo actualizar el libro.');
    }
  }

  async function borrar(libro: Libro) {
    if (!window.confirm(`¿Borrar "${libro.titulo}"? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await eliminarLibro(libro.id);
      cargar();
    } catch {
      setError('No se pudo borrar el libro.');
    }
  }

  if (editando) {
    return (
      <LibroForm
        libro={editando === 'nuevo' ? null : editando}
        categorias={categorias}
        alTerminar={() => {
          setEditando(null);
          cargar();
        }}
        alCancelar={() => setEditando(null)}
      />
    );
  }

  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  const termino = normalizar(busqueda.trim());
  const visibles = termino
    ? libros.filter(
        (l) => normalizar(l.titulo).includes(termino) || normalizar(l.autor).includes(termino)
      )
    : libros;

  const totalPaginas = Math.ceil(visibles.length / LIBROS_POR_PAGINA);
  // Si la lista se encoge (borrado, búsqueda), no quedarse en una página vacía.
  const paginaActual = Math.min(pagina, Math.max(totalPaginas, 1));
  const enPagina = visibles.slice(
    (paginaActual - 1) * LIBROS_POR_PAGINA,
    paginaActual * LIBROS_POR_PAGINA
  );

  return (
    <section>
      <div className="admin-tabla__head">
        <p>
          {termino
            ? `${visibles.length} de ${libros.length} libros`
            : `${libros.length} libros (${libros.filter((l) => l.activo).length} visibles)`}
        </p>
        <input
          type="search"
          className="admin-buscar"
          placeholder="Buscar por título o autor…"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
        />
        <button className="btn" onClick={() => setEditando('nuevo')}>
          + Nuevo libro
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}
      {cargando && <p>Cargando libros…</p>}

      {!cargando && (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Libro ID</th>
                <th>Título</th>
                <th>Autor</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enPagina.map((libro) => (
                <tr key={libro.id}>
                  <td className="admin-tabla__id">{libro.id}</td>
                  <td>{libro.titulo}</td>
                  <td>{libro.autor}</td>
                  <td>{formatearPrecio(libro.precio)}</td>
                  <td>{nombreCategoria(libro.categoria_id)}</td>
                  <td>
                    <span className={`admin-badge${libro.activo ? '' : ' admin-badge--off'}`}>
                      {libro.activo ? 'Visible' : 'Oculto'}
                    </span>
                  </td>
                  <td className="admin-tabla__acciones">
                    <button onClick={() => setEditando(libro)}>Editar</button>
                    <button onClick={() => alternarActivo(libro)}>
                      {libro.activo ? 'Ocultar' : 'Mostrar'}
                    </button>
                    <button onClick={() => borrar(libro)}>Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacion pagina={paginaActual} totalPaginas={totalPaginas} alCambiar={setPagina} />
        </div>
      )}
    </section>
  );
}
