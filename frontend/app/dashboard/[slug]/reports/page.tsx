"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Mail, Users, Package, TrendingUp, ShoppingCart, UserCheck, Warehouse, FileText, X, Send, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorModal } from "@/components/shared/error-modal";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const reportTypes = [
  { id: "revenue",   label: "Revenue Report",      sub: "Total sales, revenue breakdown and order trends for any date range.",  icon: TrendingUp,  color: "bg-green-50 text-green-600",  pill: "Finance" },
  { id: "products",  label: "Products Report",      sub: "Product catalog, pricing, stock levels and performance summary.",      icon: Package,     color: "bg-blue-50 text-blue-600",    pill: "Catalog" },
  { id: "orders",    label: "Orders Report",        sub: "All orders with status, customer details and item breakdown.",         icon: ShoppingCart,color: "bg-purple-50 text-purple-600", pill: "Operations" },
  { id: "customers", label: "Customers Report",     sub: "Customer list with contact info, order history and lifetime value.",   icon: Users,       color: "bg-orange-50 text-orange-600", pill: "CRM" },
  { id: "inventory", label: "Inventory Report",     sub: "Current stock levels, low-stock alerts and reorder recommendations.", icon: Warehouse,   color: "bg-red-50 text-[#DE1010]",    pill: "Stock" },
  { id: "staff",     label: "Staff Report",         sub: "Team members, roles, access status and activity summary.",            icon: UserCheck,   color: "bg-gray-50 text-gray-600",    pill: "Team" },
  { id: "newsletter",label: "Newsletter Report",    sub: "All newsletter subscribers with email and subscription date.",       icon: AtSign,      color: "bg-indigo-50 text-indigo-600", pill: "Marketing" },
];

type ModalType = "download" | "email" | null;

export default function ReportsPage({ params }: { params: { slug: string } }) {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [emailTo, setEmailTo] = useState(user?.email || "");
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const openModal = (reportId: string, type: ModalType) => {
    setActiveReport(reportId);
    setModalType(type);
    setError("");
    setSuccess("");
  };
  const closeModal = () => { setActiveReport(null); setModalType(null); };

  const today = new Date().toISOString().split("T")[0];

  const downloadPDF = async () => {
    if (!activeReport) return;
    setLoading(true); setError("");
    try {
      const res = await api.get(`/api/reports/${activeReport}/pdf?from=${dateFrom}&to=${dateTo}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url; a.download = `${activeReport}-report-${dateFrom}-${dateTo}.pdf`; a.click();
      URL.revokeObjectURL(url);
      closeModal();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to generate PDF. Please try again.";
      setError(msg);
    }
    finally { setLoading(false); }
  };

  const emailReport = async () => {
    if (!activeReport || !emailTo) return;
    setLoading(true); setError("");
    try {
      await api.post(`/api/reports/${activeReport}/email`, { to: emailTo, from: dateFrom, to_date: dateTo });
      setSuccess(`Report sent to ${emailTo}.`);
      setTimeout(closeModal, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to send report. Please try again.";
      setError(msg);
    }
    finally { setLoading(false); }
  };

  const currentReport = reportTypes.find((r) => r.id === activeReport);

  return (
    <div>
      <Topbar title="Reports" slug={params.slug} />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Generate reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Download or email any report as a PDF. All reports reflect your current data.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {reportTypes.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${report.color}`}>
                  <report.icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#0a0a0a] text-sm">{report.label}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{report.pill}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{report.sub}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => openModal(report.id, "download")}>
                  <Download size={13} /> Download PDF
                </Button>
                <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => openModal(report.id, "email")}>
                  <Mail size={13} /> Email report
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Download / Email modal */}
      <AnimatePresence>
        {modalType && currentReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentReport.color}`}>
                    <currentReport.icon size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0a0a0a] text-sm">{modalType === "download" ? "Download" : "Email"} {currentReport.label}</h3>
                    <p className="text-xs text-gray-400">PDF format only</p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              {success ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><FileText size={20} className="text-green-600" /></div>
                  <p className="text-sm font-medium text-green-700">{success}</p>
                </div>
              ) : (
                <>
                  {error && <p className="text-xs text-[#DE1010] bg-red-50 px-3 py-2 rounded-md mb-4">{error}</p>}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">From date</Label>
                        <Input type="date" className="mt-1 text-sm" value={dateFrom} max={today} onChange={(e) => setDateFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">To date</Label>
                        <Input type="date" className="mt-1 text-sm" value={dateTo} max={today} onChange={(e) => setDateTo(e.target.value)} />
                      </div>
                    </div>
                    {modalType === "email" && (
                      <div>
                        <Label className="text-xs">Recipient email</Label>
                        <Input type="email" className="mt-1 text-sm" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="report@company.com" />
                      </div>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Button variant="outline" className="flex-1" onClick={closeModal} disabled={loading}>Cancel</Button>
                      <Button className="flex-1 gap-2" onClick={modalType === "download" ? downloadPDF : emailReport} disabled={loading}>
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : modalType === "download" ? <><Download size={14} /> Download</> : <><Send size={14} /> Send</>}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorModal isOpen={!!error && !modalType} onClose={() => setError("")} message={error} />
    </div>
  );
}