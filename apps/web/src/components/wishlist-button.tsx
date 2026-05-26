'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addToWishlist, removeFromWishlist } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface WishlistButtonProps {
  productId: string;
  initialWishlisted?: boolean;
  iconOnly?: boolean;
}

export function WishlistButton({ productId, initialWishlisted = false, iconOnly = false }: WishlistButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setLoading(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(productId);
        setWishlisted(false);
      } else {
        await addToWishlist(productId);
        setWishlisted(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className="flex items-center justify-center rounded-lg p-2 transition-all disabled:opacity-50"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Heart
          size={18}
          fill={wishlisted ? '#ef4444' : 'none'}
          style={{ color: wishlisted ? '#ef4444' : '#fff' }}
        />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
      style={
        wishlisted
          ? { background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
          : { background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-subtle)' }
      }
    >
      <Heart
        size={16}
        fill={wishlisted ? '#ef4444' : 'none'}
        style={{ color: wishlisted ? '#ef4444' : undefined }}
      />
      {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
    </button>
  );
}
