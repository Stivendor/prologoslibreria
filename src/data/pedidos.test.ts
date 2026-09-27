import { describe, expect, it, vi } from 'vitest';

// Sin Firebase no hay pedidos persistidos: el canal de venta sigue siendo WhatsApp.
vi.mock('../lib/firebase', () => ({
  db: null,
  auth: null,
  storage: null,
  usandoFirebase: false,
}));

import { crearPedido, suscribirsePedidos, suscribirsePedidosCliente, actualizarEstadoPedido } from './pedidos';
import type { NuevoPedido } from './pedidos';

const pedidoDePrueba: NuevoPedido = {
  items: [{ libro_id: 'lib-001', titulo: 'Viviendo Su Voluntad', precio: 68000, cantidad: 2 }],
  total: 136000,
  cliente: {
    nombre: 'Ana Pérez',
    telefono: '3206979160',
    email: 'ana@correo.com',
    ciudad: 'Bogotá',
    direccion: 'Calle 1 #2-3',
  },
};

describe('crearPedido sin Firebase', () => {
  it('devuelve null (el pedido continúa solo por WhatsApp)', async () => {
    expect(await crearPedido(pedidoDePrueba)).toBeNull();
    expect(await crearPedido(pedidoDePrueba, 'uid-1')).toBeNull();
  });
});

describe('suscripciones sin Firebase', () => {
  it('suscribirsePedidos devuelve un unsubscribe inofensivo', () => {
    const callback = vi.fn();
    const baja = suscribirsePedidos(callback);

    expect(typeof baja).toBe('function');
    expect(callback).not.toHaveBeenCalled();
    expect(() => baja()).not.toThrow();
  });

  it('suscribirsePedidosCliente devuelve un unsubscribe inofensivo', () => {
    const callback = vi.fn();
    const baja = suscribirsePedidosCliente('uid-1', callback);

    expect(typeof baja).toBe('function');
    expect(callback).not.toHaveBeenCalled();
    expect(() => baja()).not.toThrow();
  });
});

describe('actualizarEstadoPedido sin Firebase', () => {
  it('rechaza: el panel no funciona sin backend', async () => {
    await expect(actualizarEstadoPedido('id', 'confirmado')).rejects.toThrow(
      'El panel de administración requiere Firebase configurado.',
    );
  });
});
