'use client';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { DocuSign?: { loadDocuSign: (k: string) => Promise<any> } }
}

/**
 * The signing ceremony, rendered inside our own page.
 *
 * Live, this is DocuSign's focused view: we ask the server for a recipient-view
 * URL and hand it to DocuSign's own bundle, which mounts the signature panel in
 * the div below. No redirect, no email.
 *
 * With no DocuSign credentials on the deployment the server says so, and we fall
 * back to a plainly-labelled local acceptance so the flow can still be walked.
 * It is not a signature and it does not pretend to be one.
 */
export default function Signing({ live }: { live: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'mounted' | 'accepted' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!live) return;
    const s = document.createElement('script');
    s.src = 'https://js.docusign.com/bundle.js';
    s.async = true;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [live]);

  async function start() {
    setState('loading'); setMsg(null);
    try {
      const res = await fetch('/api/docusign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'could not open the envelope');
      if (j.mode === 'simulated' || !j.url) {
        setMsg(j.reason ?? 'DocuSign is not connected on this deployment.');
        setState('accepted');
        return;
      }
      const ds = await window.DocuSign!.loadDocuSign(j.integrationKey);
      const signing = ds.signing({
        url: j.url, displayFormat: 'focused',
        style: { branding: { primaryButton: { backgroundColor: getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#00461E', color: '#fff' } } },
      });
      signing.on('sessionEnd', () => setState('accepted'));
      signing.mount(host.current!);
      setState('mounted');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'signing failed'); setState('error');
    }
  }

  if (state === 'accepted') {
    return (
      <div className="pick">
        <h2 style={{ fontSize: 19, marginTop: 0 }}>Done.</h2>
        <p style={{ margin: 0 }}>
          {live ? 'Signed. A copy is in your DocuSign account and on its way to your email.'
                : 'Recorded on this device only — this is a demo acceptance, not a signature.'}
        </p>
        {msg ? <p className="meta" style={{ marginTop: 10 }}>{msg}</p> : null}
      </div>
    );
  }

  return (
    <>
      {state !== 'mounted' ? (
        <>
          <label htmlFor="sn">Your name</label>
          <input id="sn" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <label htmlFor="se">Email for the signed copy</label>
          <input id="se" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <button className="go" onClick={start} disabled={state === 'loading' || !name || !email}>
            {state === 'loading' ? 'Opening…' : live ? 'Sign with DocuSign' : 'Accept (DocuSign not connected)'}
          </button>
          {!live ? (
            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>
              Embedded signing is wired end to end in <code>lib/docusign.ts</code>. It needs an
              integration key, a user id, an account id and an RSA private key from the DocuSign
              account owner, plus a one-time admin consent grant — see docs/DEPLOY.md.
            </p>
          ) : null}
        </>
      ) : null}
      {msg && state === 'error' ? <p style={{ color: '#B3261E', fontSize: 14 }}>{msg}</p> : null}
      <div ref={host} style={{ minHeight: state === 'mounted' ? 620 : 0, marginTop: 14 }} />
    </>
  );
}
