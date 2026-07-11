import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Categoria, Libro } from '../../types';
import { actualizarLibro, crearLibro } from '../../data/catalogo';
import { subirPortada } from '../../lib/storage';

interface Props {
  libro: Libro | null; // null = crear uno nuevo
  categorias: Categoria[];
  alTerminar: () => void;
  alCancelar: () => void;
}

export function LibroForm({ libro, categorias, alTerminar, alCancelar }: Props) {
  const [datos, setDatos] = useState({
    titulo: libro?.titulo ?? '',
    autor: libro?.autor ?? '',
    precio: libro ? String(libro.precio) : '',
    descripcion: libro?.descripcion ?? '',
    categoria_id: libro?.categoria_id ?? categorias[0]?.id ?? '',
    etiqueta: libro?.etiqueta ?? '',
    activo: libro?.activo ?? true,
    destacado: libro?.destacado ?? false,
  });
  const [portada, setPortada] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const set =
    (campo: 'titulo' | 'autor' | 'precio' | 'etiqueta') =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setDatos((d) => ({ ...d, [campo]: e.target.value }));

  // Valida contra las reglas de Storage (imagen y < 5 MB) antes de subir,
  // para dar un mensaje claro en vez del 403 genérico.
  function elegirPortada(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    setError('');
    if (archivo && !archivo.type.startsWith('image/')) {
      setError('El archivo no es una imagen. Usa JPG, PNG o WebP.');
      e.target.value = '';
      setPortada(null);
      return;
    }
    if (archivo && archivo.size >= 5 * 1024 * 1024) {
      const mb = (archivo.size / 1024 / 1024).toFixed(1);
      setError(`La imagen pesa ${mb} MB y el máximo es 5 MB. Redúcela (p. ej. en squoosh.app) e inténtalo de nuevo.`);
      e.target.value = '';
      setPortada(null);
      return;
    }
    setPortada(archivo);
  }

  const valido =
    datos.titulo.trim() !== '' &&
    datos.autor.trim() !== '' &&
    Number(datos.precio) > 0 &&
    datos.categoria_id !== '';

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!valido || guardando) return;
    setGuardando(true);
    setError('');
    try {
      const base = {
        titulo: datos.titulo.trim(),
        autor: datos.autor.trim(),
        precio: Number(datos.precio),
        descripcion: datos.descripcion.trim(),
        categoria_id: datos.categoria_id,
        etiqueta: datos.etiqueta.trim(),
        activo: datos.activo,
        destacado: datos.destacado,
      };
      if (libro) {
        // Edición: si hay portada nueva se sube primero; si no, se conserva.
        const imagen_url = portada ? await subirPortada(portada, libro.id) : libro.imagen_url;
        await actualizarLibro(libro.id, { ...base, imagen_url });
      } else {
        // Alta: primero el documento (para tener id), luego la portada.
        const id = await crearLibro({ ...base, imagen_url: null });
        if (portada) {
          const url = await subirPortada(portada, id);
          await actualizarLibro(id, { imagen_url: url });
        }
      }
      alTerminar();
    } catch {
      setError('No se pudo guardar el libro. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={guardar}>
      <h2>{libro ? `Editar: ${libro.titulo}` : 'Nuevo libro'}</h2>

      <div className="admin-form__row">
        <label>
          Título
          <input value={datos.titulo} onChange={set('titulo')} required />
        </label>
        <label>
          Autor
          <input value={datos.autor} onChange={set('autor')} required />
        </label>
      </div>

      <div className="admin-form__row">
        <label>
          Precio (COP)
          <input
            type="number"
            min="0"
            step="100"
            value={datos.precio}
            onChange={set('precio')}
            required
          />
        </label>
        <label>
          Categoría
          <select
            value={datos.categoria_id}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setDatos((d) => ({ ...d, categoria_id: e.target.value }))
            }
            required
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Descripción
        <textarea
          rows={4}
          value={datos.descripcion}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setDatos((d) => ({ ...d, descripcion: e.target.value }))
          }
        />
      </label>

      <div className="admin-form__row">
        <label>
          Etiqueta (opcional, p. ej. "Novedad")
          <input value={datos.etiqueta} onChange={set('etiqueta')} />
        </label>
        <label>
          Portada (imagen, máx. 5 MB)
          <input type="file" accept="image/*" onChange={elegirPortada} />
        </label>
      </div>

      {libro?.imagen_url && (
        <div className="admin-form__portada">
          <img src={libro.imagen_url} alt={`Portada actual de ${libro.titulo}`} />
          <p>
            {portada
              ? `Se reemplazará por "${portada.name}" al guardar.`
              : 'Portada actual. Elige un archivo solo si quieres reemplazarla.'}
          </p>
        </div>
      )}

      <div className="admin-form__checks">
        <label>
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => setDatos((d) => ({ ...d, activo: e.target.checked }))}
          />
          Visible en el catálogo
        </label>
        <label>
          <input
            type="checkbox"
            checked={datos.destacado}
            onChange={(e) => setDatos((d) => ({ ...d, destacado: e.target.checked }))}
          />
          Destacado (Libros del mes)
        </label>
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="admin-form__acciones">
        <button type="submit" className="btn" disabled={!valido || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="btn btn--sec" onClick={alCancelar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
