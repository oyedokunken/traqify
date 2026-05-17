"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const fadeRight = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } };

export function Hero() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 pt-24 pb-16 flex items-center">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#DE1010]/10 text-[#DE1010] text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-[#DE1010]/20">
              <Star size={11} fill="currentColor" />
              Built for modern retail teams
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0a0a0a] leading-tight tracking-tight mb-6">
              Run your store{" "}
              <span className="text-[#DE1010] relative">
                smarter
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6 Q100 2 198 6" stroke="#DE1010" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
                </svg>
              </span>
              {" "}with Traqify
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-500 text-lg leading-relaxed mb-8 max-w-lg">
              Store management built for growing businesses. Track inventory, process orders, manage staff, and see exactly what is happening across your operations.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
              <Button size="lg" asChild className="gap-2 h-12 px-7 text-base">
                <Link href="/register">
                  Start for free <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 px-7 text-base">
                <Link href="/login">Sign in</Link>
              </Button>
            </motion.div>

          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeRight}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative order-first lg:order-last mx-3 sm:mx-0"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-[#DE1010]/10 to-transparent rounded-3xl" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 h-full min-h-[360px]">
              <Image
                src="/img-hero.jpg"
                alt="Traqify dashboard preview"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold text-xs">↑</span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Revenue this month</p>
                <p className="font-bold text-[#0a0a0a] text-sm">₦2,400,000</p>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3"
            >
              <p className="text-xs text-gray-400 mb-1">Orders today</p>
              <p className="font-bold text-[#0a0a0a]">48 <span className="text-green-500 text-xs font-medium">+12%</span></p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
