import { Navbar } from "@/components/shared/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoScroller } from "@/components/landing/logo-scroller";
import { About } from "@/components/landing/about";
import { Features } from "@/components/landing/features";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WhyTraqify } from "@/components/landing/why-traqify";
import { Testimonials } from "@/components/landing/testimonials";
import { Everything } from "@/components/landing/everything";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/shared/footer";

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <LogoScroller />
      <About />
      <Features />
      <Stats />
      <HowItWorks />
      <WhyTraqify />
      <Testimonials />
      <Everything />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
