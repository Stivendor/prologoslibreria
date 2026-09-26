// Formato de precios en pesos colombianos (COP).
const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor: number): string {
  return formatter.format(valor);
}

// Deja únicamente dígitos: los campos de teléfono no aceptan letras ni
// símbolos, y WhatsApp (wa.me) siempre recibe números limpios.
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}
