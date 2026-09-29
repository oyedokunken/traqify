"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { Shield, Lock, Mail, CheckCircle2, AlertTriangle, Key, Globe, Upload, FileText, Eye, Database } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Security</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Security Policy</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Learn about our security practices, supported versions, and how to report vulnerabilities.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#DE1010]" />
            Supported Versions
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Version</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Supported</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.20.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.19.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">1.18.x</td>
                    <td className="px-4 py-3 text-sm"><CheckCircle2 className="w-4 h-4 text-green-600 inline" /></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">&lt; 1.18</td>
                    <td className="px-4 py-3 text-sm text-gray-400">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-[#DE1010]" />
            Reporting a Vulnerability
          </h2>
          <div className="bg-red-50 p-6 rounded-xl border border-red-200">
            <p className="text-gray-700 leading-relaxed mb-4">
              Please do not open a public GitHub issue for security vulnerabilities.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Email security reports to: <strong>security@traqify.com</strong> or reach the maintainer via <a href="https://github.com/oyedokunken" target="_blank" rel="noopener noreferrer" className="text-[#DE1010] hover:underline">@oyedokunken</a>.
            </p>
            <p className="text-gray-700 leading-relaxed mb-2 font-medium">Include:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>A clear description of the vulnerability</li>
              <li>Steps to reproduce</li>
              <li>Potential impact assessment</li>
              <li>Any suggested fix (optional)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              You will receive an acknowledgement within 48 hours and a full response within 7 days.
            </p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Key className="w-6 h-6 text-[#DE1010]" />
            Authentication
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Lock, title: "JWT Access Tokens", desc: "Short-lived (15 min), signed with JWT_SECRET, stored in localStorage" },
              { icon: Key, title: "Refresh Tokens", desc: "Long-lived (7 days), stored alongside access tokens" },
              { icon: Globe, title: "Google OAuth 2.0", desc: "Handled server-side via redirect flow" },
              { icon: Mail, title: "OTP Email Verification", desc: "Required before account activation; expires after 10 minutes" },
              { icon: Shield, title: "Password Hashing", desc: "All passwords hashed with bcrypt (cost factor 12)" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#DE1010]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#DE1010]" />
            Authorization (RBAC)
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <p className="text-gray-600 leading-relaxed mb-4">
              Four roles with descending privilege: OWNER &gt; MANAGER &gt; CASHIER &gt; AUDITOR
            </p>
            <ul className="space-y-2">
              {[
                "Route-level enforcement via authenticate and RBAC Express middleware",
                "All authenticated routes require a valid JWT; expired tokens are rejected with 401",
                "Organization scope is enforced on every query",
                "OWNER protection: the OWNER account cannot be restricted, removed, or have their password reset",
                "Invite role cap: OWNER role can never be assigned via invitation",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#DE1010] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#DE1010]" />
            Additional Security Measures
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Globe, title: "CORS", desc: "Configured with explicit FRONTEND_URL allowlist" },
              { icon: Upload, title: "File Uploads", desc: "Multer memoryStorage, type restrictions, size limits" },
              { icon: FileText, title: "Input Validation", desc: "Zod schemas on all backend requests" },
              { icon: Eye, title: "Audit Logging", desc: "Every create/update/delete action logged" },
              { icon: Database, title: "Environment Variables", desc: "Sensitive values never committed to repository" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#DE1010]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#DE1010]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#0a0a0a] mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
