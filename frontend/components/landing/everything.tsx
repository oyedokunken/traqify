"use client";

import { motion } from "framer-motion";
import { Crown, Layers, Receipt, Search, CheckCircle2 } from "lucide-react";

const categories = [
  {
    icon: Crown,
    pill: "Owner role",
    pillColor: "bg-[#DE1010]/10 text-[#DE1010]",
    title: "For Store Owners",
    subtext: "Full control of your business. See every number, every team action, every report.",
    borderColor: "border-t-[#DE1010]",
    items: [
      "Full organizational control",
      "Multi-staff with role-based access",
      "Revenue and profit reports",
      "Audit logs on all team actions",
      "Public product catalog page",
    ],
  },
  {
    icon: Layers,
    pill: "Manager role",
    pillColor: "bg-blue-50 text-blue-600",
    title: "For Managers",
    subtext: "Keep products, stock, and orders moving. Coordinate day-to-day store operations.",
    borderColor: "border-t-blue-500",
    items: [
      "Product creation and editing",
      "Inventory management and alerts",
      "Order processing and tracking",
      "Customer database management",
      "Staff invitation and oversight",
    ],
  },
  {
    icon: Receipt,
    pill: "Cashier role",
    pillColor: "bg-green-50 text-green-600",
    title: "For Cashiers",
    subtext: "Focus on what matters most: serving customers. Create orders quickly and keep the queue moving.",
    borderColor: "border-t-green-500",
    items: [
      "Fast order creation",
      "Customer lookup",
      "Product catalog browsing",
      "Payment method recording",
      "Daily transaction history",
    ],
  },
  {
    icon: Search,
    pill: "Auditor role",
    pillColor: "bg-purple-50 text-purple-600",
    title: "For Auditors",
    subtext: "Read everything, change nothing. Full visibility across inventory, orders, and team activity.",
    borderColor: "border-t-purple-500",
    items: [
      "Read-only data access",
      "Full audit log visibility",
      "Inventory snapshot reports",
      "Order and revenue reports",
      "Printable financial summaries",
    ],
  },
];

export function Everything() {
  return (
    <section id="roles" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="inline-flex items-center bg-[#0a0a0a] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Built for every role
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3">
            One platform, every perspective
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="text-gray-500 mt-3 max-w-lg mx-auto">
            Four roles, each with exactly the right access. No clutter, no confusion, just the tools each person actually needs.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.div key={cat.title} initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-2xl p-6 border border-gray-100 border-t-4 hover:shadow-md transition-shadow ${cat.borderColor}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${cat.pillColor}`}>
                <cat.icon size={18} />
              </div>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${cat.pillColor}`}>
                {cat.pill}
              </span>
              <h3 className="font-bold text-[#0a0a0a] text-base mb-2">{cat.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">{cat.subtext}</p>
              <ul className="space-y-2.5">
                {cat.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-gray-600">
                    <CheckCircle2 size={13} className="text-[#DE1010] flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}