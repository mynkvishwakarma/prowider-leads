"use client";

import { useState, useEffect } from "react";

interface Service {
  id: number;
  name: string;
}

export default function RequestServicePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    city: "",
    serviceId: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    assignedTo?: string[];
    leadId?: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, serviceId: parseInt(form.serviceId) }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.success) {
      setForm({ customerName: "", phone: "", city: "", serviceId: "", description: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Request a Service</h1>
          <p className="text-slate-400 text-sm">Fill in your details and we'll connect you with the right providers</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                id="customerName"
                type="text"
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
              <input
                id="phone"
                type="tel"
                required
                pattern="[0-9]{10}"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="9999999999"
                maxLength={10}
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">10-digit mobile number</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
              <input
                id="city"
                type="text"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Mumbai"
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Service Type</label>
              <select
                id="serviceId"
                required
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="" className="text-slate-500">Select a service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id} className="text-white bg-slate-800">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                id="description"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your requirements..."
                rows={3}
                className="w-full bg-slate-900/70 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              />
            </div>

            <button
              id="submitLeadBtn"
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit Enquiry"
              )}
            </button>
          </form>

          {/* Result message */}
          {result && (
            <div className={`mt-5 rounded-xl p-4 border ${result.success ? "bg-emerald-900/30 border-emerald-500/30" : "bg-red-900/30 border-red-500/30"}`}>
              {result.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-400 font-semibold">Lead #{result.leadId} Created Successfully!</span>
                  </div>
                  <p className="text-slate-300 text-sm">Assigned to:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.assignedTo?.map((p) => (
                      <span key={p} className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-300 text-sm">{result.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Prowider Lead Distribution System
        </p>
      </div>
    </div>
  );
}
