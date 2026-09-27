import { describe, expect, it } from 'vitest';
import { formatearPrecio, soloDigitos } from './format';

describe('formatearPrecio', () => {
  it('agrupa los miles en formato colombiano', () => {
    expect(formatearPrecio(68000)).toContain('68.000');
    expect(formatearPrecio(1234567)).toContain('1.234.567');
  });

  it('no muestra decimales (el catálogo trabaja en pesos enteros)', () => {
    expect(formatearPrecio(68000)).not.toMatch(/[.,]\d{1,2}$/);
    expect(formatearPrecio(0)).toMatch(/0/);
  });

  it('incluye el símbolo de moneda', () => {
    expect(formatearPrecio(68000)).toMatch(/\$/);
  });
});

describe('soloDigitos', () => {
  it('conserva únicamente dígitos', () => {
    expect(soloDigitos('320 697-9160')).toBe('3206979160');
    expect(soloDigitos('+57 (320) 697 9160')).toBe('573206979160');
    expect(soloDigitos('calle 12 #34-56')).toBe('123456');
  });

  it('devuelve cadena vacía cuando no hay dígitos', () => {
    expect(soloDigitos('')).toBe('');
    expect(soloDigitos('abc')).toBe('');
    expect(soloDigitos('!!!')).toBe('');
  });
});
