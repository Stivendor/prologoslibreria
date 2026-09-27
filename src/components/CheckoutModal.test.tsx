import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Libro } from '../types';
import { CartProvider, useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { usePerfil } from '../hooks/usePerfil';
import { crearPedido } from '../data/pedidos';
import { formatearPrecio } from '../lib/format';
import { CheckoutModal } from './CheckoutModal';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/usePerfil', () => ({ usePerfil: vi.fn() }));
vi.mock('../data/pedidos', () => ({ crearPedido: vi.fn() }));

const CLAVE = 'prologos-carrito';

function libro(extra: Partial<Libro> = {}): Libro {
  return {
    id: 'lib-001',
    titulo: 'Viviendo Su Voluntad',
    autor: 'Sebastián Franz',
    precio: 68000,
    descripcion: '',
    imagen_url: null,
    categoria_id: 'cat-favoritos',
    activo: true,
    destacado: false,
    ...extra,
  };
}

// Permite tocar el carrito desde el test (p. ej. simular que el admin bajó el
// stock del libro que ya estaba en la compra).
let carrito: ReturnType<typeof useCart> | null = null;
function EspiaCarrito() {
  carrito = useCart();
  return null;
}

function pintar(abierto = true, onCerrar = vi.fn()) {
  return render(
    <MemoryRouter>
      <CartProvider>
        <EspiaCarrito />
        <CheckoutModal abierto={abierto} onCerrar={onCerrar} />
      </CartProvider>
    </MemoryRouter>,
  );
}

function llenarFormulario(usuario: ReturnType<typeof userEvent.setup>) {
  // En serie: user-event comparte el foco, en paralelo escribiría en campos
  // equivocados.
  return (async () => {
    await usuario.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await usuario.type(screen.getByLabelText('Teléfono / WhatsApp'), '3206979160');
    await usuario.type(screen.getByLabelText('Ciudad'), 'Bogotá');
    await usuario.type(screen.getByLabelText('Dirección'), 'Calle 1 #2-3');
  })();
}

const botonConfirmar = () =>
  screen.getByRole('button', { name: /Confirmar pedido por WhatsApp/ });

beforeEach(() => {
  carrito = null;
  localStorage.setItem(
    CLAVE,
    JSON.stringify([{ libro: libro({ stock: 4 }), cantidad: 2 }]),
  );
  vi.mocked(useAuth).mockReturnValue({
    usuario: null,
    cargando: false,
    cuentaDesactivada: false,
    entrar: vi.fn(),
    registrarse: vi.fn(),
    restablecerClave: vi.fn(),
    salir: vi.fn(),
  });
  vi.mocked(usePerfil).mockReturnValue({
    perfil: null,
    cargando: false,
    guardando: false,
    error: null,
    guardar: vi.fn().mockResolvedValue(false),
  });
  vi.mocked(crearPedido).mockResolvedValue('P-20260926-AB12');
});

describe('Checkout: validación', () => {
  it('tiene el botón deshabilitado con el formulario incompleto', () => {
    pintar();

    expect(botonConfirmar()).toBeDisabled();
  });

  it('marca un correo inválido y no deja confirmar', async () => {
    const usuario = userEvent.setup();
    pintar();

    await usuario.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'no-es-correo');
    await usuario.type(screen.getByLabelText('Teléfono / WhatsApp'), '3206979160');
    await usuario.type(screen.getByLabelText('Ciudad'), 'Bogotá');
    await usuario.type(screen.getByLabelText('Dirección'), 'Calle 1 #2-3');

    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(botonConfirmar()).toBeDisabled();
  });

  it('habilita la confirmación con todos los datos', async () => {
    const usuario = userEvent.setup();
    pintar();

    await llenarFormulario(usuario);

    expect(botonConfirmar()).toBeEnabled();
  });

  it('deja en el teléfono solo dígitos', async () => {
    const usuario = userEvent.setup();
    pintar();

    const telefono = screen.getByLabelText('Teléfono / WhatsApp');
    await usuario.type(telefono, 'abc 320-697 9160');

    expect(telefono).toHaveValue('3206979160');
  });
});

describe('Checkout: resumen del pedido', () => {
  it('lista los artículos y el total', () => {
    pintar();

    const resumen = screen.getByRole('complementary');
    expect(within(resumen).getByText('2 × Viviendo Su Voluntad')).toBeInTheDocument();
    // Los precios llevan espacio duro de Intl: se comparan contra textContent.
    expect(resumen.textContent).toContain(formatearPrecio(136000));
  });
});

describe('Checkout: confirmación', () => {
  it('registra el pedido, abre WhatsApp y vacía el carrito', async () => {
    const usuario = userEvent.setup();
    const abierto = vi.spyOn(window, 'open').mockReturnValue(null);
    pintar();

    await llenarFormulario(usuario);
    await usuario.click(botonConfirmar());

    expect(await screen.findByText('¡Pedido enviado!')).toBeInTheDocument();

    expect(crearPedido).toHaveBeenCalledTimes(1);
    const [datos, uid] = vi.mocked(crearPedido).mock.calls[0];
    expect(datos.items).toEqual([
      { libro_id: 'lib-001', titulo: 'Viviendo Su Voluntad', precio: 68000, cantidad: 2 },
    ]);
    expect(datos.total).toBe(136000);
    expect(datos.cliente).toEqual({
      nombre: 'Ana Pérez',
      email: 'ana@correo.com',
      telefono: '3206979160',
      ciudad: 'Bogotá',
      direccion: 'Calle 1 #2-3',
    });
    expect(uid).toBeUndefined();

    // La ventana se abre dentro del gesto del usuario (Safari bloquea el resto).
    expect(abierto).toHaveBeenCalledWith('', '_blank');

    // El carrito queda listo para la próxima compra.
    expect(localStorage.getItem(CLAVE)).toBe('[]');

    const whatsapp = screen.getByRole('link', { name: 'Abrir WhatsApp' });
    expect(whatsapp).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(whatsapp).toHaveAttribute('href', expect.stringContaining('P-20260926-AB12'));
  });

  it('sin sesión el pedido queda como invitado', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(window, 'open').mockReturnValue(null);
    pintar();

    await llenarFormulario(usuario);
    await usuario.click(botonConfirmar());
    await screen.findByText('¡Pedido enviado!');

    expect(vi.mocked(crearPedido).mock.calls[0][1]).toBeUndefined();
  });

  it('el honeypot descarta los bots sin gastar el pedido', async () => {
    const usuario = userEvent.setup();
    const abierto = vi.spyOn(window, 'open').mockReturnValue(null);
    pintar();

    await llenarFormulario(usuario);
    await usuario.type(screen.getByLabelText('No Complete Este Campo'), 'https://spam.bot');
    await usuario.click(botonConfirmar());

    expect(crearPedido).not.toHaveBeenCalled();
    expect(abierto).not.toHaveBeenCalled();
    expect(screen.queryByText('¡Pedido enviado!')).not.toBeInTheDocument();
    expect(botonConfirmar()).toBeEnabled();
  });
});

describe('Checkout: stock', () => {
  it('avisa si el stock bajó después de agregar y permite ajustar', async () => {
    const usuario = userEvent.setup();
    pintar();
    await llenarFormulario(usuario);

    expect(botonConfirmar()).toBeEnabled();

    // El admin bajó el stock del título que ya estaba en el carrito.
    act(() => {
      carrito!.items[0].libro.stock = 1;
      carrito!.abrirCarrito();
    });

    expect(
      screen.getByText('Hay títulos que superan el stock disponible:'),
    ).toBeInTheDocument();
    expect(botonConfirmar()).toBeDisabled();

    await usuario.click(screen.getByRole('button', { name: 'Ajustar a 1' }));

    expect(
      screen.queryByText('Hay títulos que superan el stock disponible:'),
    ).not.toBeInTheDocument();
    expect(botonConfirmar()).toBeEnabled();
  });
});

describe('Checkout: apertura y cierre', () => {
  it('el botón de cerrar notifica al padre', async () => {
    const usuario = userEvent.setup();
    const onCerrar = vi.fn();
    pintar(true, onCerrar);

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
