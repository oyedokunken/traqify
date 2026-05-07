import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-[#DE1010] mb-4">404</p>
        <h1 className="text-2xl font-bold text-[#0a0a0a] mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 bg-[#DE1010] text-white rounded-lg font-medium hover:bg-[#c00d0d] transition-colors text-sm"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
