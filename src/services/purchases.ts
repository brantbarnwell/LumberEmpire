// Real-money purchases through Apple, using RevenueCat (StoreKit 2 on iOS).
// No fake purchases: Gold is only given after Apple confirms the payment.
//
// Purchases only work in a real build (EAS development build, TestFlight or the App Store).
// Expo Go cannot talk to the App Store, so the Shop says so instead of pretending.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import type { CustomerInfo, PurchasesStoreProduct } from 'react-native-purchases';
import { PRODUCTS, VIP_ENTITLEMENT, VIP_PRODUCT_IDS, productById } from '../game/data';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export type StoreStatus = 'loading' | 'ready' | 'expo-go' | 'not-ios' | 'no-key' | 'error';

interface StoreState {
  status: StoreStatus;
  message: string | null; // why the store is not ready
  prices: Record<string, string>; // Apple's local price strings, e.g. "$4.99"
  vipActive: boolean;
}

let st: StoreState = { status: 'loading', message: null, prices: {}, vipActive: false };
const ls = new Set<() => void>();
function set(p: Partial<StoreState>) {
  st = { ...st, ...p };
  ls.forEach((l) => l());
}
export function useStore() {
  return useSyncExternalStore((l) => (ls.add(l), () => ls.delete(l)), () => st, () => st);
}
export function getStore() {
  return st;
}

const products = new Map<string, PurchasesStoreProduct>();
let vipListener: ((active: boolean) => void) | null = null;

function rc() {
  // Loaded lazily so the web preview never touches the native module.
  return require('react-native-purchases').default as typeof import('react-native-purchases').default;
}

export function hasVip(info: CustomerInfo) {
  return (
    info.entitlements.active[VIP_ENTITLEMENT] !== undefined ||
    info.activeSubscriptions.some((id) => VIP_PRODUCT_IDS.includes(id))
  );
}

/** Why purchases can't run here, or null if they can. */
function blocker(): { status: StoreStatus; message: string } | null {
  if (Platform.OS !== 'ios') {
    return { status: 'not-ios', message: 'Purchases work in the iPhone app. This preview can only show the Shop.' };
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return {
      status: 'expo-go',
      message: 'You are in Expo Go, which cannot make App Store purchases. Buying works in the TestFlight / development build.',
    };
  }
  if (!IOS_KEY) {
    return {
      status: 'no-key',
      message: 'The store is not connected yet. Add the RevenueCat iOS key (EXPO_PUBLIC_REVENUECAT_IOS_KEY) and rebuild.',
    };
  }
  return null;
}

export async function initStore(onVipChange: (active: boolean) => void) {
  vipListener = onVipChange;
  const b = blocker();
  if (b) return set({ status: b.status, message: b.message });
  try {
    const Purchases = rc();
    Purchases.configure({ apiKey: IOS_KEY });
    const { PRODUCT_CATEGORY } = require('react-native-purchases');
    const oneTime = PRODUCTS.filter((p) => p.kind !== 'vip').map((p) => p.id);
    const [a, s] = await Promise.all([
      Purchases.getProducts(oneTime, PRODUCT_CATEGORY.NON_SUBSCRIPTION),
      Purchases.getProducts(VIP_PRODUCT_IDS, PRODUCT_CATEGORY.SUBSCRIPTION),
    ]);
    const prices: Record<string, string> = {};
    for (const p of [...a, ...s]) {
      products.set(p.identifier, p);
      prices[p.identifier] = p.priceString;
    }
    Purchases.addCustomerInfoUpdateListener((info) => {
      const v = hasVip(info);
      set({ vipActive: v });
      vipListener?.(v);
    });
    const info = await Purchases.getCustomerInfo();
    const v = hasVip(info);
    set({ status: 'ready', message: products.size === 0 ? 'No products found. Check the product IDs in App Store Connect.' : null, prices, vipActive: v });
    onVipChange(v);
  } catch (e: any) {
    set({ status: 'error', message: 'Could not reach the App Store: ' + (e?.message ?? 'unknown error') });
  }
}

export type BuyOutcome =
  | { ok: true; productId: string; transactionId: string; vip: boolean }
  | { ok: false; cancelled: boolean; message: string };

export async function buy(productId: string): Promise<BuyOutcome> {
  const b = blocker();
  if (b) return { ok: false, cancelled: false, message: b.message };
  if (st.status !== 'ready') return { ok: false, cancelled: false, message: st.message ?? 'The store is still loading. Try again in a moment.' };
  const product = products.get(productId);
  if (!product) {
    return { ok: false, cancelled: false, message: `"${productById(productId)?.title}" is not set up in App Store Connect yet.` };
  }
  try {
    const res = await rc().purchaseStoreProduct(product);
    const vip = hasVip(res.customerInfo);
    set({ vipActive: vip });
    vipListener?.(vip);
    return { ok: true, productId, transactionId: res.transaction.transactionIdentifier, vip };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true, message: 'Purchase cancelled.' };
    return { ok: false, cancelled: false, message: e?.message ?? 'The purchase did not go through.' };
  }
}

export type RestoreOutcome =
  | { ok: true; oneTime: { productId: string; transactionId: string }[]; vip: boolean }
  | { ok: false; message: string };

/** Restores one-time packs and VIP. Gold packs are used up when bought, so Apple does not restore them. */
export async function restore(): Promise<RestoreOutcome> {
  const b = blocker();
  if (b) return { ok: false, message: b.message };
  try {
    const info = await rc().restorePurchases();
    const packIds = PRODUCTS.filter((p) => p.kind === 'pack').map((p) => p.id);
    const oneTime = info.nonSubscriptionTransactions
      .filter((t) => packIds.includes(t.productIdentifier))
      .map((t) => ({ productId: t.productIdentifier, transactionId: t.transactionIdentifier }));
    const vip = hasVip(info);
    set({ vipActive: vip });
    vipListener?.(vip);
    return { ok: true, oneTime, vip };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? 'Could not restore purchases.' };
  }
}
