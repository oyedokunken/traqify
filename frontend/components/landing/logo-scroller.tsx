"use client";

const brands = [
  "Shoprite Nigeria", "Jumia Foods", "Konga Mart", "PayStack Stores",
  "Flutterwave Shop", "VBank Retail", "PiggyVest", "Interswitch",
  "GTBank SME", "Access Bank Business", "Zenith Merchant", "UBA Africa",
  "Bolt Foods", "Glovo NG", "Chowdeck", "Nomba POS",
];

export function LogoScroller() {
  const doubled = [...brands, ...brands];
  return (
    <section className="bg-[#0a0a0a] py-10 overflow-hidden">
      <p className="text-center text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">
        Trusted by fast-growing businesses
      </p>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 animate-scroll-left" style={{ width: "max-content" }}>
          {doubled.map((brand, i) => (
            <div key={i} className="flex-shrink-0 h-10 px-5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">{brand}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
