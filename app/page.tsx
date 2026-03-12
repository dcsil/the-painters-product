import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white p-4">
      {/* Technical Grid Background & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-1/4 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-emerald-500 opacity-10 blur-[100px]"></div>

      <main className="relative flex flex-col items-center text-center max-w-4xl z-10 w-full pt-16">

        {/* Wordmark */}
        <p
          className="text-slate-900 text-6xl tracking-[0.3em] mb-10"
          style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 300 }}
        >
          oversight
        </p>

        {/* Hero Typography */}
        <div className="space-y-6 mb-12">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-950">
            Trust, but <span className="font-serif italic text-slate-500 font-light">verify.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light">
            Monitor customer-facing AI conversations in real time — and audit past sessions for hallucinations, bias, and toxicity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto mb-20">
          <Link
            href="/chat"
            className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-md shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            {/* Chat bubble icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Launch Chatbot
          </Link>

          <Link
            href="/upload"
            className="flex-1 flex items-center justify-center gap-2 px-8 py-3.5 bg-white/80 hover:bg-slate-50 text-slate-900 font-medium rounded-md shadow-sm transition-all border border-slate-200 backdrop-blur-sm active:scale-95"
          >
            {/* Upload icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Logs
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">

          {/* Card 1 — Live Monitoring */}
          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Live Chat Monitoring
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Every assistant reply is checked for hallucinations and bias before it reaches the customer. When a violation is detected, the session stops automatically and a live agent is connected.
            </p>
          </div>

          {/* Card 2 — Multi-Category Analysis */}
          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Three-Category Safety Analysis
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Detect <span className="font-medium text-slate-800">hallucinations</span> (fabricated citations, contradictions, overconfidence), <span className="font-medium text-slate-800">bias</span> (gender, racial, age, stereotyping), and <span className="font-medium text-slate-800">toxicity</span> — powered by Gemini and Groq via an <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">LLM-as-a-judge</span> pipeline.
            </p>
          </div>

          {/* Card 3 — Dashboard & Alerts */}
          <div className="group bg-white/60 backdrop-blur-md p-8 rounded-xl shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 mb-6 group-hover:bg-slate-950 group-hover:text-white transition-colors text-slate-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-3 tracking-tight">
              Analyst Dashboard & Alerts
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Every session — live or uploaded — produces a tabbed dashboard with flagged turns, confidence scores, and LLM reasoning. Analysts are notified by email the moment a session ends or a violation fires.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
