'use client';

import Link from 'next/link';
import { ArrowLeft, Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { euro, groupBySeller, useCart } from '@/components/shop/shopUi';

export default function CartPage() {
  const { t } = useTranslation();
  const { lines, setQty } = useCart();
  const groups = groupBySeller(lines);

  return (
    <section className="pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link href="/shop" className="inline-flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-bone mb-6">
          <ArrowLeft className="w-4 h-4" /> {t('shop.back_to_shop')}
        </Link>
        <h1 className="text-4xl font-display font-black text-brand-bone mb-2">{t('shop.cart.title')}</h1>
        {groups.length > 1 && <p className="text-brand-text-secondary mb-8">{t('shop.cart.split_note')}</p>}

        {groups.length === 0 ? (
          <div className="panel p-10 text-center mt-8">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-brand-text-muted" />
            <p className="text-brand-bone font-display text-xl mb-2">{t('shop.cart.empty')}</p>
            <Link href="/shop" className="btn-primary inline-flex mt-4">
              {t('shop.cart.browse')}
            </Link>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {groups.map((g) => {
              const sub = g.lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
              return (
                <div key={g.sellerKey} className="panel p-5">
                  <h2 className="font-display font-bold text-brand-bone mb-4">{g.sellerName}</h2>
                  <div className="divide-y divide-brand-border/60">
                    {g.lines.map((l) => (
                      <div key={l.productId + l.variantId} className="py-3 flex items-center gap-3">
                        <Link href={`/shop/${l.productId}`} className="w-16 h-16 rounded-md overflow-hidden bg-black/40 shrink-0">
                          {l.image ? (
                            <img src={l.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 m-5 text-brand-text-muted" />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-brand-bone truncate">{l.title}</p>
                          <p className="text-xs text-brand-text-muted">{l.variantLabel}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              onClick={() => setQty(l.productId, l.variantId, l.quantity - 1)}
                              className="p-1 rounded border border-brand-border"
                              aria-label={t('shop.cart.less')}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm tabular-nums">{l.quantity}</span>
                            <button
                              onClick={() => setQty(l.productId, l.variantId, Math.min(10, l.quantity + 1))}
                              className="p-1 rounded border border-brand-border"
                              aria-label={t('shop.cart.more')}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setQty(l.productId, l.variantId, 0)}
                              className="p-1 ml-2 text-brand-text-muted hover:text-red-300"
                              aria-label={t('shop.cart.remove')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="tabular-nums text-brand-bone">{euro(l.unitPriceCents * l.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-4 mt-2">
                    <p className="text-brand-text-secondary text-sm">
                      {t('shop.cart.subtotal')}: <span className="text-brand-bone font-semibold">{euro(sub)}</span>
                      <span className="block text-xs text-brand-text-muted">{t('shop.cart.final_at_checkout')}</span>
                    </p>
                    <Link href={`/shop/checkout?seller=${encodeURIComponent(g.sellerKey)}`} className="btn-primary text-sm">
                      {t('shop.cart.checkout')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
