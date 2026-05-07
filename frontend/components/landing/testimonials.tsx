"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
  { name: "Adaeze Okonkwo", role: "Store Owner, Lagos", text: "Traqify transformed how we manage our 3 branches. Real-time inventory across all locations is a game changer.", rating: 5 },
  { name: "Emeka Nwosu", role: "Operations Manager, Abuja", text: "The RBAC system is excellent. I can give each staff exactly the access they need. No more accidental deletions!", rating: 5 },
  { name: "Fatima Al-Hassan", role: "Retail Entrepreneur, Kano", text: "Setup took less than 10 minutes. The dashboard is beautiful and my team loves it. Highly recommended.", rating: 5 },
  { name: "Tunde Adeyemi", role: "CEO, Ibadan Foods", text: "The audit logs alone justify the subscription. I know exactly what every staff member did and when.", rating: 5 },
  { name: "Ngozi Eze", role: "Shop Manager, Port Harcourt", text: "Customer management is fantastic. We keep full purchase history and it helps us reward loyal customers.", rating: 5 },
  { name: "Babatunde Olawale", role: "Business Owner, Lagos", text: "Processing orders is so fast now. Our cashiers love the simple POS interface. 10/10 product.", rating: 5 },
  { name: "Chisom Obi", role: "Accountant, Enugu", text: "The reports section gives me everything I need for month-end reconciliation. No more spreadsheet headaches.", rating: 5 },
  { name: "Ibrahim Musa", role: "Franchise Manager, Kaduna", text: "Managing multiple locations from one dashboard is exactly what we needed. Traqify delivers perfectly.", rating: 5 },
  { name: "Blessing Afolabi", role: "Boutique Owner, Benin City", text: "Low-stock alerts have saved us countless times. We never run out of bestsellers anymore.", rating: 5 },
  { name: "Oluwaseun Akinde", role: "Supply Chain Lead, Ogun", text: "The inventory management is robust. Linking products to orders and seeing real-time stock is brilliant.", rating: 5 },
];

const row1 = testimonials.slice(0, 5);
const row2 = testimonials.slice(5);

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-72 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mx-3">
      <div className="flex items-center gap-0.5 mb-3">
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} size={12} fill="#DE1010" className="text-[#DE1010]" />
        ))}
      </div>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <Image
          src="/avatar-testimonial.png"
          alt={t.name}
          width={36}
          height={36}
          className="w-9 h-9 rounded-full object-cover bg-gray-100"
        />
        <div>
          <p className="font-semibold text-[#0a0a0a] text-sm">{t.name}</p>
          <p className="text-gray-400 text-xs">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

function ScrollingRow({ items, direction }: { items: typeof testimonials; direction: "left" | "right" }) {
  const doubled = [...items, ...items];
  const cls = direction === "left" ? "animate-scroll-left" : "animate-scroll-right";

  return (
    <div className="relative overflow-hidden group">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />
      <div
        className={`flex py-3 ${cls} group-hover:[animation-play-state:paused]`}
        style={{ width: "max-content" }}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={i} t={t} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-gray-50 py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs font-semibold text-[#DE1010] uppercase tracking-widest"
        >
          What our users say
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3"
        >
          Loved by store owners across Africa
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 mt-3 max-w-lg mx-auto"
        >
          Over 500 businesses trust Traqify to manage their operations every day.
        </motion.p>
      </div>

      <div className="space-y-4">
        <ScrollingRow items={row1} direction="left" />
        <ScrollingRow items={row2} direction="right" />
      </div>
    </section>
  );
}
