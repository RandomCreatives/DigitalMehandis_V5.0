import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-primary flex flex-col items-center justify-center text-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <div>
          <p className="text-label-caps text-white/50 uppercase tracking-widest mb-2">Ethiopian Construction Platform</p>
          <h1 className="text-5xl font-bold tracking-tight">Ethio-QS Engine</h1>
          <p className="text-lg text-white/60 mt-2">Quantity Surveying Pro</p>
        </div>
        <p className="text-white/80 text-base leading-relaxed">
          Free, open-source Quantity Surveying tool for Ethiopian construction professionals, students, and contractors. Following MoUDC standards.
        </p>
        <ul className="text-white/60 text-sm space-y-1.5 text-left inline-block">
          {["Upload PDF drawings & measure quantities","Generate BOQ in Ethiopian MoUDC format","Bar Bending Schedule (BBS) with auto calculations","Export to Excel & PDF","Pre-loaded Ethiopian material rates"].map((f) => (
            <li key={f} className="flex items-center gap-2"><span className="text-accent">✓</span> {f}</li>
          ))}
        </ul>
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/auth/register" className="bg-accent hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">Get Started Free</Link>
          <Link href="/auth/login" className="border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">Sign In</Link>
        </div>
        <p className="text-white/30 text-xs pt-2">GNU GPL v3 — Free forever, self-hostable</p>
      </div>
    </main>
  );
}
