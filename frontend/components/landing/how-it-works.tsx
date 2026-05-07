"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, Building2, Package, ShoppingCart, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    description: "Sign up in seconds with your email or Google. No credit card needed to get started.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
    dot: "bg-blue-500",
  },
  {
    icon: Building2,
    title: "Set up your organization",
    description: "Add your business name, invite your team, and assign roles — OWNER, MANAGER, CASHIER, or AUDITOR.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
    dot: "bg-purple-500",
  },
  {
    icon: Package,
    title: "Add your products",
    description: "Upload products with images, set prices, categories, and configure stock alerts.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
    dot: "bg-amber-500",
  },
  {
    icon: ShoppingCart,
    title: "Process orders",
    description: "Create orders from your POS dashboard, track customer purchases, and manage fulfilment in real time.",
    color: "bg-green-50 text-green-600 border-green-100",
    dot: "bg-green-500",
  },
  {
    icon: BarChart3,
    title: "Analyse and grow",
    description: "Access detailed reports, revenue trends, and top-selling products to make data-driven decisions.",
    color: "bg-[#DE1010]/10 text-[#DE1010] border-[#DE1010]/20",
    dot: "bg-[#DE1010]",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold text-[#DE1010] uppercase tracking-widest"
          >
            How it works
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3"
          >
            Up and running in minutes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 mt-3 max-w-xl mx-auto"
          >
            From zero to a fully operational store management system in five simple steps.
          </motion.p>
        </div>

        <div ref={ref} className="relative max-w-2xl mx-auto">
          <div className="absolute left-[28px] top-0 bottom-0 w-0.5 bg-gray-200">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              style={{ originY: 0 }}
              className="absolute inset-0 bg-gradient-to-b from-[#DE1010] to-[#DE1010]/20"
            />
          </div>

          <div className="space-y-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  className="relative flex gap-6"
                >
                  <div className="relative z-10 flex-shrink-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.1, type: "spring", stiffness: 200 }}
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${step.color}`}
                    >
                      <Icon size={22} />
                    </motion.div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                  </div>
                  <div className="pt-3 pb-4">
                    <h3 className="font-bold text-[#0a0a0a] text-lg mb-1">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
