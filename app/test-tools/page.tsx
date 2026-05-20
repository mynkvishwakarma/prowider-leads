"use client";

import { useState, useEffect } from "react";

interface Result {
  label: string;
  status: "success" | "error" | "warning";
  data: unknown;
}

interface Provider {
  id: number;
  name: string;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function TestToolsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<unknown[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      const res = await fetch("/api/services"); // We'll use dashboard API to get providers
      // Actually, let's fetch from dashboard which has provider data
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setProviders(data.map((p: any) => ({ id: p.id, name: p.name })));
          if (data.length > 0) setSelectedProvider(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch providers:", err);
      }
    };
    fetchProviders();
  }, []);

  const addResult = (label: string, status: Result["status"], data: unknown) => {
    setResults((prev) => [{ label, status, data }, ...prev].slice(0, 20));
  };

  const resetQuota = async (key?: string) => {
    const idempotencyKey = key ?? uid();
    setLoading("reset");
    const res = await fetch("/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "QUOTA_RESET", idempotencyKey }),
    });
    const data = await res.json();
    addResult(
      `Quota Reset (key: ${idempotencyKey.slice(0, 8)}...)`,
      data.idempotent ? "warning" : "success",
      data
    );
    setLoading(null);
    return idempotencyKey;
  };

  const resetIndividualProvider = async () => {
    if (!selectedProvider) {
      addResult("Error", "error", { message: "No provider selected" });
      return;
    }
    const idempotencyKey = uid();
    setLoading("resetIndividual");
    const res = await fetch("/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "PROVIDER_QUOTA_RESET",
        providerId: selectedProvider,
        idempotencyKey,
      }),
    });
    const data = await res.json();
    const providerName =
      providers.find((p) => p.id === selectedProvider)?.name || `Provider ${selectedProvider}`;
    addResult(
      `${providerName} Quota Reset (key: ${idempotencyKey.slice(0, 8)}...)`,
      data.idempotent ? "warning" : "success",
      data
    );
    setLoading(null);
  };

  const testIndividualIdempotency = async () => {
    if (!selectedProvider) {
      addResult("Error", "error", { message: "No provider selected" });
      return;
    }
    setLoading("individualIdempotency");
    const sharedKey = uid();
    const providerName =
      providers.find((p) => p.id === selectedProvider)?.name || `Provider ${selectedProvider}`;
    addResult(
      `Starting individual provider idempotency test: ${providerName} (key: ${sharedKey.slice(0, 8)}...)`,
      "success",
      {}
    );
    // Call webhook 3 times with same key for the same provider
    for (let i = 0; i < 3; i++) {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "PROVIDER_QUOTA_RESET",
          providerId: selectedProvider,
          idempotencyKey: sharedKey,
        }),
      });
      const data = await res.json();
      addResult(
        `${providerName} Call ${i + 1}/3 (same key)`,
        data.idempotent ? "warning" : "success",
        data
      );
    }
    setLoading(null);
  };

  const generateBulkLeads = async () => {
    setLoading("bulk");
    const res = await fetch("/api/test-tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "BULK_LEADS", count: 10 }),
    });
    const data = await res.json();
    const successes = data.results?.filter((r: { success: boolean }) => r.success).length ?? 0;
    const failures = (data.results?.length ?? 0) - successes;
    addResult(
      `Bulk 10 Leads — ${successes} created, ${failures} failed`,
      failures > 0 ? "warning" : "success",
      data
    );
    setLoading(null);
  };

  const fetchWebhookLog = async () => {
    setLoading("log");
    const res = await fetch("/api/webhook");
    const data = await res.json();
    setWebhookLog(data);
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-lg font-bold">⚗️ Test Tools</h1>
          <p className="text-slate-500 text-sm">Simulate webhooks, concurrency, and idempotency</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Actions</h2>

          {/* Reset Quota */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🔄</span>
              <div>
                <h3 className="font-semibold text-white">Reset All Provider Quotas</h3>
                <p className="text-slate-400 text-sm mt-0.5">Simulates payment gateway confirming subscription renewal. Sets all quotas back to 10.</p>
              </div>
            </div>
            <button
              id="resetQuotaBtn"
              onClick={() => resetQuota()}
              disabled={loading !== null}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              {loading === "reset" ? "Resetting..." : "Reset All Quotas to 10"}
            </button>
          </div>

          {/* Reset Individual Provider Quota */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">👤</span>
              <div>
                <h3 className="font-semibold text-white">Reset Individual Provider Quota</h3>
                <p className="text-slate-400 text-sm mt-0.5">Resets quota for a specific provider when they renew their individual subscription.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <select
                value={selectedProvider ?? ""}
                onChange={(e) => setSelectedProvider(parseInt(e.target.value))}
                disabled={loading !== null || providers.length === 0}
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
              >
                <option value="">Select a provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Provider {p.id})
                  </option>
                ))}
              </select>
              <button
                id="resetIndividualBtn"
                onClick={resetIndividualProvider}
                disabled={loading !== null || !selectedProvider}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
              >
                {loading === "resetIndividual" ? "Resetting..." : "Reset Selected Provider"}
              </button>
              <button
                id="testIndividualIdempotencyBtn"
                onClick={testIndividualIdempotency}
                disabled={loading !== null || !selectedProvider}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
              >
                {loading === "individualIdempotency" ? "Testing..." : "Test Idempotency (3× Same Provider)"}
              </button>
            </div>
          </div>

          {/* Idempotency Test */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🔁</span>
              <div>
                <h3 className="font-semibold text-white">Test All Webhooks Idempotency</h3>
                <p className="text-slate-400 text-sm mt-0.5">Calls the webhook 3 times with the same idempotency key. Only the first call should apply changes.</p>
              </div>
            </div>
            <button
              id="testIdempotencyBtn"
              onClick={() => {
                setLoading("idempotency");
                const sharedKey = uid();
                addResult("Starting all-provider idempotency test with key: " + sharedKey.slice(0, 8) + "...", "success", {});
                // Call webhook 3 times with same key
                (async () => {
                  for (let i = 0; i < 3; i++) {
                    const res = await fetch("/api/webhook", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ eventType: "QUOTA_RESET", idempotencyKey: sharedKey }),
                    });
                    const data = await res.json();
                    addResult(
                      `Webhook call ${i + 1}/3 (same key)`,
                      data.idempotent ? "warning" : "success",
                      data
                    );
                  }
                  setLoading(null);
                })();
              }}
              disabled={loading !== null}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              {loading === "idempotency" ? "Testing..." : "Call Webhook 3× (Same Key)"}
            </button>
          </div>

          {/* Bulk Leads */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-white">Generate 10 Concurrent Leads</h3>
                <p className="text-slate-400 text-sm mt-0.5">Creates 10 leads simultaneously across all services to stress-test concurrency and fair allocation.</p>
              </div>
            </div>
            <button
              id="bulkLeadsBtn"
              onClick={generateBulkLeads}
              disabled={loading !== null}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              {loading === "bulk" ? "Generating..." : "Generate 10 Leads Instantly"}
            </button>
          </div>

          {/* Webhook Log */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-semibold text-white">View Webhook Event Log</h3>
                <p className="text-slate-400 text-sm mt-0.5">Shows all processed webhook events and their idempotency keys.</p>
              </div>
            </div>
            <button
              id="fetchWebhookLogBtn"
              onClick={fetchWebhookLog}
              disabled={loading !== null}
              className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all text-sm"
            >
              {loading === "log" ? "Loading..." : "Fetch Webhook Log"}
            </button>
            {webhookLog.length > 0 && (
              <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                {(webhookLog as Array<{ id: number; eventType: string; idempotencyKey: string; processedAt: string }>).map((e) => (
                  <div key={e.id} className="text-xs bg-slate-900/50 rounded-lg px-3 py-2 font-mono">
                    <span className="text-blue-400">{e.eventType}</span>
                    <span className="text-slate-500 ml-2">{e.idempotencyKey.slice(0, 16)}...</span>
                    <span className="text-slate-600 ml-2">{new Date(e.processedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results log */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Result Log</h2>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-slate-800/30 rounded-xl border border-slate-700/30 border-dashed">
              <p className="text-slate-500 text-sm">No actions performed yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`rounded-xl p-4 border text-sm ${
                  r.status === "success" ? "bg-emerald-900/20 border-emerald-500/30"
                  : r.status === "warning" ? "bg-yellow-900/20 border-yellow-500/30"
                  : "bg-red-900/20 border-red-500/30"
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{r.status === "success" ? "✅" : r.status === "warning" ? "⚠️" : "❌"}</span>
                    <span className="font-medium text-white text-xs">{r.label}</span>
                  </div>
                  <pre className="text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(r.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
