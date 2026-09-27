import { describe, expect, it } from 'vitest';
import type { Libro } from '../types';
import { MAX_POR_LIBRO, estaAgotado, etiquetaStock, maximoDisponible } from './stock';

// Escritura mínima para las funciones que solo miran `stock`.
const conStock = (stock: Libro['stock']): Pick<Libro, 'stock'> => ({ stock });

describe('maximoDisponible', () => {
  it('usa el tope global cuando no hay stock cargado (bajo demanda)', () => {
    expect(maximoDisponible(conStock(undefined))).toBe(MAX_POR_LIBRO);
    expect(maximoDisponible(conStock(null))).toBe(MAX_POR_LIBRO);
    expect(maximoDisponible(conStock(NaN))).toBe(MAX_POR_LIBRO);
  });

  it('respeta el stock cargado cuando es menor que el tope', () => {
    expect(maximoDisponible(conStock(1))).toBe(1);
    expect(maximoDisponible(conStock(3))).toBe(3);
    expect(maximoDisponible(conStock(5))).toBe(5);
  });

  it('limita al tope global cuando el stock lo supera', () => {
    expect(maximoDisponible(conStock(11))).toBe(MAX_POR_LIBRO);
    expect(maximoDisponible(conStock(99))).toBe(MAX_POR_LIBRO);
    expect(maximoDisponible(conStock(10))).toBe(MAX_POR_LIBRO);
  });

  it('nunca devuelve unidades negativas ni fracciones', () => {
    expect(maximoDisponible(conStock(-3))).toBe(0);
    expect(maximoDisponible(conStock(4.7))).toBe(4);
  });
});

describe('estaAgotado', () => {
  it('es true cuando no queda nada vendible', () => {
    expect(estaAgotado(conStock(0))).toBe(true);
    expect(estaAgotado(conStock(-1))).toBe(true);
  });

  it('es false con stock o sin stock cargado', () => {
    expect(estaAgotado(conStock(1))).toBe(false);
    expect(estaAgotado(conStock(undefined))).toBe(false);
    expect(estaAgotado(conStock(null))).toBe(false);
  });
});

describe('etiquetaStock', () => {
  it('no muestra nada para libros bajo demanda', () => {
    expect(etiquetaStock(conStock(undefined))).toBeNull();
    expect(etiquetaStock(conStock(null))).toBeNull();
    expect(etiquetaStock(conStock(NaN))).toBeNull();
  });

  it('marca agotados', () => {
    expect(etiquetaStock(conStock(0))).toBe('Agotado');
  });

  it('avisa escasez hasta 5 unidades inclusive', () => {
    expect(etiquetaStock(conStock(1))).toBe('Quedan 1');
    expect(etiquetaStock(conStock(5))).toBe('Quedan 5');
  });

  it('muestra el conteo normal a partir de 6', () => {
    expect(etiquetaStock(conStock(6))).toBe('6 disponibles');
    expect(etiquetaStock(conStock(40))).toBe('40 disponibles');
  });

  it('redondea fracciones hacia abajo', () => {
    expect(etiquetaStock(conStock(5.9))).toBe('Quedan 5');
  });
});
