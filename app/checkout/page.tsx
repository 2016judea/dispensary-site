import { Suspense } from 'react';
import { currentBrand } from '@/lib/session';
import CheckoutScreen from '@/components/CheckoutScreen';
import { MENU } from '@/lib/rank';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout' };

export default async function Checkout() {
  const b = await currentBrand();
  const store = b.stores[0];
  return (
    <main className="wrap">
      <Suspense fallback={<h1 className="ask">Checkout</h1>}>
        <CheckoutScreen
          store={{
            id: store.id, name: store.name, street: store.street,
            city: store.city, state: store.state, zip: store.zip, hours: store.hours,
          }}
          menu={MENU.map((p) => ({
            id: p.id, strain: p.strain, formatLabel: p.formatLabel, size: p.size,
            brand: p.brand, priceCents: p.priceCents,
          }))}
        />
      </Suspense>
    </main>
  );
}
