// Datos de contacto y marca de Prólogos Librería (de la planeación).
// Centralizados aquí para ajustarlos fácilmente cuando el cliente confirme.

export const CONTACTO = {
  whatsapp: '573206979160', // 320 697 9160 en formato internacional
  instagram: 'prologoslibreria',
  nombre: 'Prólogos Librería',
};

// UIDs de las cuentas administradoras en Firebase Auth. Deben coincidir con
// esAdmin() en firebase/firestore.rules y con ADMIN_UIDS en
// api/_lib/firebaseAdmin.ts; se exponen aquí para que la UI distinga una
// cuenta de cliente de una de administrador (el acceso real lo otorgan las
// rules).
export const UIDS_ADMIN = [
  'Ie9PZpQ2b3V2DnOHMCtPpKo0cTD3', // admin@gmail.com
  'MLMKGU0Pvmex6W7gPCYqRS99KQ92', // stivendor101@gmail.com
] as const;

export function esAdmin(uid?: string | null): boolean {
  return Boolean(uid) && (UIDS_ADMIN as readonly string[]).includes(uid as string);
}

export function urlWhatsApp(mensaje: string): string {
  return `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

// Enlace directo de WhatsApp a un cliente. Acepta el teléfono tal como lo
// escribió en el checkout; si parece un celular colombiano (10 dígitos que
// empiezan por 3) se le antepone el indicativo 57.
export function urlWhatsAppCliente(telefono: string): string {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 10 && digitos.startsWith('3')) digitos = `57${digitos}`;
  return `https://wa.me/${digitos}`;
}
