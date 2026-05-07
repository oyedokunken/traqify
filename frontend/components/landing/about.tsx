"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const points = [
  "Track every product, order, and team member from one place",
  "Role-based access so each person sees only what they need",
  "Real-time reports that update as your store moves",
  "A public catalog page your customers can order from directly",
];

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white"
    >
      <div className="bg-[#0a0a0a] px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#DE1010]" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-xs text-gray-400 ml-2 font-mono">dashboard / overview</span>
      </div>

      <div className="flex h-[340px]">
        <div className="w-14 bg-[#0a0a0a] flex flex-col items-center pt-4 gap-3 flex-shrink-0">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "bg-[#DE1010]" : "bg-white/5"}`}>
              <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? "bg-white" : "bg-white/20"}`} />
            </div>
          ))}
        </div>

        <div className="flex-1 bg-gray-50 p-4 overflow-hidden">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Revenue", value: "₦2.4M", color: "text-green-600", bg: "bg-green-50" },
              { label: "Orders", value: "148", color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Products", value: "64", color: "text-[#DE1010]", bg: "bg-red-50" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
              >
                <p className="text-[10px] text-gray-400 mb-1">{stat.label}</p>
                <p className={`font-bold text-sm ${stat.color}`}>{stat.value}</p>
                <div className={`mt-2 h-1 rounded-full ${stat.bg} w-full`}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "70%" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className={`h-1 rounded-full ${stat.color.replace("text-", "bg-")}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-3">
            <p className="text-[10px] text-gray-400 mb-3">Revenue this month</p>
            <div className="flex items-end gap-1.5 h-16">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.04, duration: 0.4 }}
                  className={`flex-1 rounded-sm ${h >= 80 ? "bg-[#DE1010]" : "bg-[#DE1010]/20"}`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-[10px] text-gray-400 mb-2">Recent orders</p>
            <div className="space-y-1.5">
              {[
                { name: "Nike Air Max", amount: "₦45,000", status: "Completed", color: "bg-green-100 text-green-700" },
                { name: "Samsung Tab", amount: "₦120,000", status: "Pending", color: "bg-yellow-100 text-yellow-700" },
                { name: "Bluetooth Speaker", amount: "₦18,500", status: "Processing", color: "bg-blue-100 text-blue-700" },
              ].map((order, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: 0.7 + i * 0.1 }}
                  className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-600 truncate max-w-[90px]">{order.name}</span>
                  <span className="font-semibold text-[#0a0a0a]">{order.amount}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${order.color}`}>{order.status}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function About() {
  return (
    <section id="about" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-semibold text-[#DE1010] uppercase tracking-widest">What is Traqify</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3 mb-5 leading-tight">
              Your store, fully under control
            </h2>
            <p className="text-gray-500 text-base leading-relaxed mb-6">
              Traqify is a store management platform built for retail businesses that need structure. Whether you run a single shop or coordinate a growing team, it gives you the tools to manage products, track stock, process orders, and keep everyone on the same page.
            </p>
            <ul className="space-y-3 mb-8">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-[#DE1010] flex-shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
            <Button asChild className="gap-2">
              <Link href="/register">Start using Traqify <ArrowRight size={15} /></Link>
            </Button>
          </motion.div>

          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
