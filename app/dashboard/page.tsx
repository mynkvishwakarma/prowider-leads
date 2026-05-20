"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Lead {
  leadId: number;
  customerName: string;
  city: string;
  phone: string;
  service: string;
  description: string;
  assignedAt: string;
}

interface Provider {
  id: number;
  name: string;
  monthlyQuota: number;
  leadsThisMonth: number;
  remainingQuota: number;
  leads: Lead[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [liveStatus, setLiveStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [recentEvent, setRecentEvent] = useState<string | null>(null);
  const eventRef = useRef<EventSource | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    setProviders(data);
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    eventRef.current = es;
    es.onopen = () => setLiveStatus("connected");
    es.onerror = () => setLiveStatus("disconnected");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "NEW_LEAD") {
        fetchData();
        setRecentEvent(`New lead: ${data.lead.customerName} (${data.lead.service}) → ${data.assignedProviders?.join(", ")}`);
        setTimeout(() => setRecentEvent(null), 6000);
      } else if (data.type === "QUOTA_RESET") {
        fetchData();
        setRecentEvent("All provider quotas reset to 10");
        setTimeout(() => setRecentEvent(null), 6000);
      } else if (data.type === "PROVIDER_QUOTA_RESET") {
        fetchData();
        setRecentEvent(`${data.providerName} quota reset to 10`);
        setTimeout(() => setRecentEvent(null), 6000);
      }
    };
    return () => es.close();
  }, [fetchData]);

  const selectedProvider = providers.find((p) => p.id === selected) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Provider Dashboard</h1>
          <div className="flex items-center gap-4">
            {lastUpdate && <span className="text-slate-500 text-xs hidden sm:block">Updated {lastUpdate}</span>}
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              liveStatus === "connected" ? "bg-emerald-900/30 border-emerald-500/30 text-emerald-400"
              : liveStatus === "connecting" ? "bg-yellow-900/30 border-yellow-500/30 text-yellow-400"
              : "bg-red-900/30 border-red-500/30 text-red-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveStatus === "connected" ? "bg-emerald-400 animate-pulse" : liveStatus === "connecting" ? "bg-yellow-400" : "bg-red-400"}`} />
              {liveStatus === "connected" ? "Live" : liveStatus === "connecting" ? "Connecting" : "Offline"}
            </div>
          </div>
        </div>
      </div>

      {recentEvent && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm max-w-sm border border-blue-400/30">
          🔔 {recentEvent}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Providers ({providers.length})</h2>
              {providers.map((p) => {
                const pct = Math.round((p.leadsThisMonth / p.monthlyQuota) * 100);
                const isFull = p.remainingQuota === 0;
                return (
                  <button key={p.id} id={`provider-${p.id}`}
                    onClick={() => setSelected(selected === p.id ? null : p.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      selected === p.id ? "bg-blue-600/20 border-blue-500/50" : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50"
                    }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isFull ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                          {p.id}
                        </div>
                        <span className="font-medium text-white">{p.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isFull ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {isFull ? "Full" : `${p.remainingQuota} left`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{p.leadsThisMonth} leads this month</span>
                      <span>{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2">
              {selectedProvider ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">{selectedProvider.name} — Leads</h2>
                    <div className="flex gap-3 text-sm">
                      <span className="bg-slate-700/50 px-3 py-1 rounded-lg text-slate-300">{selectedProvider.leadsThisMonth}/{selectedProvider.monthlyQuota} used</span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">{selectedProvider.remainingQuota} remaining</span>
                    </div>
                  </div>
                  {selectedProvider.leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-800/30 rounded-xl border border-slate-700/30">
                      <p className="text-slate-500">No leads assigned this month</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {selectedProvider.leads.map((lead) => (
                        <div key={`${lead.leadId}-${lead.assignedAt}`} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-semibold text-white">{lead.customerName}</span>
                              <span className="text-slate-500 text-sm ml-2">#{lead.leadId}</span>
                            </div>
                            <span className="text-xs bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">{lead.service}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                            <span>📍 {lead.city}</span>
                            <span>📞 {lead.phone}</span>
                          </div>
                          <p className="text-slate-500 text-sm mt-2 line-clamp-2">{lead.description}</p>
                          <p className="text-slate-600 text-xs mt-2">Assigned: {new Date(lead.assignedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-800/20 rounded-xl border border-slate-700/30 border-dashed">
                  <p className="text-slate-500 text-lg mb-1">Select a provider</p>
                  <p className="text-slate-600 text-sm">Click any provider card to view their assigned leads</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
