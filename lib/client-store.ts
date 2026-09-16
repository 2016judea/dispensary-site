'use client';

/**
 * Everything this phone remembers. One key, so "forget me" is one line.
 *
 * There is no account wall before a purchase. What makes the second order one
 * tap is that the first one left this behind: who you are, which bank you linked
 * through Aeropay, and which store you pick up from. Nothing here is a password
 * and nothing here is sent anywhere except with an order.
 */
export const KEY = 'bm_shopper_v1';

export interface Shopper {
  customerId: string;
  firstName: string; lastName: string; email: string; phone: string;
  dob: string;
  ageAffirmed: boolean;
  aeropayUserId: string | null;
  bankAccountId: string | null;
  bankLabel: string | null;
  bankLast4: string | null;
  defaultStoreId: string | null;
  orders: string[];
}

export function readShopper(): Shopper | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Shopper) : null;
  } catch { return null; }
}

export function writeShopper(s: Shopper) {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function forget() {
  try { window.localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function canOneTap(s: Shopper | null): s is Shopper {
  return !!(s && s.bankAccountId && s.defaultStoreId && s.ageAffirmed && s.firstName);
}

export function newId(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
