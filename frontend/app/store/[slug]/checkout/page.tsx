"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Package, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  qty: number;
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber: string; total: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`traqify_cart_${params.slug}`);
    if (!stored) { router.replace(`/store/${params.slug}`); return; }
    try { setCart(JSON.parse(stored)); } catch { router.replace(`/store/${params.slug}`); }
  }, [params.slug, router]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setLoading(true); setError("");
    try {
      const items = cart.map((i) => ({ productId: i.id, quantity: i.qty }));
      const res = await api.post(`/api/store/${params.slug}/checkout`, { name, email, phone, address, notes, items, paymentMethod: "TRANSFER" });
      localStorage.removeItem(`traqify_cart_${params.slug}`);
      setSuccess({ orderNumber: res.data.orderNumber, total: res.data.totalAmount });
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !success) return (
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href={`/store/${params.slug}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-[#DE1010]" />
            <h1 className="font-bold text-[#0a0a0a] text-sm">Checkout</h1>
          </div>
        </div>
      </header>

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

                {error && <p className="text-xs text-[#DE1010] bg-red-50 px-3 py-2 rounded-md">{error}</p>}

                <div className="pt-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[#0a0a0a]">Bank transfer</p>
                      <p className="text-[10px] text-gray-400">Payment details will be sent to your email after ordering.</p>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-[#DE1010] hover:bg-red-700 text-white py-3 rounded-xl font-semibold" disabled={loading}>
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Placing order...</>
                    ) : (
                      `Place order · ${formatCurrency(total)}`
                    )}
                  </Button>
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

      <footer className="border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-400">
        Powered by <Link href="/" className="text-gray-600 hover:text-[#0a0a0a]">Traqify</Link>
      </footer>
    </div>
  );
}
