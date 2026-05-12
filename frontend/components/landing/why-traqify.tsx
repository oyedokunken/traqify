"use client";

import { motion } from "framer-motion";
import { BarChart2, Clock, ShieldCheck, Layers, Users, Zap } from "lucide-react";

const reasons = [
  {
    icon: BarChart2,
    title: "Real-time visibility",
    description: "See revenue, orders, and stock levels update as they happen. No more end-of-day surprises or guesswork about where your business stands.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Clock,
    title: "Set up in minutes",
    description: "From sign-up to a fully operational store takes less than ten minutes. Add products, invite staff, and go live with no technical expertise needed.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: ShieldCheck,
    title: "Access that actually makes sense",
    description: "Four built-in roles keep the right information in the right hands. Owners see everything, cashiers see only what they need. No accidental edits, no data leaks.",
    color: "bg-[#DE1010]/10 text-[#DE1010]",
  },
  {
    icon: Layers,
    title: "Everything connected",
    description: "Orders update inventory. Inventory triggers alerts. Payments link back to orders. Every part of the platform talks to the others so nothing falls through the cracks.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "Invite as many staff as you need, assign roles, and track every action through audit logs. Growing your team does not mean losing control.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Zap,
    title: "Fast and dependable",
    description: "Traqify is built on infrastructure that stays up. Pages load fast, reports generate instantly, and your store stays online even during peak hours.",
    color: "bg-teal-50 text-teal-600",
  },
];

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function WhyTraqify() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
          >
            Why Traqify
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3"
          >
            Why people love Traqify
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-3 max-w-xl mx-auto"
          >
            Hundreds of store owners switched to Traqify and never looked back. Here is why.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          transition={{ staggerChildren: 0.09 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.title}
                variants={cardVariant}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${r.color}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-bold text-[#0a0a0a] mb-2 text-base">{r.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{r.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
