import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

// Sube la portada de un libro a Storage (portadas/{libroId}) y devuelve su
// URL pública de descarga. Solo se usa desde el panel de administración.
export async function subirPortada(archivo: File, libroId: string): Promise<string> {
  if (!storage) throw new Error('El panel requiere Firebase configurado.');
  const destino = ref(storage, `portadas/${libroId}`);
  await uploadBytes(destino, archivo, { contentType: archivo.type });
  return getDownloadURL(destino);
}
