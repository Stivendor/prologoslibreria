import { describe, expect, it } from 'vitest';
import { mensajeAuthError } from './erroresAuth';

// La UI jamás debe mostrar códigos crudos como "auth/invalid-credential".
describe('mensajeAuthError', () => {
  const casos: [string, string][] = [
    ['auth/email-already-in-use', 'Ese correo ya está registrado.'],
    ['auth/invalid-email', 'Ingresa un correo válido.'],
    ['auth/weak-password', 'La contraseña debe tener al menos 6 caracteres.'],
    ['auth/invalid-credential', 'Correo o contraseña incorrectos.'],
    ['auth/wrong-password', 'Correo o contraseña incorrectos.'],
    ['auth/user-not-found', 'Correo o contraseña incorrectos.'],
    ['auth/too-many-requests', 'Demasiados intentos. Espera un momento y vuelve a intentarlo.'],
    ['auth/network-request-failed', 'No hay conexión con el servidor. Revisa tu internet.'],
    ['auth/user-disabled', 'Tu cuenta está desactivada.'],
    [
      'auth/admin-restricted-operation',
      'El registro de cuentas está deshabilitado por el momento. Escríbenos por WhatsApp para ayudarte.',
    ],
    [
      'auth/operation-not-allowed',
      'El registro de cuentas está deshabilitado por el momento. Escríbenos por WhatsApp para ayudarte.',
    ],
  ];

  it.each(casos)('traduce %s', (codigo, esperado) => {
    expect(mensajeAuthError({ code: codigo })).toBe(esperado);
  });

  it('usa un mensaje genérico para códigos desconocidos', () => {
    expect(mensajeAuthError({ code: 'auth/algo-raro' })).toBe(
      'No se pudo completar la operación. Intenta de nuevo.',
    );
  });

  it('usa el mensaje genérico cuando el error no trae código', () => {
    expect(mensajeAuthError(undefined)).toBe(
      'No se pudo completar la operación. Intenta de nuevo.',
    );
    expect(mensajeAuthError(new Error('fallo interno'))).toBe(
      'No se pudo completar la operación. Intenta de nuevo.',
    );
    expect(mensajeAuthError(null)).toBe(
      'No se pudo completar la operación. Intenta de nuevo.',
    );
  });

  it('nunca devuelve el código crudo', () => {
    for (const [codigo] of casos) {
      expect(mensajeAuthError({ code: codigo })).not.toContain('auth/');
    }
    expect(mensajeAuthError({ code: 'auth/desconocido' })).not.toContain('auth/');
  });
});
