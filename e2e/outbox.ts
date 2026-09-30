import { readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Carpeta donde el backend de los e2e deja los emails (MAIL_OUTBOX_DIR, sin SMTP). */
export const OUTBOX_DIR = join(tmpdir(), 'goal-planner-e2e-outbox');

interface SavedMail {
  to: string;
  subject: string;
  text: string;
}

/** Último email enviado a `to`; espera hasta `timeoutMs` a que llegue (se envía en segundo plano). */
export async function lastMailTo(to: string, timeoutMs = 10_000): Promise<SavedMail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const files = (await readdir(OUTBOX_DIR).catch(() => [] as string[])).sort().reverse();
    for (const file of files) {
      const mail = JSON.parse(await readFile(join(OUTBOX_DIR, file), 'utf8')) as SavedMail;
      if (mail.to === to) return mail;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`No email to ${to} in ${OUTBOX_DIR}`);
}
