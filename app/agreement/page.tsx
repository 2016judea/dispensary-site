import { currentBrand } from '@/lib/session';
import { agreementHtml } from '@/lib/agreement';
import { docusignConfig } from '@/lib/docusign';
import Signing from '@/components/Signing';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign the engagement', robots: { index: false, follow: false } };

export default async function Agreement() {
  const b = await currentBrand();
  const fee = process.env.AGREEMENT_FEE || 'To be set before this is sent to anyone.';
  const live = !!docusignConfig();
  return (
    <main className="wrap">
      <h1 className="ask">Sign it here.</h1>
      <p className="sub">
        DocuSign, in this page. You do not leave, and nothing lands in your inbox first.
      </p>
      <div className="pick" style={{ fontSize: 15.5, lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: agreementHtml(b, fee) }} />
      <Signing live={live} />
    </main>
  );
}
