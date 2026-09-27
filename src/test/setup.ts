import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Node 25 expone un `localStorage` global incompleto (sin getItem/setItem)
// cuando no se pasa --localstorage-file, y jsdom no lo reemplaza. Instalamos un
// almacenamiento en memoria con la misma API para que el carrito funcione.
class AlmacenPruebas implements Storage {
  private datos = new Map<string, string>();

  get length() {
    return this.datos.size;
  }

  key(indice: number): string | null {
    return [...this.datos.keys()][indice] ?? null;
  }

  getItem(clave: string): string | null {
    return this.datos.has(clave) ? (this.datos.get(clave) as string) : null;
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, String(valor));
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  clear(): void {
    this.datos.clear();
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new AlmacenPruebas(),
  configurable: true,
  writable: true,
  enumerable: true,
});

// Cada prueba arranca con un localStorage limpio: el carrito se persiste ahí
// y su estado anterior se filtraría entre archivos de prueba.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom no implementa las transiciones del <dialog> nativo ni scrollIntoView.
// Sin estos stubs el CheckoutModal truena al montar y CatalogPage al paginar.
const proto = typeof HTMLDialogElement !== 'undefined' ? HTMLDialogElement.prototype : null;
if (proto && !proto.showModal) {
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
}
if (proto && !proto.close) {
  proto.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
