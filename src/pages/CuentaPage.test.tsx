import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { User } from 'firebase/auth';
import type { Perfil } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePerfil } from '../hooks/usePerfil';
import { suscribirsePedidosCliente } from '../data/pedidos';
import { CuentaPage } from './CuentaPage';

vi.mock('../lib/firebase', () => ({
  usandoFirebase: true,
  db: {},
  auth: null,
  storage: null,
}));
vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/usePerfil', () => ({ usePerfil: vi.fn() }));
vi.mock('../data/pedidos', () => ({ suscribirsePedidosCliente: vi.fn() }));

interface AuthPrueba {
  entrar: Mock;
  registrarse: Mock;
  restablecerClave: Mock;
  salir: Mock;
}

let guardarMock = vi.fn(async (_datos: Perfil) => true);

function montarAuth({
  usuario = null,
  cargando = false,
  cuentaDesactivada = false,
}: {
  usuario?: User | null;
  cargando?: boolean;
  cuentaDesactivada?: boolean;
} = {}): AuthPrueba {
  const auth: AuthPrueba = {
    entrar: vi.fn().mockResolvedValue(undefined),
    registrarse: vi.fn().mockResolvedValue(undefined),
    restablecerClave: vi.fn().mockResolvedValue(undefined),
    salir: vi.fn().mockResolvedValue(undefined),
  };
  vi.mocked(useAuth).mockReturnValue({
    usuario,
    cargando,
    cuentaDesactivada,
    ...auth,
  });
  return auth;
}

function montarPerfil(perfil: Perfil | null) {
  guardarMock = vi.fn(async (_datos: Perfil) => true);
  vi.mocked(usePerfil).mockReturnValue({
    perfil,
    cargando: false,
    guardando: false,
    error: null,
    guardar: guardarMock,
  });
}

const pintar = () =>
  render(
    <MemoryRouter>
      <CuentaPage />
    </MemoryRouter>,
  );

// El label de la contraseña incluye el texto de ayuda en modo registro.
const campoClave = () => screen.getByLabelText(/^Contraseña/);

beforeEach(() => {
  montarPerfil(null);
  vi.mocked(suscribirsePedidosCliente).mockImplementation((_uid, callback) => {
    callback([]);
    return () => {};
  });
});

describe('CuentaPage: guards', () => {
  it('espera la sesión', () => {
    montarAuth({ cargando: true });
    pintar();

    expect(screen.getByText('Cargando…')).toBeInTheDocument();
  });

  it('avisa cuando la cuenta fue desactivada', () => {
    montarAuth({ cuentaDesactivada: true });
    pintar();

    expect(
      screen.getByText('Tu cuenta fue desactivada. Si crees que es un error, escríbenos por WhatsApp.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe('CuentaPage: acceso', () => {
  it('pide correo y contraseña válidos para entrar', async () => {
    const usuario = userEvent.setup();
    const auth = montarAuth();
    pintar();

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();

    await usuario.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();

    await usuario.type(campoClave(), 'secreta1');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();

    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(auth.entrar).toHaveBeenCalledWith('ana@correo.com', 'secreta1');
  });

  it('exige al menos 6 caracteres al registrarse', async () => {
    const usuario = userEvent.setup();
    montarAuth();
    pintar();

    await usuario.click(screen.getByRole('button', { name: '¿No tienes cuenta? Crear cuenta' }));
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await usuario.type(campoClave(), '123');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();

    await usuario.clear(campoClave());
    await usuario.type(campoClave(), 'secreta1');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('traduce el error de Firebase al español', async () => {
    const usuario = userEvent.setup();
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => {});
    const auth = montarAuth();
    auth.entrar.mockRejectedValue({ code: 'auth/wrong-password' });
    pintar();

    await usuario.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await usuario.type(campoClave(), 'malas123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    silencio.mockRestore();
  });

  it('restablece la contraseña sin necesitar la clave', async () => {
    const usuario = userEvent.setup();
    const auth = montarAuth();
    pintar();

    await usuario.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(screen.getByRole('heading', { name: 'Recuperar contraseña' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Contraseña/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeDisabled();

    await usuario.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await usuario.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(auth.restablecerClave).toHaveBeenCalledWith('ana@correo.com');
    expect(
      await screen.findByText(
        'Si el correo existe, te enviamos un enlace para crear una contraseña nueva.',
      ),
    ).toBeInTheDocument();
    // Vuelve al modo de entrada.
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});

describe('CuentaPage: con sesión', () => {
  const perfil: Perfil = {
    nombre: 'Ana Pérez',
    telefono: '3206979160',
    ciudad: 'Bogotá',
    direccion: 'Calle 1 #2-3',
  };

  function pintarConSesion(perfilInicial: Perfil | null = perfil) {
    montarAuth({ usuario: { uid: 'uid-1', email: 'ana@correo.com' } as User });
    montarPerfil(perfilInicial);
    return pintar();
  }

  it('muestra el correo, los datos de envío y sus pedidos', () => {
    pintarConSesion();

    expect(screen.getByText('ana@correo.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Datos de envío' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mis pedidos' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana Pérez');
    expect(vi.mocked(suscribirsePedidosCliente)).toHaveBeenCalledWith(
      'uid-1',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('relena el formulario con el perfil guardado', () => {
    pintarConSesion();

    expect(screen.getByLabelText('Teléfono / WhatsApp')).toHaveValue('3206979160');
    expect(screen.getByLabelText('Ciudad')).toHaveValue('Bogotá');
    expect(screen.getByLabelText('Dirección')).toHaveValue('Calle 1 #2-3');
  });

  it('guarda los datos recortados y sin espacios de más', async () => {
    const usuario = userEvent.setup();
    pintarConSesion();

    const nombre = screen.getByLabelText('Nombre completo');
    await usuario.clear(nombre);
    await usuario.type(nombre, '  Ana Pérez  ');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Tus datos quedaron guardados.')).toBeInTheDocument();
    expect(guardarMock).toHaveBeenCalledWith({
      nombre: 'Ana Pérez',
      telefono: '3206979160',
      ciudad: 'Bogotá',
      direccion: 'Calle 1 #2-3',
    });
  });

  it('sin teléfono no deja guardar', () => {
    pintarConSesion({ ...perfil, telefono: '' });

    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  it('muestra el aviso cuando aún no hay pedidos', () => {
    pintarConSesion();

    const panel = screen.getByRole('heading', { name: 'Mis pedidos' }).closest('section');
    expect(within(panel as HTMLElement).getByText(/Aún no tienes pedidos/)).toBeInTheDocument();
  });

  it('lista los pedidos del cliente con su estado', () => {
    vi.mocked(suscribirsePedidosCliente).mockImplementation((_uid, callback) => {
      callback([
        {
          id: 'p1',
          numero: 'P-20260101-AAAA',
          estado: 'enviado',
          total: 136000,
          creado_en: { toDate: () => new Date('2026-01-01') },
          cliente: {
            nombre: 'Ana',
            telefono: '3206979160',
            email: 'ana@correo.com',
            ciudad: 'Bogotá',
            direccion: 'Calle 1',
          },
          items: [
            { libro_id: 'lib-001', titulo: 'Viviendo Su Voluntad', precio: 68000, cantidad: 2 },
          ],
        },
      ]);
      return () => {};
    });
    pintarConSesion();

    expect(screen.getByText('P-20260101-AAAA')).toBeInTheDocument();
    expect(screen.getByText('Enviado')).toBeInTheDocument();
    expect(screen.getByText('2 × Viviendo Su Voluntad')).toBeInTheDocument();
    expect(screen.queryByText(/Aún no tienes pedidos/)).not.toBeInTheDocument();
  });

  it('cierra la sesión', async () => {
    const usuario = userEvent.setup();
    const auth = montarAuth({ usuario: { uid: 'uid-1', email: 'ana@correo.com' } as User });
    pintar();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(auth.salir).toHaveBeenCalledTimes(1);
  });
});
