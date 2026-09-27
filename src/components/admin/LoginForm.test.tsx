import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from './LoginForm';

vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }));

function conEntrar(entrar: Mock) {
  vi.mocked(useAuth).mockReturnValue({
    usuario: null,
    cargando: false,
    cuentaDesactivada: false,
    entrar,
    registrarse: vi.fn(),
    restablecerClave: vi.fn(),
    salir: vi.fn(),
  });
}

describe('LoginForm', () => {
  it('envía correo y contraseña', async () => {
    const usuario = userEvent.setup();
    const entrar = vi.fn().mockResolvedValue(undefined);
    conEntrar(entrar);
    render(<LoginForm />);

    await usuario.type(screen.getByLabelText('Correo'), 'admin@correo.com');
    await usuario.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(entrar).toHaveBeenCalledWith('admin@correo.com', 'secreta123');
    expect(screen.queryByText('Correo o contraseña incorrectos.')).not.toBeInTheDocument();
  });

  it('muestra el error si Firebase rechaza las credenciales', async () => {
    const usuario = userEvent.setup();
    const entrar = vi.fn().mockRejectedValue({ code: 'auth/invalid-credential' });
    conEntrar(entrar);
    render(<LoginForm />);

    await usuario.type(screen.getByLabelText('Correo'), 'admin@correo.com');
    await usuario.type(screen.getByLabelText('Contraseña'), 'malas');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    // Se puede reintentar de inmediato.
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('indica que está entrando mientras la promesa está pendiente', async () => {
    const usuario = userEvent.setup();
    let confirmar: (() => void) | undefined;
    const entrar = vi.fn().mockImplementation(
      () => new Promise<void>((resolver) => {
        confirmar = resolver;
      }),
    );
    conEntrar(entrar);
    render(<LoginForm />);

    await usuario.type(screen.getByLabelText('Correo'), 'admin@correo.com');
    await usuario.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();

    await act(async () => {
      confirmar?.();
    });
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});
