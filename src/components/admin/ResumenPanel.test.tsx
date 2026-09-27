import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pedido, PedidoItem } from '../../types';
import { formatearPrecio } from '../../lib/format';
import { suscribirsePedidos } from '../../data/pedidos';
import { ResumenPanel } from './ResumenPanel';

vi.mock('../../data/pedidos', () => ({ suscribirsePedidos: vi.fn() }));

const MES_ACTUAL = new Date();
const MES_VIEJO = new Date(2000, 0, 15);

function items(...lista: [string, string, number, number][]): PedidoItem[] {
  return lista.map(([libro_id, titulo, precio, cantidad]) => ({
    libro_id,
    titulo,
    precio,
    cantidad,
  }));
}

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    id: 'p1',
    numero: 'P-20260101-AAAA',
    items: [],
    total: 0,
    cliente: {
      nombre: 'Ana',
      telefono: '3206979160',
      email: 'ana@correo.com',
      ciudad: 'Bogotá',
      direccion: 'Calle 1',
    },
    estado: 'nuevo',
    creado_en: { toDate: () => MES_ACTUAL },
    ...parcial,
  };
}

function conPedidos(lista: Pedido[]) {
  vi.mocked(suscribirsePedidos).mockImplementation((callback) => {
    callback(lista);
    return () => {};
  });
}

// El valor de una métrica vive en el hermano de su etiqueta.
const valorStat = (etiqueta: string) =>
  screen.getByText(etiqueta).nextElementSibling?.textContent ?? '';

// jest-dom y getByText normalizan el espacio duro de Intl a espacio simple.
const precio = (valor: number) => formatearPrecio(valor).replace(/\s/g, ' ');

beforeEach(() => {
  conPedidos([]);
});

describe('ResumenPanel: estado vacío', () => {
  it('espera la primera venta', () => {
    render(<ResumenPanel />);

    expect(
      screen.getByText('Aún no hay pedidos: las estadísticas aparecerán con la primera venta.'),
    ).toBeInTheDocument();
  });

  it('informa si Firestore rechaza la lectura', () => {
    vi.mocked(suscribirsePedidos).mockImplementation((_cb, onError) => {
      onError?.(new Error('permission-denied'));
      return () => {};
    });

    render(<ResumenPanel />);

    expect(
      screen.getByText(
        'No se pudieron cargar los pedidos. Verifica que tu usuario tenga permisos de administrador.',
      ),
    ).toBeInTheDocument();
  });
});

describe('ResumenPanel: métricas', () => {
  const pedidos: Pedido[] = [
    pedido({
      id: 'p1',
      estado: 'nuevo',
      total: 100000,
      items: items(['lib-a', 'Libro A', 50000, 2]),
    }),
    pedido({
      id: 'p2',
      estado: 'entregado',
      total: 60000,
      items: items(['lib-b', 'Libro B', 60000, 1]),
    }),
    // Cancelado: no cuenta en ninguna métrica.
    pedido({
      id: 'p3',
      estado: 'cancelado',
      total: 999999,
      items: items(['lib-c', 'Libro Cancelado', 999999, 1]),
    }),
    // De otro mes: solo suma al ticket promedio histórico.
    pedido({
      id: 'p4',
      estado: 'confirmado',
      total: 40000,
      creado_en: { toDate: () => MES_VIEJO },
      items: items(['lib-a', 'Libro A', 40000, 1]),
    }),
  ];

  beforeEach(() => {
    conPedidos(pedidos);
  });

  it('cuenta los pedidos nuevos por atender', () => {
    render(<ResumenPanel />);

    expect(valorStat('Pedidos nuevos')).toBe('1');
    expect(screen.getByText('por atender')).toBeInTheDocument();
  });

  it('suma los ingresos del mes sin cancelados', () => {
    render(<ResumenPanel />);

    expect(valorStat('Ingresos del mes')).toBe(formatearPrecio(100000 + 60000));
    expect(screen.getByText('2 pedidos este mes')).toBeInTheDocument();
  });

  it('promedia el ticket histórico excluyendo cancelados', () => {
    render(<ResumenPanel />);

    const esperado = Math.round((100000 + 60000 + 40000) / 3);
    expect(valorStat('Ticket promedio')).toBe(formatearPrecio(esperado));
    expect(screen.getByText('histórico, sin cancelados')).toBeInTheDocument();
  });

  it('cuenta pedidos totales sin cancelados', () => {
    render(<ResumenPanel />);

    expect(valorStat('Pedidos totales')).toBe('3');
  });

  it('ordena los libros más vendidos por unidades y descuenta los cancelados', () => {
    render(<ResumenPanel />);

    const filas = screen.getAllByRole('listitem');
    // Libro A: 2 (p1) + 1 (p4) = 3 uds.; Libro B: 1 ud.
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent('Libro A');
    expect(filas[0]).toHaveTextContent('3 uds.');
    expect(filas[0]).toHaveTextContent(precio(50000 * 2 + 40000));
    expect(filas[1]).toHaveTextContent('Libro B');
    expect(screen.queryByText('Libro Cancelado')).not.toBeInTheDocument();
  });

  it('escribe "ud." singular con una sola unidad', () => {
    conPedidos([pedido({ id: 'p1', estado: 'entregado', total: 60000, items: items(['lib-b', 'Libro B', 60000, 1]) })]);
    render(<ResumenPanel />);

    expect(screen.getByRole('listitem')).toHaveTextContent('1 ud.');
  });
});
