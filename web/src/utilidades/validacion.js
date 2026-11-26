// Mensajes de validación en español.
// El navegador muestra sus avisos en el idioma del sistema ("Please fill out this field"),
// así que aquí se reemplazan por textos propios para todos los formularios de la app.

function decimalesPermitidos(paso) {
  const partes = String(paso).split('.');
  return partes[1] ? partes[1].length : 0;
}

function mensajePara(control) {
  const estado = control.validity;

  if (estado.valueMissing) {
    if (control.tagName === 'SELECT') return 'Elige una opción de la lista.';
    if (control.type === 'checkbox') return 'Marca esta casilla para continuar.';
    return 'Completa este campo.';
  }
  if (estado.badInput) return 'Escribe un número válido.';
  if (estado.typeMismatch) {
    if (control.type === 'email')
      return 'Escribe un correo válido, por ejemplo nombre@origenes.sv.';
    return 'El formato del dato no es válido.';
  }
  if (estado.patternMismatch) return control.title || 'El dato no tiene el formato esperado.';
  if (estado.tooShort) return `Escribe al menos ${control.minLength} caracteres.`;
  if (estado.tooLong) return `Escribe como máximo ${control.maxLength} caracteres.`;
  if (estado.rangeUnderflow) {
    return Number(control.min) === 0
      ? 'El valor no puede ser negativo.'
      : `El valor debe ser ${control.min} o más.`;
  }
  if (estado.rangeOverflow) return `El valor debe ser ${control.max} o menos.`;
  if (estado.stepMismatch) {
    const decimales = decimalesPermitidos(control.step);
    if (decimales === 0) return 'Escribe un número entero.';
    return `Usa como máximo ${decimales} ${decimales === 1 ? 'decimal' : 'decimales'}.`;
  }
  return '';
}

function esControl(elemento) {
  return elemento && typeof elemento.setCustomValidity === 'function';
}

export function activarValidacionEnEspanol() {
  // cuando un campo no pasa la validación, se le pone el mensaje en español
  document.addEventListener(
    'invalid',
    (evento) => {
      const control = evento.target;
      if (!esControl(control)) return;
      control.setCustomValidity('');
      control.setCustomValidity(mensajePara(control));
    },
    true
  );

  // al escribir o cambiar el valor se borra el mensaje para que se vuelva a revisar
  const limpiar = (evento) => {
    if (esControl(evento.target)) evento.target.setCustomValidity('');
  };
  document.addEventListener('input', limpiar, true);
  document.addEventListener('change', limpiar, true);

  // antes de enviar un formulario se limpian todos sus campos,
  // por si algún valor se cambió desde el código y no por el teclado
  document.addEventListener(
    'click',
    (evento) => {
      const boton = evento.target.closest?.('button[type="submit"], input[type="submit"]');
      const formulario = boton?.form;
      if (!formulario) return;
      Array.from(formulario.elements).forEach((control) => {
        if (esControl(control)) control.setCustomValidity('');
      });
    },
    true
  );
}
