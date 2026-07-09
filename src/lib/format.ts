// Formato de precios en pesos colombianos (COP).
const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor: number): string {
  return formatter.format(valor);
}
