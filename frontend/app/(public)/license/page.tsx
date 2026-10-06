"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, XCircle, Github, Globe, Mail } from "lucide-react";

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
              Traqify is open source software released under the MIT License. You are free to use, modify, and distribute it.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        {/* MIT License text */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-gray-50 p-8 rounded-xl border border-gray-200 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#DE1010]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#DE1010]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0a0a0a]">MIT License</h2>
          </div>

          <p className="text-gray-600 leading-relaxed mb-6">
            Copyright (c) 2025-2026 Oyedokun Kehinde
          </p>

          <p className="text-gray-600 leading-relaxed mb-6">
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
          </p>

          <p className="text-gray-600 leading-relaxed mb-6">
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </p>

          <p className="text-gray-600 leading-relaxed">
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </p>
        </motion.div>

        {/* What you can / cannot do */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <h3 className="font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              You are free to
            </h3>
            <ul className="space-y-2">
              {[
                "Use Traqify privately or commercially",
                "Modify the source code for your own needs",
                "Distribute original or modified copies",
                "Sublicense to others",
                "Use it as a base for a SaaS product",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <h3 className="font-semibold text-[#0a0a0a] mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              You must
            </h3>
            <ul className="space-y-2">
              {[
                "Include the original copyright notice in all copies",
                "Include the MIT license text in distributions",
                "Not hold the author liable for any damages",
                "Not remove attribution from source files",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Author */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-[#DE1010]/5 p-6 rounded-xl border border-[#DE1010]/20">
          <h3 className="font-semibold text-[#0a0a0a] mb-4">Author</h3>
          <p className="text-gray-700 text-sm mb-4">
            Traqify was designed and built by Oyedokun Kehinde, a software engineer focused on full-stack TypeScript systems, multi-tenant SaaS architecture, and developer tooling.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="https://www.oyedokun.dev/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#DE1010] hover:underline">
              <Globe className="w-4 h-4" />
              oyedokun.dev
            </a>
            <a href="https://github.com/oyedokunken" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#DE1010] hover:underline">
              <Github className="w-4 h-4" />
              @oyedokunken
            </a>
            <a href="mailto:oyedokunken@gmail.com"
              className="flex items-center gap-2 text-sm text-[#DE1010] hover:underline">
              <Mail className="w-4 h-4" />
              oyedokunken@gmail.com
            </a>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
