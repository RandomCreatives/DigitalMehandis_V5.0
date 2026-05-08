import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1F4E79] to-[#2d6fa8] flex flex-col items-center justify-center text-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">EthioQS</h1>
        <p className="text-xl text-blue-100">
          Free, open-source Quantity Surveying tool for Ethiopian construction professionals, students, and contractors.
        </p>
        <ul className="text-blue-200 text-sm space-y-1 text-left inline-block">
          <li>✅ Upload PDF drawings & measure quantities</li>
          <li>✅ Generate BOQ in Ethiopian MoUDC format</li>
          <li>✅ Bar Bending Schedule (BBS) with auto calculations</li>
          <li>✅ Export to Excel & PDF</li>
          <li>✅ Pre-loaded Ethiopian material rates</li>
        </ul>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/auth/register" className="bg-white text-[#1F4E79] font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
            Get Started Free
          </Link>
          <Link href="/auth/login" className="border border-white text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
            Sign In
          </Link>
        </div>
        <p className="text-blue-300 text-xs pt-4">GNU GPL v3 — Free forever, self-hostable</p>
      </div>
    </main>
  );
}
