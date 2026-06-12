"use client";

import Link from 'next/link';

export default function Dashboard() {
  const projects = [
    { id: 1, name: "Senegal Syntropic Hub", client: "UNEP", status: "Active", hectares: 450, carbon: 1200 },
    { id: 2, name: "Andalusian Biosaline Restor...", client: "AgriMed", status: "Completed", hectares: 120, carbon: 350 },
    { id: 3, name: "California Keyline Network", client: "Private Estate", status: "In Design", hectares: 80, carbon: 0 },
  ];

  return (
    <main className="min-h-screen p-8 text-foreground relative z-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tighter text-primary">
              Control <span className="text-accent italic">Center</span>
            </h1>
            <p className="text-lg text-gray-600 font-light mt-2">
              Global Project Overview & Master Metrics
            </p>
          </div>
          <Link href="/" className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/30 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New PDC Project
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Active Hectares</p>
              <h3 className="text-4xl font-black text-primary">650 <span className="text-xl font-light text-gray-500">ha</span></h3>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-accent flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Carbon Sequestered</p>
              <h3 className="text-4xl font-black text-primary">1,550 <span className="text-xl font-light text-gray-500">tCO2e</span></h3>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-400 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reports Generated</p>
              <h3 className="text-4xl font-black text-primary">24</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl overflow-hidden border border-white/40 shadow-xl">
          <div className="p-6 border-b border-white/30 bg-white/40 flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Recent Agentic Reports
            </h2>
            <button className="text-sm font-bold text-accent hover:text-primary transition-colors">View All</button>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/20 text-xs uppercase tracking-widest text-gray-500">
                <th className="p-4 font-bold border-b border-white/20">Project Name</th>
                <th className="p-4 font-bold border-b border-white/20">Client</th>
                <th className="p-4 font-bold border-b border-white/20">Status</th>
                <th className="p-4 font-bold border-b border-white/20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-white/40 transition-colors border-b border-white/10 last:border-b-0 text-sm">
                  <td className="p-4 font-bold text-primary">{p.name}</td>
                  <td className="p-4 text-gray-600">{p.client}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      p.status === 'Active' ? 'bg-green-100 text-green-700' :
                      p.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-accent hover:text-primary font-bold transition-colors">Open Workspace</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
