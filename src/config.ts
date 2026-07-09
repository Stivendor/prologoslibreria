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
