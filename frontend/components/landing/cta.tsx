"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="bg-[#DE1010] py-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
        >
          <Zap size={11} fill="white" />
          Get started for free
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight"
        >
          Ready to take control of your store?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-white/80 text-lg mb-10 max-w-2xl mx-auto"
        >
          Join hundreds of businesses using Traqify to manage products, track orders, and run their operations with clarity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Button
            size="lg"
            asChild
            className="bg-white text-[#DE1010] hover:bg-gray-50 gap-2 h-12 px-8 text-base font-semibold shadow-lg"
          >
            <Link href="/register">
              Get started free <ArrowRight size={16} />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="border-white text-white bg-transparent hover:bg-white hover:text-[#DE1010] h-12 px-8 text-base transition-colors"
          >
            <Link href="/login">Sign in</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
