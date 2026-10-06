"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { FileText, CheckCircle2 } from "lucide-react";

export default function LicensePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">License</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">License</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Traqify is open source software under the MIT License.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-gray-50 p-8 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">MIT License</h2>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            Copyright (c) 2025 Oyedokun Kehinde
          </p>

          <p className="text-gray-600 leading-relaxed mb-6">
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
          </p>

          <p className="text-gray-600 leading-relaxed mb-6">
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </p>

          <p className="text-gray-600 leading-relaxed">
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-8 bg-[#DE1010]/5 p-6 rounded-xl border border-[#DE1010]/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#DE1010] flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 text-sm">
              This license allows you to freely use, modify, and distribute this software for both commercial and non-commercial purposes, as long as you include the original copyright and license notice in any copies or substantial portions of the software.
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
