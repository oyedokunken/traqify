"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Is Traqify free to use?",
    a: "You can sign up and start using Traqify right away at no cost. Create your organization, add products, and start managing orders immediately.",
  },
  {
    q: "How many staff members can I invite?",
    a: "You can invite as many staff members as you need. Each gets a role � Manager, Cashier, or Auditor � with access scoped to what they actually need.",
  },
  {
    q: "Can I manage multiple store locations?",
    a: "Yes. You can create separate organizations for different branches, each fully isolated with their own products, orders, staff, and reports.",
  },
  {
    q: "How does the public store page work?",
    a: "Every organization gets a public catalog at traqify.com/store/your-slug. Customers browse and place orders without creating an account, and get a confirmation email.",
  },
  {
    q: "Is my data secure?",
    a: "All data travels over TLS and is stored on Supabase infrastructure (hosted on AWS). Passwords are hashed with bcrypt. We do not sell your data to anyone.",
  },
  {
    q: "Can I export reports?",
    a: "Yes. Reports can be printed as PDF directly from the browser, complete with your organization name and branding.",
  },
  {
    q: "What payment methods are supported?",
    a: "Customers can select Bank Transfer, Cash on Delivery, or Card. Order confirmation emails go out automatically with the relevant payment details.",
  },
  {
    q: "Does Traqify work on mobile?",
    a: "The dashboard is fully responsive and works well on phones and tablets. A dedicated mobile app is on the roadmap.",
  },
];

function FAQItem({ faq, index, open, setOpen }: {
  faq: { q: string; a: string };
  index: number;
  open: number | null;
  setOpen: (i: number | null) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }} transition={{ delay: index * 0.05 }}
      className="border border-gray-200 rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(open === index ? null : index)}>
        <span className="font-semibold text-[#0a0a0a] text-sm pr-4">{faq.q}</span>
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          {open === index ? <Minus size={12} /> : <Plus size={12} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open === index && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden">
            <p className="px-5 pb-5 text-gray-500 text-sm leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const col1 = faqs.slice(0, 4);
  const col2 = faqs.slice(4);

  return (
    <section id="faq" className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="inline-flex items-center bg-[#DE1010]/10 text-[#DE1010] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#DE1010]/20 mb-3">
            FAQs
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-[#0a0a0a] mt-3">
            Frequently asked questions
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-3">
            {col1.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} open={open} setOpen={setOpen} />
            ))}
          </div>
          <div className="space-y-3">
            {col2.map((faq, i) => (
              <FAQItem key={i + 4} faq={faq} index={i + 4} open={open} setOpen={setOpen} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
