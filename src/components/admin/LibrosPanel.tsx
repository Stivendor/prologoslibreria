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

export function LibrosPanel() {
  const [libros, setLibros] = useState<Libro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Libro | 'nuevo' | null>(null);
  const [cargando, setCargando] = useState(true);
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

  return (
    <section>
      <div className="admin-tabla__head">
        <p>
          {libros.length} libros ({libros.filter((l) => l.activo).length} visibles)
        </p>
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
                <th>Título</th>
                <th>Autor</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {libros.map((libro) => (
                <tr key={libro.id}>
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
        </div>
      )}
    </section>
  );
}
