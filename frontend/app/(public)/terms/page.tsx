import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: January 2025</p>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Acceptance of terms</h2>
            <p>By accessing or using Traqify, you agree to be bound by these terms. If you do not agree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Use of the service</h2>
            <p>You may use Traqify for lawful business purposes only. You are responsible for all activity that occurs under your account. You must not use the service to store or transmit illegal content.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Availability</h2>
            <p>We aim to keep Traqify available at all times but cannot guarantee uninterrupted service. We reserve the right to modify or discontinue the service with reasonable notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Limitation of liability</h2>
            <p>Traqify is provided as-is. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Contact</h2>
            <p>For legal enquiries, contact us at <a href="mailto:legal@traqify.com" className="text-[#DE1010] hover:underline">legal@traqify.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
