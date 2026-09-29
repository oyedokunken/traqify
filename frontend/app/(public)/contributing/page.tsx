"use client";

import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { motion } from "framer-motion";
import { Users, Code2, Terminal, FileText, GitBranch, CheckCircle2, AlertTriangle, Bug } from "lucide-react";

export default function ContributingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-[#DE1010] py-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <nav className="flex items-center justify-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-white">Contributing</span>
            </nav>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Contributing to Traqify</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Thank you for your interest in contributing! This guide covers everything you need to set up a development environment, follow project conventions, and submit quality pull requests.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8 py-16">

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Users className="w-6 h-6 text-[#DE1010]" />
            Getting Started
          </h2>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
            <h3 className="font-medium text-[#0a0a0a] mb-3">Prerequisites</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Tool</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[#0a0a0a]">Min version</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">Node.js</td>
                    <td className="px-4 py-3 text-sm text-gray-600">18.x</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-600">npm</td>
                    <td className="px-4 py-3 text-sm text-gray-600">9.x</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-600">PostgreSQL</td>
                    <td className="px-4 py-3 text-sm text-gray-600">14+ (or Supabase project)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { step: 1, title: "Fork and clone", code: "git clone https://github.com/<your-username>/traqify.git\ncd traqify" },
              { step: 2, title: "Install dependencies", code: "cd backend && npm install\ncd ../frontend && npm install" },
              { step: 3, title: "Configure environment", code: "# Backend\ncp backend/.env.example backend/.env\n# Frontend\ncp frontend/.env.example frontend/.env.local" },
              { step: 4, title: "Run database migrations", code: "cd backend\nnpx prisma migrate dev\nnpx prisma generate" },
              { step: 5, title: "Start dev servers", code: "# Terminal 1 — backend (port 5000)\ncd backend && npm run dev\n\n# Terminal 2 — frontend (port 3000)\ncd frontend && npm run dev" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#DE1010]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#DE1010] font-semibold text-sm">{item.step}</span>
                  </div>
                  <h3 className="font-medium text-[#0a0a0a]">{item.title}</h3>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{item.code}</code>
                </pre>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Code2 className="w-6 h-6 text-[#DE1010]" />
            Code Conventions
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Code2, title: "TypeScript", desc: "TypeScript everywhere, no any types unless unavoidable" },
              { icon: FileText, title: "Functional Components", desc: "React class components are not used" },
              { icon: FileText, title: "Named Exports", desc: "Prefer named exports over default exports for components" },
              { icon: Terminal, title: "Tailwind CSS", desc: "All styling via Tailwind utility classes" },
            ].map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 + index * 0.05 }} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
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

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-[#DE1010]" />
            Commit Messages
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <p className="text-gray-600 leading-relaxed mb-4">
              Follow the Conventional Commits spec:
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm mb-6">
              <code>&lt;type&gt;(&lt;scope&gt;): &lt;short description&gt;</code>
            </pre>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { type: "feat", desc: "New feature" },
                { type: "fix", desc: "Bug fix" },
                { type: "docs", desc: "Documentation only" },
                { type: "style", desc: "Formatting, no logic change" },
                { type: "refactor", desc: "Code restructure, no feature/fix" },
                { type: "chore", desc: "Dependency updates, build scripts" },
              ].map((item, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                  <code className="text-sm font-medium text-[#DE1010]">{item.type}</code>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }} className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#DE1010]" />
            Pull Request Process
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <ul className="space-y-3">
              {[
                "Title: use the same Conventional Commits format as your commit messages",
                "Description: include what changed, why, and how to test it",
                "TypeScript must compile: both backend and frontend tsc --noEmit must pass",
                "No breaking schema changes without a migration file",
                "One concern per PR: split large features into reviewable chunks",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#DE1010] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1 }}>
          <h2 className="text-2xl font-semibold text-[#0a0a0a] mb-6 flex items-center gap-3">
            <Bug className="w-6 h-6 text-[#DE1010]" />
            Reporting Bugs
          </h2>
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <p className="text-gray-600 leading-relaxed mb-4">
              Open a GitHub issue with:
            </p>
            <ul className="space-y-2">
              {[
                "Environment (OS, Node version, browser)",
                "Steps to reproduce",
                "Expected vs actual behaviour",
                "Screenshots if applicable",
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#DE1010] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              For security vulnerabilities, see the <a href="/security" className="text-[#DE1010] hover:underline">Security Policy</a> page.
            </p>
          </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  );
}
