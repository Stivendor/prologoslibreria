import { describe, expect, it, vi } from 'vitest';

const fs = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db: unknown, nombre: string) => ({ tipo: 'coleccion', nombre })),
  doc: vi.fn((_db: unknown, ...ruta: string[]) => ({ tipo: 'doc', ruta })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((campo: string, dir?: string) => ({ tipo: 'orderBy', campo, dir })),
  query: vi.fn((...partes: unknown[]) => ({ tipo: 'query', partes })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  updateDoc: vi.fn(),
  where: vi.fn((campo: string, op: string, valor: unknown) => ({ tipo: 'where', campo, op, valor })),
}));

vi.mock('firebase/firestore', () => fs);
vi.mock('../lib/firebase', () => ({
  db: { nombre: 'db-de-pruebas' },
  auth: null,
  storage: null,
  usandoFirebase: true,
}));

import { crearPedido, suscribirsePedidos, suscribirsePedidosCliente } from './pedidos';
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

function capturarSuscripcion() {
  let alSnapshot: (snap: unknown) => void = () => {};
  let alError: (e: Error) => void = () => {};
  const baja = vi.fn();
  fs.onSnapshot.mockImplementation(
    (_q: unknown, onSnap: (s: unknown) => void, onErr: (e: Error) => void) => {
      alSnapshot = onSnap;
      alError = onErr;
      return baja;
    },
  );
  return {
    baja,
    snap: (docs: unknown[]) => alSnapshot({ docs }),
    error: (e: Error) => alError(e),
  };
}

describe('crearPedido', () => {
  it('lo registra como nuevo con un número corto citable por WhatsApp', async () => {
    fs.addDoc.mockResolvedValue({ id: 'doc-1' });

    const numero = await crearPedido(pedidoDePrueba);

    expect(numero).toMatch(/^P-\d{8}-[A-Z0-9]{4}$/);
    expect(fs.addDoc).toHaveBeenCalledTimes(1);

    const [coleccion, datos] = fs.addDoc.mock.calls[0];
    expect(coleccion).toEqual({ tipo: 'coleccion', nombre: 'pedidos' });
    expect(datos).toMatchObject({
      ...pedidoDePrueba,
      numero,
      estado: 'nuevo',
      creado_en: 'SERVER_TIMESTAMP',
      actualizado_en: 'SERVER_TIMESTAMP',
    });
    expect(datos).not.toHaveProperty('uid_cliente');
    expect(numero).toBe(datos.numero);
  });

  it('vincula el pedido a la cuenta cuando hay sesión', async () => {
    fs.addDoc.mockResolvedValue({ id: 'doc-2' });

    await crearPedido(pedidoDePrueba, 'uid-cliente-1');

    const [, datos] = fs.addDoc.mock.calls[0];
    expect(datos.uid_cliente).toBe('uid-cliente-1');
  });

  it('genera números distintos para pedidos consecutivos', async () => {
    fs.addDoc.mockResolvedValue({ id: 'doc-3' });

    const primero = await crearPedido(pedidoDePrueba);
    const segundo = await crearPedido(pedidoDePrueba);

    expect(primero).not.toBe(segundo);
  });
});

describe('suscribirsePedidos', () => {
  it('pide el orden a Firestore y mapea cada documento a un pedido', () => {
    const captura = capturarSuscripcion();
    const callback = vi.fn();

    expect(suscribirsePedidos(callback)).toBe(captura.baja);

    captura.snap([
      {
        id: 'p1',
        data: () => ({ numero: 'P-1', estado: 'nuevo', creado_en: { toDate: () => new Date('2026-01-02') } }),
      },
      {
        id: 'p2',
        data: () => ({ numero: 'P-2', estado: 'entregado', creado_en: { toDate: () => new Date('2026-01-01') } }),
      },
    ]);

    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'p1', numero: 'P-1', estado: 'nuevo' }),
      expect.objectContaining({ id: 'p2', numero: 'P-2', estado: 'entregado' }),
    ]);
    expect(fs.orderBy).toHaveBeenCalledWith('creado_en', 'desc');
  });

  it('avisa por onError si Firestore rechaza la lectura', () => {
    const captura = capturarSuscripcion();
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    suscribirsePedidos(vi.fn(), onError);
    captura.error(new Error('permission-denied'));

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    silencio.mockRestore();
  });
});

describe('suscribirsePedidosCliente', () => {
  it('filtra por uid_cliente y ordena en memoria de más reciente a más antiguo', () => {
    const captura = capturarSuscripcion();
    const callback = vi.fn();

    suscribirsePedidosCliente('uid-1', callback);

    expect(fs.where).toHaveBeenCalledWith('uid_cliente', '==', 'uid-1');

    captura.snap([
      { id: 'viejo', data: () => ({ creado_en: { toDate: () => new Date('2026-03-01') } }) },
      { id: 'nuevo', data: () => ({ creado_en: { toDate: () => new Date('2026-06-01') } }) },
    ]);

    const pedidos = callback.mock.calls[0][0] as { id: string }[];
    expect(pedidos.map((p) => p.id)).toEqual(['nuevo', 'viejo']);
  });
});
