/**
 * Aeropay — pay by bank (ACH). The cannabis standard because card networks
 * decline the MCC.
 *
 * Request shapes below follow Aeropay's own v2 docs (dev.aero.inc), read
 * 2026-09-14: POST /v2/token, POST /v2/user, GET /v2/aggregatorCredentials,
 * POST /v2/linkAccountFromAggregator, POST /v2/transaction.
 *
 * Sandbox credentials are NOT self-serve — Aeropay issues them after a demo
 * request, and production after they review the integration. With no keys set we
 * run SimulatedAeropay, which returns the same object shapes so the checkout
 * screen is exercised end to end. Set AEROPAY_API_KEY / AEROPAY_API_SECRET /
 * AEROPAY_MERCHANT_ID and the live client takes over with no UI change.
 */

const SANDBOX = 'https://api.sandbox-pay.aero.inc/v2';
const PRODUCTION = 'https://api.aeropay.com/v2';

export interface AeropayUser { id: string; }
export interface AeropayBank { id: string; label: string; last4: string; }
export interface AeropayTransaction { id: string; status: string; amountCents: number; }
export interface AerosyncCreds { widgetUrl: string; token: string; }

export interface AeropayClient {
  readonly mode: 'live' | 'simulated';
  createUser(u: { firstName: string; lastName: string; email: string; phone: string }): Promise<AeropayUser>;
  aerosyncCredentials(userId: string): Promise<AerosyncCreds>;
  linkAccount(userId: string, connectionId: string): Promise<AeropayBank>;
  charge(a: { userId: string; bankAccountId: string; amountCents: number; referenceId: string; idempotencyKey: string }): Promise<AeropayTransaction>;
}

class LiveAeropay implements AeropayClient {
  readonly mode = 'live' as const;
  private base: string;
  constructor(private apiKey: string, private apiSecret: string, private merchantId: string, env: string) {
    this.base = env === 'production' ? PRODUCTION : SANDBOX;
  }

  private async token(scope: 'merchant' | 'userForMerchant', userId?: string): Promise<string> {
    const res = await fetch(`${this.base}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey, apiSecret: this.apiSecret, scope, id: Number(this.merchantId), ...(userId ? { userId } : {}) }),
    });
    if (!res.ok) throw new Error(`aeropay token ${res.status}: ${await res.text()}`);
    return (await res.json()).token as string;
  }

  private async call(pathname: string, init: RequestInit, tok: string) {
    const res = await fetch(`${this.base}${pathname}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', authorization: `Bearer ${tok}`, ...(init.headers || {}) },
    });
    if (!res.ok) throw new Error(`aeropay ${pathname} ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async createUser(u: { firstName: string; lastName: string; email: string; phone: string }) {
    const tok = await this.token('merchant');
    const j = await this.call('/user', { method: 'POST', body: JSON.stringify({ ...u, merchantId: Number(this.merchantId) }) }, tok);
    return { id: j.user?.id ?? j.id };
  }

  async aerosyncCredentials(userId: string) {
    const tok = await this.token('userForMerchant', userId);
    const j = await this.call('/aggregatorCredentials?aggregator=aerosync', { method: 'GET' }, tok);
    return { widgetUrl: j.widgetUrl ?? j.url, token: j.token };
  }

  async linkAccount(userId: string, connectionId: string) {
    const tok = await this.token('userForMerchant', userId);
    const j = await this.call('/linkAccountFromAggregator', { method: 'POST', body: JSON.stringify({ connectionId, aggregator: 'aerosync' }) }, tok);
    const a = j.bankAccount ?? j;
    return { id: String(a.id), label: a.name ?? a.institutionName ?? 'Bank', last4: a.last4 ?? '••••' };
  }

  async charge(a: { userId: string; bankAccountId: string; amountCents: number; referenceId: string; idempotencyKey: string }) {
    const tok = await this.token('userForMerchant', a.userId);
    const j = await this.call('/transaction', {
      method: 'POST',
      headers: { 'Idempotency-Key': a.idempotencyKey },
      body: JSON.stringify({
        bankAccountId: Number(a.bankAccountId),
        merchantId: Number(this.merchantId),
        amount: { amount: a.amountCents, currency: 'USD' },
        referenceId: a.referenceId,
      }),
    }, tok);
    return { id: j.transaction.id, status: j.transaction.status, amountCents: j.transaction.amount.amount };
  }
}

class SimulatedAeropay implements AeropayClient {
  readonly mode = 'simulated' as const;
  async createUser() { return { id: `sim_user_${Math.random().toString(36).slice(2, 10)}` }; }
  async aerosyncCredentials() { return { widgetUrl: '/aerosync-demo', token: 'sim-token' }; }
  async linkAccount() {
    const banks = [['Wells Fargo', '4417'], ['U.S. Bank', '9032'], ['Bremer Bank', '2218']];
    const [label, last4] = banks[Math.floor(Math.random() * banks.length)];
    return { id: `sim_bank_${Math.random().toString(36).slice(2, 8)}`, label, last4 };
  }
  async charge(a: { amountCents: number }) {
    return { id: `sim_tx_${Math.random().toString(36).slice(2, 10)}`, status: 'pending', amountCents: a.amountCents };
  }
}

let client: AeropayClient | null = null;
export function getAeropay(): AeropayClient {
  if (client) return client;
  const { AEROPAY_API_KEY, AEROPAY_API_SECRET, AEROPAY_MERCHANT_ID, AEROPAY_ENV } = process.env;
  client = AEROPAY_API_KEY && AEROPAY_API_SECRET && AEROPAY_MERCHANT_ID
    ? new LiveAeropay(AEROPAY_API_KEY, AEROPAY_API_SECRET, AEROPAY_MERCHANT_ID, AEROPAY_ENV || 'sandbox')
    : new SimulatedAeropay();
  return client;
}
