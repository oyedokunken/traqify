"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Package, ShoppingCart, Heart, Star, ChevronLeft, ChevronRight,
  Minus, Plus, X, MapPin, Phone, Mail, Globe, Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  comparePrice?: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  productCategory?: { id: string; name: string };
  inventory?: { quantity: number };
}

interface CartItem extends Product { qty: number; }

interface Org {
  id: string; name: string; slug: string; logoUrl?: string;
  website?: string; email?: string; phone?: string; address?: string;
}

function dedup(p: Product) {
  return Array.from(new Set([p.imageUrl, ...(p.imageUrls || [])].filter(Boolean))) as string[];
}

export default function ProductPage({ params }: { params: { slug: string; id: string } }) {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [upsells, setUpsells] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    const stored = localStorage.getItem(`traqify_cart_${params.slug}`);
    if (stored) try { setCart(JSON.parse(stored)); } catch {}
    const wl = localStorage.getItem(`traqify_wishlist_${params.slug}`);
    if (wl) try { setWishlist(JSON.parse(wl)); } catch {}
  }, [params.slug]);

  useEffect(() => {
    api.get(`/api/organizations/${params.slug}/store`).then((r) => {
      setOrg(r.data.org);
      const products: Product[] = r.data.products || [];
      setAllProducts(products);
      const found = products.find((p) => p.id === params.id) || null;
      setProduct(found);
      if (found) {
        const sameCat = products.filter((p) => p.id !== found.id && p.productCategory?.id === found.productCategory?.id);
        const others = products.filter((p) => p.id !== found.id && p.productCategory?.id !== found.productCategory?.id);
        setUpsells([...sameCat, ...others].slice(0, 6));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params.slug, params.id]);

  const saveCart = (updated: CartItem[]) => {
    setCart(updated);
    localStorage.setItem(`traqify_cart_${params.slug}`, JSON.stringify(updated));
  };

  const addToCart = () => {
    if (!product) return;
    const existing = cart.find((i) => i.id === product.id);
    const updated = existing
      ? cart.map((i) => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
      : [...cart, { ...product, qty }];
    saveCart(updated);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const updateQty = (id: string, delta: number) => {
    const updated = cart.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter((i) => i.qty > 0);
    saveCart(updated);
  };

  const removeFromCart = (id: string) => saveCart(cart.filter((i) => i.id !== id));

  const toggleWishlist = (id: string) => {
    const updated = wishlist.includes(id) ? wishlist.filter((x) => x !== id) : [...wishlist, id];
    setWishlist(updated);
    localStorage.setItem(`traqify_wishlist_${params.slug}`, JSON.stringify(updated));
  };

  const goToCheckout = () => {
    localStorage.setItem(`traqify_cart_${params.slug}`, JSON.stringify(cart));
    router.push(`/store/${params.slug}/checkout`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Package size={40} className="text-gray-300" />
      <p className="text-gray-500">Product not found.</p>
      <Link href={`/store/${params.slug}`} className="text-[#DE1010] hover:underline text-sm">← Back to store</Link>
    </div>
  );

  const images = dedup(product);
  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round((1 - product.price / product.comparePrice) * 100) : 0;
  const inWishlist = wishlist.includes(product.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store header (same style as store page) */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href={`/store/${params.slug}`} className="flex items-center gap-2 flex-shrink-0">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org?.name} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="font-bold text-lg text-[#0a0a0a]">{org?.name || params.slug}</span>
            )}
          </Link>
          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
            <Link href={`/store/${params.slug}`} className="hover:text-gray-800 transition-colors">All products</Link>
            <span className="text-gray-300">›</span>
            <span className="text-[#0a0a0a] font-medium truncate max-w-xs">{product.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => toggleWishlist(product.id)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Heart size={20} className={inWishlist ? "fill-[#DE1010] text-[#DE1010]" : "text-gray-500"} />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ShoppingCart size={20} className="text-gray-700" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link href={`/store/${params.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to store
        </Link>

        {/* Product detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Gallery */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100">
              {images.length > 0 ? (
                <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={64} className="text-gray-200" />
                </div>
              )}
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-[#DE1010] text-white text-xs font-bold px-2.5 py-1 rounded-full">-{discount}%</span>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx((i) => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setImgIdx((i) => Math.min(images.length - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? "border-[#DE1010]" : "border-gray-100 hover:border-gray-300"}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {product.productCategory && (
              <span className="inline-block text-xs font-semibold text-[#DE1010] bg-red-50 px-3 py-1 rounded-full">
                {product.productCategory.name}
              </span>
            )}
            <h1 className="text-2xl font-bold text-[#0a0a0a] leading-tight">{product.name}</h1>

            {/* Stars (decorative) */}
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((s) => <Star key={s} size={14} className="fill-amber-400 text-amber-400" />)}
              <span className="text-xs text-gray-400 ml-1">5.0</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#0a0a0a]">{formatCurrency(product.price)}</span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-lg text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
              )}
            </div>

            {/* Stock */}
            {product.inventory && (
              <p className={`text-sm font-medium ${product.inventory.quantity > 0 ? "text-green-600" : "text-red-500"}`}>
                {product.inventory.quantity > 0 ? `${product.inventory.quantity} in stock` : "Out of stock"}
              </p>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Qty + add to cart */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-gray-50 text-gray-600 transition-colors"><Minus size={14} /></button>
                  <span className="px-4 py-3 text-sm font-semibold w-12 text-center">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-4 py-3 hover:bg-gray-50 text-gray-600 transition-colors"><Plus size={14} /></button>
                </div>
                <button onClick={addToCart}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${added ? "bg-green-600 text-white" : "bg-[#DE1010] hover:bg-red-700 text-white"}`}>
                  {added ? <><Check size={16} /> Added!</> : <><ShoppingCart size={16} /> Add to cart</>}
                </button>
                <button onClick={() => toggleWishlist(product.id)}
                  className={`p-3 rounded-xl border transition-all ${inWishlist ? "border-[#DE1010] bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <Heart size={18} className={inWishlist ? "fill-[#DE1010] text-[#DE1010]" : "text-gray-400"} />
                </button>
              </div>
              {cartCount > 0 && (
                <button onClick={goToCheckout}
                  className="w-full py-3 rounded-xl font-semibold text-sm border-2 border-[#0a0a0a] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white transition-all">
                  Checkout · {formatCurrency(cart.reduce((s, i) => s + i.price * i.qty, 0))}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">SKU: {product.sku}</p>
          </motion.div>
        </div>

        {/* Upsells */}
        {upsells.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#0a0a0a] mb-5">
              {upsells.some((u) => u.productCategory?.id === product.productCategory?.id)
                ? `More from ${product.productCategory?.name || "this category"}`
                : "You might also like"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {upsells.map((p) => {
                const imgs = dedup(p);
                const disc = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }} className="group cursor-pointer"
                    onClick={() => router.push(`/store/${params.slug}/products/${p.id}`)}>
                    <div className="relative aspect-square bg-white rounded-xl overflow-hidden border border-gray-100 mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-gray-200" /></div>
                      )}
                      {disc > 0 && <span className="absolute top-2 left-2 bg-[#DE1010] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{disc}%</span>}
                    </div>
                    <p className="text-xs font-semibold text-[#0a0a0a] truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(p.price)}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Cart drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setShowCart(false)}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }}
              className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="font-bold text-[#0a0a0a]">Your cart ({cartCount})</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-400 m-auto mt-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0a0a0a] truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Minus size={10} /></button>
                      <span className="text-sm font-medium w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"><Plus size={10} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-[#DE1010] ml-1"><X size={14} /></button>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingCart size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Your cart is empty</p>
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-bold text-[#0a0a0a]">{formatCurrency(cart.reduce((s, i) => s + i.price * i.qty, 0))}</span>
                  </div>
                  <button onClick={goToCheckout}
                    className="w-full py-3 bg-[#DE1010] text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors">
                    Checkout
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-400">
          <span>{org?.name} &copy; {new Date().getFullYear()}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
            <span className="text-gray-300">·</span>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
            <span className="text-gray-300">·</span>
            <Link href="/" className="hover:text-gray-600 transition-colors">Powered by Traqify</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
