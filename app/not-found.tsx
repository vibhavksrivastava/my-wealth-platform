import Link from "next/link";
import { Building2, ArrowLeft, LogIn, Globe } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-sky-500 selection:text-white">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl space-y-6">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <Building2 className="h-8 w-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
            404 &bull; Workspace Not Found
          </span>
          <h1 className="text-xl font-bold text-white mt-3 tracking-tight">
            Advisory Workspace Not Found
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The advisory practice subdomain or page you requested does not exist or may be inactive.
          </p>
        </div>

        {/* Practice Quick Links */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left space-y-2">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-sky-400" />
            <span>Available Tenant Practices</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/zenith9186"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 font-semibold transition text-center"
            >
              🔵 Zenith Wealth
            </Link>
            <Link
              href="/aasinvestment"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-semibold transition text-center"
            >
              🟢 AAS Investment
            </Link>
            <Link
              href="/apex"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-400 font-semibold transition text-center"
            >
              🟣 Apex Partners
            </Link>
            <Link
              href="/platform"
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-semibold transition text-center"
            >
              🟡 Platform HQ
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Platform Home</span>
          </Link>
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In to Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
