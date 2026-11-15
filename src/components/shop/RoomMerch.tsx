'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Check, Package, ShoppingBag, Store } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { ProductCard, PriceTag } from './ProductCard';
import { useCart } from './shopUi';

/** "Merch from this room" on the room page. */
export function RoomMerchStrip({ roomId }: { roomId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const items = useQuery(api.merch.roomMerch, { roomId: roomId as any, userId: (user?.id as any) || undefined });
  if (!items || items.length === 0) return null;
  const companyId = items[0].companyId;
  return (
    <div className="panel p-6 md:p-10 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="flex items-center gap-2 text-xl font-display font-bold text-brand-bone">
          <ShoppingBag className="w-5 h-5 text-brand-red-light" /> {t('shop.room.title')}
        </h3>
        {companyId && (
          <Link href={`/shop/store/${companyId}`} className="text-sm text-brand-red-light hover:underline">
            {t('shop.room.see_all')}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.slice(0, 4).map((p) => (
          <ProductCard key={p._id} p={p} showSeller={false} />
        ))}
      </div>
      {items.some((p) => p.pickup) && <p className="text-xs text-brand-text-muted mt-4">{t('shop.room.pickup_hint')}</p>}
    </div>
  );
}

/** After booking: add merch to collect at the game. */
export function MerchAddOn({ roomId, bookingId }: { roomId: string; bookingId: string | null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { add, lines } = useCart();
  const items = useQuery(api.merch.roomMerch, roomId ? { roomId: roomId as any, userId: (user?.id as any) || undefined } : 'skip');
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const pickupItems = (items ?? []).filter((p) => p.pickup && p.canBuy);
  if (pickupItems.length === 0) return null;
  const companyId = String(pickupItems[0].companyId);
  const inCart = lines.filter((l) => l.sellerKey === companyId).reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="card p-6 mb-8 text-left">
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        <Store className="w-5 h-5 text-brand-red-light" /> {t('shop.addon.title')}
      </h3>
      <p className="text-sm text-brand-text-secondary mb-4">{t('shop.addon.desc')}</p>
      <div className="space-y-3">
        {pickupItems.slice(0, 4).map((p) => {
          const options = p.variants.filter((v) => !v.soldOut);
          const variantId = chosen[p._id] ?? options[0]?.id;
          const variant = p.variants.find((v) => v.id === variantId);
          return (
            <div key={p._id} className="flex items-center gap-3">
              <Link href={`/shop/${p._id}`} className="w-14 h-14 rounded-md overflow-hidden bg-black/40 shrink-0">
                {p.images[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-4" />}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-bone truncate">{p.title}</p>
                <PriceTag p={p} />
              </div>
              {options.length > 1 && (
                <select
                  className="bg-black/40 border border-brand-border rounded-md px-2 py-1.5 text-sm"
                  value={variantId}
                  onChange={(e) => setChosen((c) => ({ ...c, [p._id]: e.target.value }))}
                  aria-label={t('shop.product.choose')}
                >
                  {options.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
              <button
                disabled={!variant}
                onClick={() => {
                  if (!variant) return;
                  add({
                    productId: p._id,
                    variantId: variant.id,
                    quantity: 1,
                    title: p.title,
                    variantLabel: variant.label,
                    image: p.images[0],
                    unitPriceCents: p.yourPriceCents,
                    sellerKey: companyId,
                    sellerName: p.sellerName,
                  });
                  setAdded((a) => ({ ...a, [p._id]: true }));
                }}
                className="btn-outline text-xs py-2! px-3! inline-flex items-center gap-1.5"
              >
                {added[p._id] ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                {added[p._id] ? t('shop.product.added') : t('shop.addon.add')}
              </button>
            </div>
          );
        })}
      </div>
      {inCart > 0 && (
        <Link
          href={`/shop/checkout?seller=${encodeURIComponent(companyId)}${bookingId ? `&booking=${bookingId}` : ''}`}
          className="btn-primary w-full mt-5 inline-flex items-center justify-center gap-2 text-sm"
        >
          {t('shop.addon.checkout', { count: String(inCart) })}
        </Link>
      )}
    </div>
  );
}
