import { describe, expect, it } from 'vitest';
import { CONTACTO, urlWhatsApp, urlWhatsAppCliente } from './config';

describe('urlWhatsApp', () => {
  it('apunta al número de la librería con el mensaje codificado', () => {
    expect(urlWhatsApp('Hola Prólogos')).toBe(
      `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent('Hola Prólogos')}`,
    );
  });

  it('codifica saltos de línea, acentos y emojis (wa.me no acepta texto crudo)', () => {
    const url = urlWhatsApp('Hola Prólogos 👋\nTotal: $ 68.000');
    expect(url).not.toContain(' ');
    expect(url).not.toContain('\n');
    expect(url).toContain('%0A');
    expect(url).toContain(encodeURIComponent('👋'));
  });
});

describe('urlWhatsAppCliente', () => {
  it('agrega el indicativo 57 a celulares colombianos de 10 dígitos', () => {
    expect(urlWhatsAppCliente('3206979160')).toBe('https://wa.me/573206979160');
    expect(urlWhatsAppCliente('320 697 9160')).toBe('https://wa.me/573206979160');
    expect(urlWhatsAppCliente('320-697-9160')).toBe('https://wa.me/573206979160');
  });

  it('no duplica el indicativo si ya viene marcado', () => {
    expect(urlWhatsAppCliente('+57 320 697 9160')).toBe('https://wa.me/573206979160');
    expect(urlWhatsAppCliente('573206979160')).toBe('https://wa.me/573206979160');
  });

  it('no toca números que no son celular colombiano', () => {
    expect(urlWhatsAppCliente('6012345678')).toBe('https://wa.me/6012345678');
    expect(urlWhatsAppCliente('1 555 123 4567')).toBe('https://wa.me/15551234567');
    expect(urlWhatsAppCliente('32069791600')).toBe('https://wa.me/32069791600');
  });

  it('tolera campos vacíos o sin dígitos', () => {
    expect(urlWhatsAppCliente('')).toBe('https://wa.me/');
    expect(urlWhatsAppCliente('sin numero')).toBe('https://wa.me/');
  });
});
