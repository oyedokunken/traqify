"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, Trash2, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Product { id: string; name: string; sku: string; price: number; inventory?: { quantity: number } }
interface Customer { id: string; name: string; email?: string }
interface OrderItem { productId: string; name: string; price: number; quantity: number; stock: number }

export function CreateOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "walkin">("walkin");
  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/api/products?isActive=true"), api.get("/api/customers")])
      .then(([p, c]) => {
        setProducts(Array.isArray(p.data) ? p.data : p.data.products || []);
        setCustomers(Array.isArray(c.data) ? c.data : c.data.customers || []);
      });
  }, []);

  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems((prev) => prev.map((i) => i.productId === product.id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i));
    } else {
      setItems((prev) => [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.inventory?.quantity || 0 }]);
    }
    setProductSearch("");
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    const item = items.find((i) => i.productId === productId);
    if (item && qty > item.stock) return;
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId));

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const filteredProducts = (Array.isArray(products) ? products : []).filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.sku || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (items.length === 0) { setError("Add at least one product to create an order."); return; }
    if (customerMode === "new") {
      if (!newCustomerName.trim()) { setError("Customer name is required."); return; }
      if (!newCustomerEmail.trim()) { setError("Customer email is required."); return; }
      if (!newCustomerPhone.trim()) { setError("Customer phone number is required."); return; }
    }
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customerId: customerMode === "existing" ? customerId || undefined : undefined,
        newCustomer: customerMode === "new" ? {
          name: newCustomerName.trim(),
          email: newCustomerEmail.trim(),
          phone: newCustomerPhone.trim(),
          address: newCustomerAddress.trim() || undefined,
        } : undefined,
        paymentMethod,
        notes: notes || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create order.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl mx-4 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#0a0a0a]">New order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <p className="text-sm text-[#DE1010] bg-red-50 px-3 py-2 rounded-md">{error}</p>}

          <div>
            <Label>Add products</Label>
            <div className="relative mt-1.5">
              <Input placeholder="Search by name or SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              {productSearch && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-10">
                  {filteredProducts.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={(p.inventory?.quantity || 0) === 0}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium">{p.name} <span className="text-gray-400 font-normal">({p.sku})</span></span>
                      <span className="text-gray-500">{formatCurrency(p.price)} · {p.inventory?.quantity ?? 0} left</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-sm text-gray-400 text-center py-3">No products found</p>}
                </div>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Product</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0a0a0a]">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus size={12} /></button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"><Plus size={12} /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                      <td className="px-2 py-3"><button type="button" onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-[#DE1010]"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-sm text-right">Total</td>
                    <td className="px-4 py-3 font-bold text-[#0a0a0a]">{formatCurrency(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div>
            <Label>Customer</Label>
            <div className="flex gap-2 mt-1.5">
              {(["walkin", "existing", "new"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCustomerMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    customerMode === mode
                      ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {mode === "walkin" && "Walk-in"}
                  {mode === "existing" && <><Users size={12} /> Existing</>}
                  {mode === "new" && <><UserPlus size={12} /> New customer</>}
                </button>
              ))}
            </div>

            {customerMode === "existing" && (
              <select
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>
                ))}
              </select>
            )}

            {customerMode === "new" && (
              <div className="mt-2 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="col-span-2">
                  <Label className="text-xs">Full name <span className="text-[#DE1010]">*</span></Label>
                  <Input className="mt-1 h-9 text-sm" placeholder="e.g. John Adeyemi" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Email <span className="text-[#DE1010]">*</span></Label>
                  <Input className="mt-1 h-9 text-sm" type="email" placeholder="john@email.com" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Phone <span className="text-[#DE1010]">*</span></Label>
                  <Input className="mt-1 h-9 text-sm" placeholder="+234 800..." value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Address <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input className="mt-1 h-9 text-sm" placeholder="Delivery address" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} />
                </div>
                <p className="col-span-2 text-xs text-gray-400">A confirmation email will be sent to the customer.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment method</Label>
              <select className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Bank Transfer</option>
                <option value="POS">POS</option>
              </select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input className="mt-1.5" placeholder="Any notes about this order..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || items.length === 0}>
            {isLoading ? "Creating..." : `Create order · ${formatCurrency(total)}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
