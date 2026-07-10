// Carga el catálogo de ejemplo en Firestore.
// Uso (cuando Prólogos tenga el proyecto de Firebase creado):
//
//   1. npm install firebase-admin
//   2. Descarga la clave de servicio desde:
//      Firebase Console → Configuración del proyecto → Cuentas de servicio →
//      "Generar nueva clave privada"  →  guárdala como firebase/serviceAccount.json
//      (¡NO la subas a git! Ya está en .gitignore)
//   3. node firebase/seed-firestore.mjs
//
// El script escribe con el Admin SDK, que ignora las reglas de seguridad.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const aqui = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(aqui, 'serviceAccount.json'), 'utf8'),
);
const { categorias, libros } = JSON.parse(
  readFileSync(join(aqui, 'catalogo.seed.json'), 'utf8'),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function cargar() {
  const lote = db.batch();

  for (const c of categorias) {
    const { id, ...datos } = c;
    lote.set(db.collection('categorias').doc(id), datos);
  }

  for (const l of libros) {
    const { id, ...datos } = l;
    lote.set(db.collection('libros').doc(id), {
      ...datos,
      creado_en: new Date(),
    });
  }

  await lote.commit();
  console.log(
    `Listo: ${categorias.length} categorías y ${libros.length} libros cargados en Firestore.`,
  );
}

cargar().catch((e) => {
  console.error('Error cargando el catálogo:', e);
  process.exit(1);
});
