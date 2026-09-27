import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from './firebase';

// Sube la portada de un libro a Storage (portadas/{libroId}) y devuelve su
// URL pública de descarga. Solo se usa desde el panel de administración.
// `getStorage` vive aquí (y no en lib/firebase.ts) para que el SDK de Storage
// caiga en el chunk lazy del panel en vez de en el bundle inicial.
export async function subirPortada(archivo: File, libroId: string): Promise<string> {
  if (!app) throw new Error('El panel requiere Firebase configurado.');
  const destino = ref(getStorage(app), `portadas/${libroId}`);
  await uploadBytes(destino, archivo, { contentType: archivo.type });
  return getDownloadURL(destino);
}
