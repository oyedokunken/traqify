"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Search, ShoppingCart, ShoppingBag, X, Plus, Minus, ChevronLeft, ChevronRight, Heart, MapPin, Phone, Mail, Globe, Star, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollToTop } from "@/components/shared/scroll-to-top";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 12;

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
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function ProductCard({ product, images, inStock, inWishlist, slug, onAddToCart, onToggleWishlist }: {
  product: Product; images: string[]; inStock: boolean; inWishlist: boolean; slug: string;
  onAddToCart: () => void; onToggleWishlist: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = () => {
    if (images.length <= 1) return;
    setImgIdx(1);
    intervalRef.current = setInterval(() => {
      setImgIdx((i) => (i + 1) % images.length);
    }, 900);
  };

  const stopCycle = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setImgIdx(0);
  };

  return (
    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
      onMouseEnter={startCycle} onMouseLeave={stopCycle}>
      <Link href={`/store/${slug}/products/${product.id}`} className="block">
      <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-300" />
        ) : (
          <Package size={32} className="text-gray-300" />
        )}
        {!inStock && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="text-white text-xs font-semibold bg-black/60 px-2 py-0.5 rounded-full">Out of stock</span></div>}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? "bg-white" : "bg-white/50"}`} />)}
          </div>
        )}
        {product.comparePrice && product.comparePrice > product.price && (
          <div className="absolute top-2 left-2 bg-[#DE1010] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{Math.round((1 - product.price / product.comparePrice) * 100)}%
          </div>
        )}
      </div>
      </Link>
      <div className="p-3">
        <p className="font-semibold text-[#0a0a0a] text-sm truncate">{product.name}</p>
        {product.productCategory && <p className="text-[10px] text-gray-400 mt-0.5">{product.productCategory.name}</p>}
        <div className="flex items-center justify-between mt-1.5 mb-2.5">
          <div>
            <p className="font-bold text-[#0a0a0a] text-sm">{formatCurrency(product.price)}</p>
            {product.comparePrice && product.comparePrice > product.price && <p className="text-[10px] text-gray-400 line-through">{formatCurrency(product.comparePrice)}</p>}
          </div>
        </div>
        {/* View + cart icon + wishlist icon */}
        <div className="flex items-center gap-1.5">
          <Link href={`/store/${slug}/products/${product.id}`}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-[#0a0a0a] text-white hover:bg-black/80 transition-colors flex items-center justify-center">
            View product
          </Link>
          <button onClick={(e) => { e.stopPropagation(); if (inStock) onAddToCart(); }} disabled={!inStock} title="Add to cart"
            className={`p-1.5 rounded-lg border transition-colors ${inStock ? "border-gray-200 hover:border-gray-400 text-gray-600 hover:bg-gray-50" : "border-gray-100 text-gray-300 cursor-not-allowed"}`}>
            <ShoppingCart size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }} title="Wishlist"
            className={`p-1.5 rounded-lg border transition-colors ${inWishlist ? "border-[#DE1010] bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
            <Heart size={14} className={inWishlist ? "fill-[#DE1010] text-[#DE1010]" : "text-gray-400"} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PublicStorePage({ params }: { params: { slug: string } }) {
  const [org, setOrg] = useState<Org | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [sliderReady, setSliderReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [offline, setOffline] = useState(false);
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistEmail, setWishlistEmail] = useState("");
  const [showWishlistEmailPrompt, setShowWishlistEmailPrompt] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [activeDetailImg, setActiveDetailImg] = useState(0);
  const router = useRouter();

  useEffect(() => { setActiveDetailImg(0); }, [detailProduct?.id]);

  useEffect(() => {
    api.get(`/api/organizations/${params.slug}/store`)
      .then((r) => { setOrg(r.data.org); setProducts(r.data.products); setCategories(r.data.categories || []); })
      .catch((err) => { if (err.response?.status === 403) setOffline(true); else setNotFound(true); })
      .finally(() => setLoading(false));
    const wl = localStorage.getItem(`traqify_wishlist_${params.slug}`);
    if (wl) try { setWishlist(JSON.parse(wl)); } catch {}
  }, [params.slug]);

  const getSessionId = () => {
    let sid = localStorage.getItem("traqify_session");
    if (!sid) { sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("traqify_session", sid); }
    return sid;
  };

  const syncWishlistToBackend = (ids: string[], email?: string) => {
    const sessionId = getSessionId();
    api.post(`/api/store/${params.slug}/wishlist`, { sessionId, productIds: ids, email: email || undefined }).catch(() => {});
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(`traqify_wishlist_${params.slug}`, JSON.stringify(next));
      syncWishlistToBackend(next);
      if (next.includes(id) && !wishlistEmail) setShowWishlistEmailPrompt(true);
      return next;
    });
  };

  const absoluteMin = products.length ? Math.min(...products.map((p) => p.price)) : 0;
  const absoluteMax = products.length ? Math.max(...products.map((p) => p.price)) : 100000;

  useEffect(() => {
    if (products.length && !sliderReady) {
      setPriceRange([Math.min(...products.map((p) => p.price)), Math.max(...products.map((p) => p.price))]);
      setSliderReady(true);
    }
  }, [products, sliderReady]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || p.productCategory?.name === category;
    const matchPrice = !sliderReady || (p.price >= priceRange[0] && p.price <= priceRange[1]);
    return matchSearch && matchCategory && matchPrice;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));
  const updateQty = (id: string, delta: number) => setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const goToCheckout = () => {
    localStorage.setItem(`traqify_cart_${params.slug}`, JSON.stringify(cart));
    router.push(`/store/${params.slug}/checkout`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (offline) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={28} className="text-gray-300" />
        </div>
        <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Store is offline</h1>
        <p className="text-gray-500 text-sm">This store is currently not accepting orders. Please check back later.</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Store not found</h1>
        <p className="text-gray-500 text-sm">This store does not exist or is no longer available.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo / Store name */}
          <div className="flex items-center flex-shrink-0">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <h1 className="font-bold text-lg text-[#0a0a0a] truncate max-w-[180px]">{org?.name}</h1>
            )}
          </div>

          {/* Desktop category nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
            <button onClick={() => { setCategory(""); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!category ? "bg-[#0a0a0a] text-white" : "text-gray-600 hover:bg-gray-100"}`}>All</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setCategory(cat.name === category ? "" : cat.name); setPage(1); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cat.name === category ? "bg-[#0a0a0a] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{cat.name}</button>
            ))}
            <a href="#store-info" className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">About store</a>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Wishlist */}
            <button onClick={() => {}} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Wishlist">
              <Heart size={20} className={`${wishlist.length > 0 ? "fill-[#DE1010] text-[#DE1010]" : "text-gray-500"}`} />
              {wishlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlist.length}</span>}
            </button>
            {/* Cart */}
            <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Cart">
              <ShoppingCart size={20} className="text-gray-700" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
            {/* Mobile + tablet hamburger */}
            <button onClick={() => setShowMenu(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <SlidersHorizontal size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile off-canvas menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed top-0 left-0 h-full w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  {org?.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="h-8 w-auto max-w-[140px] object-contain" />
                  ) : (
                    <span className="font-bold text-[#0a0a0a] truncate max-w-[160px]">{org?.name}</span>
                  )}
                </div>
                <button onClick={() => setShowMenu(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"><X size={18} /></button>
              </div>
              {/* Drawer nav */}
              <nav className="flex-1 px-4 py-5 overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Products</p>
                <button onClick={() => { setCategory(""); setPage(1); setShowMenu(false); }}
                  className={`flex w-full items-center px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${!category ? "bg-[#0a0a0a] text-white" : "text-gray-700 hover:bg-gray-50"}`}>All products</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => { setCategory(cat.name === category ? "" : cat.name); setPage(1); setShowMenu(false); }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${cat.name === category ? "bg-[#0a0a0a] text-white" : "text-gray-700 hover:bg-gray-50"}`}>{cat.name}</button>
                ))}
                <div className="border-t border-gray-100 my-4" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-2">Quick actions</p>
                <a href="#store-info" onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-1">
                  <MapPin size={15} className="text-gray-400" /> About store
                </a>
                <button onClick={() => { setShowMenu(false); setShowCart(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 mb-1">
                  <ShoppingBag size={15} className="text-gray-400" /> Cart {cartCount > 0 && <span className="ml-auto bg-[#DE1010] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cartCount}</span>}
                </button>
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700">
                  <Heart size={15} className={wishlist.length > 0 ? "text-[#DE1010] fill-[#DE1010]" : "text-gray-400"} /> Wishlist {wishlist.length > 0 && <span className="ml-auto bg-[#DE1010] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{wishlist.length}</span>}
                </div>
              </nav>
              <div className="px-5 pb-6 border-t border-gray-100 pt-4">
                <Link href="/" className="text-xs text-gray-400">Powered by <span className="text-[#0a0a0a] font-semibold">Traqify</span></Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6">

          {/* Left filter sidebar — desktop only */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</p>
              <div className="mb-4">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#DE1010]/20" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
              </div>
              {categories.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                  <button onClick={() => { setCategory(""); setPage(1); }} className={`block w-full text-left px-2 py-1.5 rounded-lg text-xs mb-1 transition-colors ${!category ? "bg-[#0a0a0a] text-white" : "text-gray-600 hover:bg-gray-50"}`}>All categories</button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => { setCategory(cat.name === category ? "" : cat.name); setPage(1); }} className={`block w-full text-left px-2 py-1.5 rounded-lg text-xs mb-1 transition-colors ${cat.name === category ? "bg-[#0a0a0a] text-white" : "text-gray-600 hover:bg-gray-50"}`}>{cat.name}</button>
                  ))}
                </div>
              )}
              {/* Price range slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Price range</p>
                  <span className="text-[10px] text-gray-500">{formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-6">Min</span>
                    <input type="range" min={absoluteMin} max={absoluteMax} step={100} value={priceRange[0]}
                      onChange={(e) => { const v = Number(e.target.value); if (v < priceRange[1]) { setPriceRange([v, priceRange[1]]); setPage(1); } }}
                      className="flex-1 accent-[#DE1010] h-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 w-6">Max</span>
                    <input type="range" min={absoluteMin} max={absoluteMax} step={100} value={priceRange[1]}
                      onChange={(e) => { const v = Number(e.target.value); if (v > priceRange[0]) { setPriceRange([priceRange[0], v]); setPage(1); } }}
                      className="flex-1 accent-[#DE1010] h-1" />
                  </div>
                </div>
                {category && <button onClick={() => { setCategory(""); setPage(1); }} className="mt-2 text-[10px] text-[#DE1010] hover:underline">Clear filters</button>}
              </div>
            </div>
          </aside>

          {/* Center: products */}
          <div className="flex-1 min-w-0">
            {/* Mobile/tablet top bar + filter panel */}
            <div className="lg:hidden mb-4 space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input placeholder="Search products..." className="pl-8 bg-white text-sm" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {categories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setCategory(""); setPage(1); }} className={`px-3 py-1 rounded-full text-xs font-medium ${!category ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-600"}`}>All</button>
                      {categories.map((cat) => (
                        <button key={cat.id} onClick={() => { setCategory(cat.name === category ? "" : cat.name); setPage(1); }} className={`px-3 py-1 rounded-full text-xs font-medium ${cat.name === category ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-600"}`}>{cat.name}</button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Price range slider (mobile) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Price range</p>
                    <span className="text-[10px] text-gray-500">{formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 w-6">Min</span>
                      <input type="range" min={absoluteMin} max={absoluteMax} step={100} value={priceRange[0]}
                        onChange={(e) => { const v = Number(e.target.value); if (v < priceRange[1]) { setPriceRange([v, priceRange[1]]); setPage(1); } }}
                        className="flex-1 accent-[#DE1010] h-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400 w-6">Max</span>
                      <input type="range" min={absoluteMin} max={absoluteMax} step={100} value={priceRange[1]}
                        onChange={(e) => { const v = Number(e.target.value); if (v > priceRange[0]) { setPriceRange([priceRange[0], v]); setPage(1); } }}
                        className="flex-1 accent-[#DE1010] h-1" />
                    </div>
                  </div>
                </div>
                {category && <button onClick={() => { setCategory(""); setPage(1); }} className="mt-3 text-xs text-[#DE1010] hover:underline">Clear filters</button>}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-24"><Package size={40} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No products found</p></div>
            ) : (
              <>
                <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginated.map((product) => {
                    const inStock = (product.inventory?.quantity ?? 0) > 0;
                    const rawImgs = [product.imageUrl, ...(product.imageUrls || [])].filter(Boolean) as string[];
                    const images = Array.from(new Set(rawImgs));
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        images={images}
                        inStock={inStock}
                        inWishlist={wishlist.includes(product.id)}
                        slug={params.slug}
                        onAddToCart={() => addToCart(product)}
                        onToggleWishlist={() => toggleWishlist(product.id)}
                      />
                    );
                  })}
                </motion.div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={16} /></button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-[#0a0a0a] text-white" : "border border-gray-200 hover:bg-gray-50 text-gray-600"}`}>{p}</button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={16} /></button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Store info section */}
        <section id="store-info" className="mt-16 scroll-mt-20">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#0a0a0a] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                {org?.logoUrl ? (
                  <img src={org.logoUrl} alt={org.name} className="h-14 w-auto max-w-[160px] object-contain bg-white rounded-xl p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#DE1010] flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">{org?.name?.[0]}</span>
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-white text-lg">{org?.name}</h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map((s) => <Star key={s} size={11} className="text-amber-400 fill-amber-400" />)}
                    <span className="text-xs text-gray-400 ml-1">Verified store</span>
                  </div>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-3">
                <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                  <p className="text-lg font-bold text-white">{products.length}</p>
                  <p className="text-[10px] text-gray-400">Products</p>
                </div>
                <div className="text-center bg-white/10 rounded-xl px-4 py-2">
                  <p className="text-lg font-bold text-white">{categories.length}</p>
                  <p className="text-[10px] text-gray-400">Categories</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              {org?.email && (
                <a href={`mailto:${org.email}`} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#DE1010]/10">
                    <Mail size={15} className="text-gray-500 group-hover:text-[#DE1010]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Email</p>
                    <p className="text-sm font-medium text-[#0a0a0a] truncate">{org.email}</p>
                  </div>
                </a>
              )}
              {org?.phone && (
                <a href={`tel:${org.phone}`} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#DE1010]/10">
                    <Phone size={15} className="text-gray-500 group-hover:text-[#DE1010]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-[#0a0a0a]">{org.phone}</p>
                  </div>
                </a>
              )}
              {org?.address && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Address</p>
                    <p className="text-sm font-medium text-[#0a0a0a]">{org.address}</p>
                  </div>
                </div>
              )}
              {org?.website && (
                <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#DE1010]/10">
                    <Globe size={15} className="text-gray-500 group-hover:text-[#DE1010]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Website</p>
                    <p className="text-sm font-medium text-[#DE1010] truncate">{org.website.replace(/^https?:\/\//, "")}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

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

      {/* Cart drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={() => setShowCart(false)}
          >
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.25 }}
              className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
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
              </div>
              <div className="p-5 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="font-bold text-[#0a0a0a]">{formatCurrency(cartTotal)}</span>
                </div>
                <button onClick={goToCheckout} className="block w-full py-3 bg-[#DE1010] text-white rounded-xl text-center font-semibold text-sm hover:bg-red-700 transition-colors">Proceed to checkout</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product detail drawer */}
      <AnimatePresence>
        {detailProduct && (() => {
          const detailImages = Array.from(new Set([detailProduct.imageUrl, ...(detailProduct.imageUrls || [])].filter(Boolean) as string[]));
          const inStockDetail = (detailProduct.inventory?.quantity ?? 0) > 0;
          const inWishlistDetail = wishlist.includes(detailProduct.id);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
              onClick={() => setDetailProduct(null)}
            >
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  {detailImages.length > 0 ? (
                    <img src={detailImages[activeDetailImg]} alt={detailProduct.name} className="w-full h-56 sm:h-64 object-contain bg-gray-50 p-2" />
                  ) : (
                    <div className="w-full h-56 sm:h-64 bg-gray-100 flex items-center justify-center"><Package size={48} className="text-gray-300" /></div>
                  )}
                  <button onClick={() => setDetailProduct(null)} className="absolute top-3 right-3 bg-white/90 rounded-full p-1.5 shadow"><X size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); toggleWishlist(detailProduct.id); }}
                    className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-colors ${inWishlistDetail ? "bg-[#DE1010] text-white" : "bg-white/90 text-gray-500 hover:bg-[#DE1010] hover:text-white"}`}>
                    <Heart size={14} className={inWishlistDetail ? "fill-white" : ""} />
                  </button>
                  {detailProduct.comparePrice && detailProduct.comparePrice > detailProduct.price && (
                    <div className="absolute bottom-3 left-3 bg-[#DE1010] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      -{Math.round((1 - detailProduct.price / detailProduct.comparePrice) * 100)}% OFF
                    </div>
                  )}
                </div>
                {detailImages.length > 1 && (
                  <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-gray-50 border-b border-gray-100">
                    {detailImages.map((img, i) => (
                      <button key={i} onClick={() => setActiveDetailImg(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${i === activeDetailImg ? "border-[#DE1010]" : "border-transparent"}`}>
                        <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-5 overflow-y-auto flex-1">
                  {detailProduct.productCategory && <p className="text-xs font-medium text-[#DE1010] mb-1">{detailProduct.productCategory.name}</p>}
                  <h2 className="text-lg font-bold text-[#0a0a0a] mb-2">{detailProduct.name}</h2>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl font-bold text-[#0a0a0a]">{formatCurrency(detailProduct.price)}</span>
                    {detailProduct.comparePrice && detailProduct.comparePrice > detailProduct.price && <span className="text-sm text-gray-400 line-through">{formatCurrency(detailProduct.comparePrice)}</span>}
                  </div>
                  {detailProduct.description && <p className="text-sm text-gray-600 leading-relaxed mb-4">{detailProduct.description}</p>}
                  <div className="flex items-center gap-1.5 mb-5">
                    <div className={`w-2 h-2 rounded-full ${inStockDetail ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="text-xs text-gray-500">{inStockDetail ? `${detailProduct.inventory!.quantity} in stock` : "Out of stock"}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { addToCart(detailProduct); setDetailProduct(null); }} disabled={!inStockDetail}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${inStockDetail ? "bg-[#DE1010] text-white hover:bg-red-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                      <ShoppingBag size={15} />
                      {inStockDetail ? "Add to cart" : "Out of stock"}
                    </button>
                    <button onClick={() => toggleWishlist(detailProduct.id)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-colors ${inWishlistDetail ? "border-[#DE1010] bg-red-50 text-[#DE1010]" : "border-gray-200 text-gray-400 hover:border-[#DE1010] hover:text-[#DE1010]"}`}>
                      <Heart size={16} className={inWishlistDetail ? "fill-[#DE1010]" : ""} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <ScrollToTop />

      {/* Wishlist email prompt */}
      <AnimatePresence>
        {showWishlistEmailPrompt && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-[#0a0a0a] text-sm">Get reminded about your wishlist</p>
                  <p className="text-xs text-gray-400 mt-0.5">We will send you a reminder so you do not forget.</p>
                </div>
                <button onClick={() => setShowWishlistEmailPrompt(false)} className="text-gray-300 hover:text-gray-500 ml-2"><X size={16} /></button>
              </div>
              <div className="flex gap-2 mt-3">
                <input type="email" placeholder="Your email address" value={wishlistEmail}
                  onChange={(e) => setWishlistEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DE1010]/20" />
                <button onClick={() => {
                  if (wishlistEmail) {
                    syncWishlistToBackend(wishlist, wishlistEmail);
                    localStorage.setItem(`traqify_wishlist_email_${params.slug}`, wishlistEmail);
                  }
                  setShowWishlistEmailPrompt(false);
                }} className="px-3 py-2 bg-[#DE1010] text-white rounded-lg text-xs font-medium hover:bg-red-700">
                  Save
                </button>
              </div>
              <button onClick={() => setShowWishlistEmailPrompt(false)} className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 w-full text-center">No thanks</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}
