// Mensajes en español para los errores de Firebase Auth. La UI nunca debe
// mostrar códigos como "auth/invalid-credential".

export function mensajeAuthError(error: unknown): string {
  const codigo = (error as { code?: string })?.code ?? '';
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado.';
    case 'auth/invalid-email':
      return 'Ingresa un correo válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
    case 'auth/network-request-failed':
      return 'No hay conexión con el servidor. Revisa tu internet.';
    case 'auth/user-disabled':
      return 'Tu cuenta está desactivada.';
    // El registro está apagado en Authentication → Settings → User actions
    // → "Enable create (sign-up)". Avisamos sin exponer detalles internos.
    case 'auth/admin-restricted-operation':
    case 'auth/operation-not-allowed':
      return 'El registro de cuentas está deshabilitado por el momento. Escríbenos por WhatsApp para ayudarte.';
    default:
      return 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
