import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">What we collect</h2>
            <p>We collect information you provide when creating an account, such as your name and email address. We also collect information about your usage of the platform, including products, orders, and inventory data you add to your organization.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">How we use your data</h2>
            <p>Your data is used solely to provide the Traqify service to you and your team. We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Data storage</h2>
            <p>All data is stored securely on Supabase infrastructure hosted on AWS in the EU West region. Passwords are hashed and never stored in plain text.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-[#0a0a0a] mb-3">Contact</h2>
            <p>For any privacy concerns, contact us at <a href="mailto:privacy@traqify.com" className="text-[#DE1010] hover:underline">privacy@traqify.com</a>.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
