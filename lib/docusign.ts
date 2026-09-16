/**
 * DocuSign embedded signing, focused view.
 *
 * The owner signs the engagement on this page. No email round trip, no DocuSign
 * tab. The sequence, per DocuSign's eSignature REST API:
 *   1. JWT grant  POST /oauth/token            -> access token
 *   2. GET /oauth/userinfo                     -> account id + base URI
 *   3. POST /restapi/v2.1/accounts/{a}/envelopes
 *        recipient carries clientUserId, which is what makes it EMBEDDED
 *   4. POST .../envelopes/{e}/views/recipient
 *        with frameAncestors + messageOrigins -> the focused-view URL
 * The browser then hands that URL to DocuSign's focused-view bundle, which
 * renders the signing ceremony inside our own page.
 *
 * NOT VERIFIED AGAINST A LIVE ACCOUNT. DocuSign JWT needs an integration key,
 * an RSA private key and a one-time admin consent grant, all of which belong to
 * the account owner. Until DOCUSIGN_* is set we run the simulated signer, which
 * renders the same agreement and records the same acceptance locally, so the
 * flow is demonstrable end to end and clearly labelled as a simulation.
 */
export interface SigningSession {
  mode: 'live' | 'simulated';
  url: string | null;
  envelopeId: string | null;
  integrationKey?: string;
}

export interface DocuSignConfig {
  integrationKey: string; userId: string; accountId: string;
  privateKey: string; authBase: string; returnUrl: string; frameAncestor: string;
}

export function docusignConfig(): DocuSignConfig | null {
  const {
    DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID,
    DOCUSIGN_PRIVATE_KEY, DOCUSIGN_AUTH_BASE, NEXT_PUBLIC_SITE_URL,
  } = process.env;
  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_USER_ID || !DOCUSIGN_ACCOUNT_ID || !DOCUSIGN_PRIVATE_KEY) return null;
  const site = NEXT_PUBLIC_SITE_URL || 'https://dispensary-site.vercel.app';
  return {
    integrationKey: DOCUSIGN_INTEGRATION_KEY,
    userId: DOCUSIGN_USER_ID,
    accountId: DOCUSIGN_ACCOUNT_ID,
    privateKey: DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    authBase: DOCUSIGN_AUTH_BASE || 'https://account-d.docusign.com',
    returnUrl: `${site}/agreement?signed=1`,
    frameAncestor: site,
  };
}

async function jwtAssertion(cfg: DocuSignConfig): Promise<string> {
  const { createSign } = await import('node:crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: cfg.integrationKey, sub: cfg.userId,
    aud: cfg.authBase.replace(/^https?:\/\//, ''),
    iat: now, exp: now + 3600, scope: 'signature impersonation',
  };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64(header)}.${b64(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  return `${unsigned}.${signer.sign(cfg.privateKey).toString('base64url')}`;
}

async function accessToken(cfg: DocuSignConfig): Promise<string> {
  const res = await fetch(`${cfg.authBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await jwtAssertion(cfg),
    }),
  });
  if (!res.ok) throw new Error(`docusign token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

export async function createSigningSession(
  cfg: DocuSignConfig,
  signer: { name: string; email: string },
  documentHtml: string,
): Promise<SigningSession> {
  const token = await accessToken(cfg);
  const base = process.env.DOCUSIGN_BASE_URI || 'https://demo.docusign.net';
  const clientUserId = 'owner-1';
  const envRes = await fetch(`${base}/restapi/v2.1/accounts/${cfg.accountId}/envelopes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailSubject: 'Brick & Mortar — storefront engagement',
      status: 'sent',
      documents: [{
        documentBase64: Buffer.from(documentHtml).toString('base64'),
        name: 'Engagement', fileExtension: 'html', documentId: '1',
      }],
      recipients: {
        signers: [{
          email: signer.email, name: signer.name, recipientId: '1', clientUserId,
          tabs: { signHereTabs: [{ anchorString: '/sig1/', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' }] },
        }],
      },
    }),
  });
  if (!envRes.ok) throw new Error(`docusign envelope ${envRes.status}: ${await envRes.text()}`);
  const { envelopeId } = await envRes.json();

  const viewRes = await fetch(`${base}/restapi/v2.1/accounts/${cfg.accountId}/envelopes/${envelopeId}/views/recipient`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      returnUrl: cfg.returnUrl, authenticationMethod: 'none',
      email: signer.email, userName: signer.name, clientUserId,
      frameAncestors: [cfg.frameAncestor, 'https://apps-d.docusign.com'],
      messageOrigins: ['https://apps-d.docusign.com'],
    }),
  });
  if (!viewRes.ok) throw new Error(`docusign view ${viewRes.status}: ${await viewRes.text()}`);
  const { url } = await viewRes.json();
  return { mode: 'live', url, envelopeId, integrationKey: cfg.integrationKey };
}
