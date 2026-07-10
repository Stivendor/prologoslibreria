// Datos de contacto y marca de Prólogos Librería (de la planeación).
// Centralizados aquí para ajustarlos fácilmente cuando el cliente confirme.

export const CONTACTO = {
  whatsapp: '573206979160', // 320 697 9160 en formato internacional
  instagram: 'prologoslibreria',
  nombre: 'Prólogos Librería',
};

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
