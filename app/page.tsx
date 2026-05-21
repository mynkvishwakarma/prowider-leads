import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-6">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Book My Packers</h1>
        <p className="text-slate-400 text-lg mb-10">Mini Lead Distribution System</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link href="/request-service" id="navRequestService"
            className="group bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-xl p-5 transition-all duration-200 text-left">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-all">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-white font-semibold mb-1">Request Service</h2>
            <p className="text-slate-500 text-sm">Submit a service enquiry as a customer</p>
          </Link>

          <Link href="/dashboard" id="navDashboard"
            className="group bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-emerald-500/10 rounded-xl p-5 transition-all duration-200 text-left">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-500/30 transition-all">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-white font-semibold mb-1">Dashboard</h2>
            <p className="text-slate-500 text-sm">Real-time provider lead dashboard</p>
          </Link>

          <Link href="/test-tools" id="navTestTools"
            className="group bg-slate-800/60 border border-slate-700/50 hover:border-purple-500/50 hover:bg-purple-500/10 rounded-xl p-5 transition-all duration-200 text-left">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-all">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className="text-white font-semibold mb-1">Test Tools</h2>
            <p className="text-slate-500 text-sm">Webhook simulation &amp; stress testing</p>
          </Link>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 text-left text-sm text-slate-400">
          <p className="font-semibold text-slate-300 mb-2">System Rules</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Service 1 → Provider 1 (mandatory) + 2 from pool [2,3,4]</li>
            <li>Service 2 → Provider 5 (mandatory) + 2 from pool [6,7,8]</li>
            <li>Service 3 → Provider 1+4 (mandatory) + 1 from pool [2,3,5,6,7,8]</li>
            <li>Fair round-robin allocation • Monthly quota: 10 per provider</li>
            <li>Duplicate: same phone + same service is blocked at DB level</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
