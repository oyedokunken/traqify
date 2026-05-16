"use client";

import { motion } from "framer-motion";
import {
  Package, ShoppingCart, Users, BarChart3,
  Shield, Bell, Store, FileText, CreditCard
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Smart Inventory",
    description: "Track stock levels in real time. Set low-stock alerts and get notified before you run out.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: ShoppingCart,
    title: "POS & Orders",
    description: "Create and manage orders from any device. Link to customers and track payment status.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Users,
    title: "Staff Management",
    description: "Invite your team via email. Assign roles and control exactly what each person can see or do.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: BarChart3,
    title: "Advanced Reports",
    description: "Revenue charts, top products, and order history - filtered by date range and exportable.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Four built-in roles: Owner, Manager, Cashier, and Auditor with granular permission control.",
    color: "bg-red-50 text-[#DE1010]",
  },
  {
    icon: Bell,
    title: "Instant Alerts",
    description: "Low stock notifications, order updates, and staff activity alerts keep you in the loop.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Store,
    title: "Public Store Page",
    description: "Each organisation gets a branded public catalog. Customers can browse and place orders.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: FileText,
    title: "Audit Logs",
    description: "Every action is logged with user, timestamp, and details. Full accountability at all times.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: CreditCard,
    title: "Payment Tracking",
    description: "Record and track payments against orders. View totals, statuses, and download payment reports.",
    color: "bg-orange-50 text-orange-600",
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center bg-[#DE1010]/10 text-[#DE1010] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#DE1010]/20"
          >
            Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3"
          >
            Everything your store needs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-3 max-w-xl mx-auto"
          >
            A complete operations suite, not a collection of disconnected tools.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.08 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={cardVariant}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#DE1010]/30 hover:shadow-md transition-all duration-200 cursor-default"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-bold text-[#0a0a0a] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
