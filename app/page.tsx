import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4">
      {/* Technical Grid Background & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-1/4 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-emerald-500 opacity-10 blur-[100px]"></div>

      <main className="relative flex flex-col items-center text-center max-w-4xl z-10 w-full">
        
        {/* Oversight Brand Badge */}
        <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-slate-800 mb-8 shadow-sm">
          <span className="relative flex h-2 w-2 mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-widest uppercase text-xs">Oversight Auditing Engine</span>
        </div>

        {/* Hero Typography */}
        <div className="space-y-6 mb-12">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-950">
            Trust, but <span className="font-serif italic text-slate-500 font-light">verify.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
            Independent, executive-ready safety auditing for live conversational AI.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto mb-20">
          <Link
            href="/upload"
            className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-md shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Audit New Data
          </Link>

          <Link
            href="/uploads"
            className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-white/80 hover:bg-slate-50 text-slate-900 font-medium rounded-md shadow-sm transition-all border border-slate-200 backdrop-blur-sm active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Audit History
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Hallucination Detection
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Identify inaccurate or fabricated info backed by state-of-the-art <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">LLM-as-a-judge</span> architecture.
            </p>
          </div>

          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path></svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Systemic Fallbacks
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Scrub PII and identify exact numerical hallucinations via precise traditional NLP matching.
            </p>
          </div>

          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Executive Readiness
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Transform raw JSON traces into actionable, boardroom-ready assurance metrics.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
