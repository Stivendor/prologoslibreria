// Gestión de cuentas de cliente con el Admin SDK (salta las reglas de
// seguridad). El navegador NO puede borrar ni bloquear usuarios de Firebase
// Auth, así que esas operaciones se hacen desde aquí.
//
// Uso:
//   node firebase/usuarios-admin.mjs listar
//   node firebase/usuarios-admin.mjs bloquear <uid>
//   node firebase/usuarios-admin.mjs desbloquear <uid>
//   node firebase/usuarios-admin.mjs borrar <uid>
//
// Requisitos (igual que el seed): firebase/serviceAccount.json descargado de
// Firebase Console → Configuración del proyecto → Cuentas de servicio.
// ¡serviceAccount.json y .env están en .gitignore: nunca se suben a git!

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const aqui = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(readFileSync(join(aqui, 'serviceAccount.json'), 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const [, , comando, argumento] = process.argv;

function fecha(ts) {
  return ts instanceof Timestamp ? ts.toDate().toLocaleString('es-CO') : '—';
}

async function listar() {
  // listUsers pagina solo (1000 por llamada).
  let token;
  const cuentas = [];
  do {
    const pagina = await auth.listUsers(1000, token);
    cuentas.push(...pagina.users);
    token = pagina.pageToken;
  } while (token);

  if (cuentas.length === 0) {
    console.log('No hay usuarios en Firebase Auth.');
    return;
  }

  console.log(`\n${cuentas.length} usuario(s) en Firebase Auth:\n`);
  for (const u of cuentas) {
    const doc = await db.collection('usuarios').doc(u.uid).get();
    const perfil = doc.exists ? doc.data() : null;
    console.log([
      u.uid,
      u.email ?? '(sin correo)',
      u.disabled ? 'BLOQUEADO' : 'activo',
      perfil ? `perfil: ${perfil.nombre || 'sin nombre'}${perfil.activo === false ? ' (cuenta inactiva)' : ''}` : 'sin doc usuarios/',
      `creado: ${fecha(u.metadata.creationTime)}`,
    ].join(' · '));
  }
  console.log('');
}

async function bloquear(uid, disabled) {
  // Auth primero (el bloqueo real del login) y después el documento, para que
  // el panel refleje el mismo estado.
  await auth.updateUser(uid, { disabled });
  await db.collection('usuarios').doc(uid).set(
    { activo: !disabled, actualizado_en: Timestamp.now() },
    { merge: true }
  );
  console.log(
    disabled
      ? `Cuenta ${uid} bloqueada: ya no puede iniciar sesión.`
      : `Cuenta ${uid} desbloqueada: ya puede iniciar sesión.`
  );
}

async function borrar(uid) {
  const doc = await db.collection('usuarios').doc(uid).get();
  await auth.deleteUser(uid);
  if (doc.exists) await doc.ref.delete();
  console.log(
    `Usuario ${uid} eliminado de Firebase Auth${doc.exists ? ' y de la colección usuarios/' : ''}.\n` +
      'Los pedidos que ya hizo se conservan (quedan sin dueño visible).'
  );
}

async function main() {
  switch (comando) {
    case 'listar':
      await listar();
      break;
    case 'bloquear':
      if (!argumento) throw new Error('Falta el uid: node firebase/usuarios-admin.mjs bloquear <uid>');
      await bloquear(argumento, true);
      break;
    case 'desbloquear':
      if (!argumento) throw new Error('Falta el uid: node firebase/usuarios-admin.mjs desbloquear <uid>');
      await bloquear(argumento, false);
      break;
    case 'borrar':
      if (!argumento) throw new Error('Falta el uid: node firebase/usuarios-admin.mjs borrar <uid>');
      await borrar(argumento);
      break;
    default:
      console.log(
        [
          'Uso:',
          '  node firebase/usuarios-admin.mjs listar',
          '  node firebase/usuarios-admin.mjs bloquear <uid>',
          '  node firebase/usuarios-admin.mjs desbloquear <uid>',
          '  node firebase/usuarios-admin.mjs borrar <uid>',
        ].join('\n')
      );
  }
}

main().catch((e) => {
  console.error('Error:', e.errorInfo?.message ?? e.message);
  process.exit(1);
});
