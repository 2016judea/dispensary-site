export type Lineage = 'indica' | 'sativa' | 'hybrid';
export type Format = 'flower' | 'minibuds' | 'preroll' | 'bigdog' | 'vape' | 'edible' | 'beverage' | 'tincture';
export type Strength = 'gentle' | 'standard' | 'strong';
export type FeelingId = 'sleep' | 'calm' | 'focus' | 'social' | 'relief' | 'creative';

export interface Terpenes {
  myrcene: number; caryophyllene: number; pinene: number; linalool: number;
  limonene: number; terpinolene: number; humulene: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  strain: string;
  strainSlug: string;
  brand: string;
  lineage: Lineage;
  format: Format;
  formatLabel: string;
  size: string;
  onset: string;
  duration: string;
  thcPct: number | null;
  cbdPct: number | null;
  /** true when this THC figure was read off the retailer's live published menu */
  thcObserved: boolean;
  thcMgPerServing: number | null;
  servings: number | null;
  totalThcMg: number;
  strength: Strength;
  terpenes: Terpenes;
  priceCents: number;
  stock: Record<string, number>;
}

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  feeling: FeelingId;
  /** did it do the thing you wanted: 2 = yes, 1 = somewhat, 0 = no */
  outcome: 0 | 1 | 2;
  note?: string;
  createdAt: string;
}

export interface OrderLine { productId: string; qty: number; priceCents: number }

export interface Order {
  id: string;
  shortCode: string;
  customerId: string;
  storeId: string;
  lines: OrderLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  feeling: FeelingId | null;
  pickupAt: string;
  status: 'placed' | 'paid' | 'ready' | 'picked_up' | 'cancelled';
  paymentRef: string | null;
  paymentProvider: 'aeropay' | 'aeropay-sim';
  createdAt: string;
  /** undo window closes at this instant */
  undoUntil: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  ageAffirmed: boolean;
  aeropayUserId: string | null;
  bankAccountId: string | null;
  bankLabel: string | null;
  defaultStoreId: string | null;
}
