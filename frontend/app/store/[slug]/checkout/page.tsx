"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Package, ShoppingCart, Shield, Lock, ChevronRight, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

declare global { interface Window { PaystackPop: any; } }

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
}

function makeCaptcha() {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  const ops: { op: string; answer: number }[] = [
    { op: `${a} + ${b}`, answer: a + b },
    { op: `${a + b} − ${b}`, answer: a },
    { op: `${a} × ${b}`, answer: a * b },
  ];
  const pick = ops[Math.floor(Math.random() * ops.length)];
  return { question: `What is ${pick.op}?`, answer: pick.answer };
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber: string; total: number } | null>(null);
  const [org, setOrg] = useState<{ name: string; logoUrl?: string } | null>(null);
  const [captcha, setCaptcha] = useState(() => makeCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    const stored = localStorage.getItem(`traqify_cart_${params.slug}`);
    if (!stored) { router.replace(`/store/${params.slug}`); return; }
    try {
      const parsed: CartItem[] = JSON.parse(stored);
      if (!parsed.length) { router.replace(`/store/${params.slug}`); return; }
      setCart(parsed);
      setCartReady(true);
    } catch { router.replace(`/store/${params.slug}`); return; }
    api.get(`/api/organizations/${params.slug}/store`).then((r) => setOrg(r.data.org)).catch(() => {});
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [params.slug, router]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const completeOrder = async (reference: string) => {
    setLoading(true); setError("");
    try {
      const items = cart.map((i) => ({ productId: i.id, quantity: i.qty }));
      const res = await api.post(`/api/store/${params.slug}/checkout`, { name, email, phone, address, notes, items, paymentMethod: "PAYSTACK", paystackReference: reference });
      localStorage.removeItem(`traqify_cart_${params.slug}`);
      setSuccess({ orderNumber: res.data.orderNumber, total: res.data.totalAmount });
    } catch (err: any) {
      setError(err.response?.data?.error || "Payment verified but order creation failed. Contact support.");
    } finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    if (parseInt(captchaInput) !== captcha.answer) { setError("Incorrect security answer. Please try again."); setCaptcha(makeCaptcha()); setCaptchaInput(""); return; }
    setError("");
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_97ea3775550f1bd74cdaa1818a57b6a280f177e8",
      email,
      amount: Math.round(total * 100),
      currency: "NGN",
      ref: `TRQ-${Date.now()}`,
      metadata: { name, phone, slug: params.slug },
      callback: (response: any) => { completeOrder(response.reference); },
      onClose: () => { setError("Payment window closed. Your order was not placed."); },
    });
    handler.openIframe();
  };

  if (!cartReady && !success) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-[#0a0a0a] mb-2">Order placed!</h1>
        <p className="text-gray-500 text-sm mb-4">A confirmation has been sent to <strong>{email}</strong>.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 mb-1">ORDER NUMBER</p>
          <p className="font-bold text-[#0a0a0a] text-lg">{success.orderNumber}</p>
          <p className="text-xs text-gray-500 mt-1">Total: <strong>{formatCurrency(success.total)}</strong></p>
        </div>
        <Link href={`/store/${params.slug}`} className="block w-full py-3 bg-[#DE1010] text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors">
          Continue shopping
        </Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href={`/store/${params.slug}`} className="flex items-center gap-2 flex-shrink-0">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org?.name} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="font-bold text-lg text-[#0a0a0a] truncate max-w-[180px]">{org?.name || params.slug}</span>
            )}
          </Link>
          <div className="relative p-2">
            <ShoppingCart size={20} className="text-gray-700" />
            {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#DE1010] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
          </div>
        </div>
      </header>

      {/* Page breadcrumb */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-sm">
          <Link href={`/store/${params.slug}`} className="text-gray-400 hover:text-gray-600 transition-colors">Store</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <Link href={`/store/${params.slug}`} className="text-gray-400 hover:text-gray-600 transition-colors">Cart</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-[#0a0a0a] font-semibold">Checkout</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Order form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-[#0a0a0a] mb-5">Your details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Full name <span className="text-[#DE1010]">*</span></Label>
                    <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                  </div>
                  <div>
                    <Label className="text-xs">Email address <span className="text-[#DE1010]">*</span></Label>
                    <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone number</Label>
                  <Input className="mt-1" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
                </div>
                <div>
                  <Label className="text-xs">Delivery address</Label>
                  <Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 Example Street, Lagos" />
                </div>
                <div>
                  <Label className="text-xs">Order notes <span className="text-gray-400">(optional)</span></Label>
                  <textarea
                    className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DE1010]/20 focus:border-[#DE1010] resize-none"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions..."
                  />
                </div>

                {/* Arithmetic captcha */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5"><Shield size={13} /> Security check</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#0a0a0a] min-w-max">{captcha.question}</span>
                    <Input className="w-24 text-center" type="number" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} placeholder="?" />
                    <button type="button" onClick={() => { setCaptcha(makeCaptcha()); setCaptchaInput(""); }} className="text-gray-400 hover:text-gray-600" title="New question"><RefreshCw size={14} /></button>
                  </div>
                </div>

                {error && <p className="text-xs text-[#DE1010] bg-red-50 px-3 py-2 rounded-md">{error}</p>}

                <div className="pt-2 space-y-3">
                  <Button type="submit" className="w-full bg-[#0a0a0a] hover:bg-black/80 text-white py-3 rounded-xl font-semibold text-sm" disabled={loading}>
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Processing...</>
                    ) : (
                      <>Pay {formatCurrency(total)} with Paystack &rarr;</>
                    )}
                  </Button>
                  {/* Paystack security badge */}
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Lock size={12} className="text-gray-400" />
                    <span className="text-[11px] text-gray-400">Secured and processed by </span>
                    <span className="text-[11px] font-bold text-[#00C3F7]">Paystack</span>
                    <Shield size={12} className="text-green-500" />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Order summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
              <h2 className="font-semibold text-[#0a0a0a] mb-4 text-sm">Order summary</h2>
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <Package size={16} className="text-gray-300 m-auto mt-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#0a0a0a] truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400">× {item.qty}</p>
                    </div>
                    <p className="text-xs font-semibold text-[#0a0a0a]">{formatCurrency(item.price * item.qty)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-bold text-[#0a0a0a]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

        </div>
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
    </div>
  );
}
