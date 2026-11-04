// Password con scrypt, accessi con token casuale in un cookie httpOnly.
// Nel database finisce solo l'hash del token: una copia del database non
// basta per entrare negli account.
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const DURATA_GIORNI = 30;
export const COOKIE = 'gc_accesso';

export function hashPassword(password) {
  const sale = randomBytes(16);
  const hash = scryptSync(password, sale, 64);
  return `scrypt$${sale.toString('base64')}$${hash.toString('base64')}`;
}

export function verificaPassword(password, salvato) {
  const [schema, saleB64, hashB64] = String(salvato).split('$');
  if (schema !== 'scrypt' || !saleB64 || !hashB64) return false;
  const atteso = Buffer.from(hashB64, 'base64');
  const calcolato = scryptSync(password, Buffer.from(saleB64, 'base64'), atteso.length);
  return timingSafeEqual(atteso, calcolato);
}

export const hashToken = token => createHash('sha256').update(token).digest('hex');

export function nuovoAccesso(db, trainerId) {
  const token = randomBytes(32).toString('base64url');
  const scade = new Date(Date.now() + DURATA_GIORNI * 86400000);
  db.creaAccesso(hashToken(token), trainerId, scade.toISOString());
  return { token, scade };
}

export function leggiCookie(req, nome) {
  const header = req.headers.cookie || '';
  for (const parte of header.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieAccesso(token, scade, sicuro) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${scade.toUTCString()}${sicuro ? '; Secure' : ''}`;
}

export function cookieUscita(sicuro) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${sicuro ? '; Secure' : ''}`;
}

/** Limite di tentativi per chiave (es. IP). In memoria: basta per un solo processo. */
export function limitatore({ max = 10, finestraMs = 15 * 60000 } = {}) {
  const tentativi = new Map();
  return {
    consenti(chiave) {
      const ora = Date.now();
      const lista = (tentativi.get(chiave) || []).filter(t => ora - t < finestraMs);
      lista.push(ora);
      tentativi.set(chiave, lista);
      return lista.length <= max;
    }
  };
}
