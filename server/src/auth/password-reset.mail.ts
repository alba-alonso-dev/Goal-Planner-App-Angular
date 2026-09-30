import { OutgoingMail } from '../mail/mail.service.js';
import { MailLocale } from './dto/auth.dto.js';

/** Email con el enlace para restablecer la contraseña, en el idioma de quien lo pide. */
export function passwordResetMail(to: string, link: string, locale: MailLocale): OutgoingMail {
  if (locale === 'es') {
    return {
      to,
      subject: 'Restablece tu contraseña de Goal Planner',
      text: [
        'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
        '',
        `Abre este enlace para elegir una nueva (caduca en 1 hora y solo sirve una vez):`,
        link,
        '',
        'Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.'
      ].join('\n')
    };
  }
  return {
    to,
    subject: 'Reset your Goal Planner password',
    text: [
      'We received a request to reset the password of your account.',
      '',
      'Open this link to choose a new one (it expires in 1 hour and works only once):',
      link,
      '',
      "If you didn't ask for this, ignore this email: your password won't change."
    ].join('\n')
  };
}
