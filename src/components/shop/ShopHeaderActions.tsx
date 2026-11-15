'use client';

import Link from 'next/link';
import { ShoppingBag, Receipt } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import { useCart } from './shopUi';

export function ShopHeaderActions() {
  const { t } = useTranslation();
  const { count } = useCart();
  const { isAuthenticated } = useAuth();
  return (
    <div className="flex gap-2">
      {isAuthenticated && (
        <Link href="/shop/orders" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <Receipt className="w-4 h-4" /> {t('shop.nav.orders')}
        </Link>
      )}
      <Link href="/shop/cart" className="btn-outline inline-flex items-center gap-2 text-sm py-2! px-4!">
        <ShoppingBag className="w-4 h-4" /> {t('shop.nav.cart')}
        {count > 0 && (
          <span className="min-w-5 h-5 px-1 rounded-full bg-brand-red text-white text-[11px] flex items-center justify-center">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
