"use client";

import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Layers, Radio, Volume2, Play, RefreshCw, 
  AlertTriangle, CheckCircle, Server, TrendingUp, Compass, 
  FileText, Terminal, ArrowRight, Lock, CloudRain, Sun, 
  Maximize2, Eye, Shield, Zap, Sparkles, BookOpen
} from 'lucide-react';
import { useNotification } from '@/components/NotificationSystem';

interface SovereignDashboardProps {
  location: { lat: number; lng: number } | null;
  userData: {
    projectName: string;
    clientName: string;
    goals: string;
    budget: string;
  };
}

export default function SovereignDashboard({ location, userData }: SovereignDashboardProps) {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'telemetry' | 'developing' | 'science' | 'radar' | 'voice'>('telemetry');
  
  // Node 1: Telemetry & Self-Healing States
  const [jetsonTemp, setJetsonTemp] = useState(42.1);
  const [ip67Pressure, setIp67Pressure] = useState(1.02);
  const [bearingFriction, setBearingFriction] = useState(0.12);
  const [inductionCharge, setInductionCharge] = useState(94.2);
  const [systemStatus, setSystemStatus] = useState<'HEALTHY' | 'ALERT' | 'HEALING'>('HEALTHY');
  const [cameraStatus, setCameraStatus] = useState<'ONLINE' | 'OFFLINE' | 'REBOOTING'>('ONLINE');
  const [healingLogs, setHealingLogs] = useState<string[]>([
    "[07:30:12] Swarm initialized. Active channel: Lora-915Mhz.",
    "[07:30:15] OpenClaw ManagerAgent: Sub-agent heartbeat verified.",
    "[07:45:00] Periodic diagnostic: All hardware rails within limits."
  ]);
  const [isHealingInProgress, setIsHealingInProgress] = useState(false);

  // Node 2: Self-Developing & SkillOpt States
  const [optimizationGen, setOptimizationGen] = useState(14);
  const [successRate, setSuccessRate] = useState(92.4);
  const [activeCodeLine, setActiveCodeLine] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizingLogs, setOptimizingLogs] = useState<string[]>([
    "Initial scaffold compiled. Baseline navigation success: 72.1%",
    "Gen 05 (SkillOpt): Refined canopy vertical slope calculation to 84.6%",
    "Gen 10 (SIA Weights): Self-optimizing local path weights. Target: 90%+"
  ]);

  // Node 3: FreePhDLabor Science States
  const [hypothesisStatus, setHypothesisStatus] = useState<'IDLE' | 'GENERATING' | 'ANALYZING' | 'DRAFTING' | 'COMPLETE'>('COMPLETE');
  const [activeHypothesis, setActiveHypothesis] = useState(
    "Syntropic Nitrogen-Fixation rates of Acacia senegal in high-alkaline clay soils under coastal Dakar wind strain."
  );
  const [scienceLog, setScienceLog] = useState<string[]>([
    "Hypothesis formulated from local LIDAR and Soil pH (7.8).",
    "Literature cross-reference: EuropePMC search retrieved 12 relevant matches.",
    "Sandboxed python modeling: Carbon sequestration vs moisture decay verified.",
    "LaTeX draft finalized: 'Dakar_Sahel_Regen_v4.pdf' generated successfully."
  ]);

  // Node 4: Horizon RSS Radar Items
  const [sahelAlerts, setSahelAlerts] = useState([
    { id: 1, source: "Sahel Weather Radar", time: "10 mins ago", title: "Harmattan Dust storm cell moving SW from Bilma. Visibility < 500m.", level: "WARNING" },
    { id: 2, source: "Senegal Agri-Dept", time: "1 hr ago", title: "Locust hatch detected in Podor zone. Early mitigation swarms dispatched.", level: "INFO" },
    { id: 3, source: "Sahel Markets Feed", time: "3 hrs ago", title: "Moringa dried leaf market premiums up 18% in Dakar local exchange.", level: "INFO" }
  ]);

  // Node 5: OmniVoice Speech Dispatch States
  const [voiceModel, setVoiceModel] = useState("SahelOperator_V2_Local");
  const [voiceCloned, setVoiceCloned] = useState(true);
  const [lastCommandText, setLastCommandText] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([
    "Initialize Zone 3 vertical companion-planting scan.",
    "Verify IP67 seals pressure gradient across Swarm-Bravo."
  ]);

  // Simulated live metrics fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      if (systemStatus === 'HEALTHY') {
        setJetsonTemp(prev => parseFloat((prev + (Math.random() - 0.5) * 0.4).toFixed(1)));
        setBearingFriction(prev => parseFloat(Math.max(0.08, prev + (Math.random() - 0.5) * 0.01).toFixed(3)));
        setInductionCharge(prev => parseFloat(Math.min(100, Math.max(90, prev + (Math.random() - 0.5) * 0.2)).toFixed(1)));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [systemStatus]);

  // Self-Healing Simulation Action
  const triggerSensorFault = () => {
    if (isHealingInProgress) return;
    setSystemStatus('ALERT');
    setCameraStatus('OFFLINE');
    notify("CRITICAL ALERT: Camera sensor node failed on Swarm-Alpha!", "error");
    
    setHealingLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚠️ CRITICAL: Hyperspectral camera node loss detected!`,
      `[${new Date().toLocaleTimeString()}] 🔍 DiagnosticAgent: Initiating MCP hardware scan...`,
      `[${new Date().toLocaleTimeString()}] 🎛️ NavigationAgent: Perching drone on Zone 4 Acacia branch.`
    ]);

    setIsHealingInProgress(true);

    // Stage 1: Attempt node reboot (2s)
    setTimeout(() => {
      setSystemStatus('HEALING');
      setCameraStatus('REBOOTING');
      setHealingLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🛡️ OpenClaw Diagnostic: Initiating self-healing loop...`,
        `[${new Date().toLocaleTimeString()}] 🔌 MCP Driver: Cutting 12V power rail to hyperspectral node.`,
        `[${new Date().toLocaleTimeString()}] 🔌 MCP Driver: Power restored. Initializing sensor hot-reboot...`
      ]);
    }, 3000);

    // Stage 2: Recovery (5s)
    setTimeout(() => {
      setSystemStatus('HEALTHY');
      setCameraStatus('ONLINE');
      setHealingLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ⚙️ Sensor calibration matching: OK.`,
        `[${new Date().toLocaleTimeString()}] 🟢 SYSTEM RESTORED: Camera sensor node healthy.`,
        `[${new Date().toLocaleTimeString()}] 🚀 NavigationAgent: Resuming autonomous LIDAR flight grid.`
      ]);
      setIsHealingInProgress(false);
      notify("SUCCESS: Self-healing complete. All nodes online!", "success");
    }, 7000);
  };

  // SkillOpt Simulation Action
  const runSkillOptimization = () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    setOptimizingLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⚙️ SkillOpt: Running validation rollouts inside local sandbox...`,
    ]);

    // Simulated optimizing ticks
    setTimeout(() => {
      setOptimizationGen(prev => prev + 1);
      setSuccessRate(prev => parseFloat((prev + (100 - prev) * 0.2).toFixed(2)));
      setOptimizingLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ⚙️ SkillOpt: Proposing edit to 'flight_behavior.md' -> adjusted vertical collision weight to 0.94`,
        `[${new Date().toLocaleTimeString()}] Gen ${optimizationGen + 1}: Validation success rate improved.`
      ]);
      setIsOptimizing(false);
      notify("Optimization cycle complete!", "success");
    }, 4000);
  };

  // Voice Command dispatch
  const handleVoiceCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastCommandText.trim()) return;
    const cmd = lastCommandText.trim();
    setCommandHistory(prev => [cmd, ...prev]);
    setLastCommandText("");
    notify(`Voice Command Dispatched: "${cmd}"`, "success");
    
    // Simulate Diagnostic response
    setTimeout(() => {
      setHealingLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📡 Local Speech Dispatch: Recognized command: "${cmd}"`,
        `[${new Date().toLocaleTimeString()}] ⚙️ OpenClaw: Dispatching instructions to Swarm controllers...`
      ]);
    }, 1000);
  };

  return (
    <div className="w-full text-slate-100 overflow-hidden font-sans select-none">
      {/* Dashboard Top Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStatus === 'HEALTHY' ? 'bg-cyan-400' : systemStatus === 'ALERT' ? 'bg-red-500' : 'bg-purple-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === 'HEALTHY' ? 'bg-cyan-400' : systemStatus === 'ALERT' ? 'bg-red-500' : 'bg-purple-500'}`}></span>
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              SOVEREIGN OPERATIONS CONTROL CENTER
              <span className="text-xs uppercase px-2 py-0.5 rounded border font-mono bg-cyan-950/40 text-cyan-400 border-cyan-500/30">Sahel v2</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            PROJECT: {userData.projectName.toUpperCase() || "DAKAR AGRI-HUB"} | CLIENT: {userData.clientName.toUpperCase() || "DECENTRALIZED SWARM"} | COORDS: {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "14.7167, -17.4677"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={triggerSensorFault}
            disabled={systemStatus !== 'HEALTHY'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${systemStatus === 'HEALTHY' ? 'bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-900/20 hover:border-red-400 active:scale-95' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            SIMULATE SENSOR FAULT
          </button>
          
          <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5">
            {(['telemetry', 'developing', 'science', 'radar', 'voice'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all capitalize ${activeTab === tab ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 font-black' : 'text-slate-400 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Node Detail Panels based on selection */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* TAB 1: TELEMETRY & SELF-HEALING */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Gauges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <Cpu className="w-12 h-12 text-cyan-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Jetson Temp</p>
                  <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">{jetsonTemp}°C</p>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${(jetsonTemp / 90) * 100}%` }}></div>
                  </div>
                  <span className="text-[9px] text-cyan-400 font-mono block mt-2">Passively Cooled Frame</span>
                </div>

                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <Shield className="w-12 h-12 text-purple-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">IP67 Enclosure</p>
                  <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">{ip67Pressure} atm</p>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: '85%' }}></div>
                  </div>
                  <span className="text-[9px] text-purple-400 font-mono block mt-2">Pressure Differential: OK</span>
                </div>

                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <Maximize2 className="w-12 h-12 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Hinge Bearings</p>
                  <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">{bearingFriction} μ</p>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${bearingFriction * 200}%` }}></div>
                  </div>
                  <span className="text-[9px] text-amber-400 font-mono block mt-2">Dust Viton Seals: Active</span>
                </div>

                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-all">
                    <Zap className="w-12 h-12 text-cyan-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Induction Charge</p>
                  <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">{inductionCharge}%</p>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${inductionCharge}%` }}></div>
                  </div>
                  <span className="text-[9px] text-cyan-400 font-mono block mt-2">Storm induction Link: Ready</span>
                </div>
              </div>

              {/* Self-Healing Terminal Panel */}
              <div className="sovereign-panel rounded-3xl p-6 border border-white/5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    OpenClaw Self-Healing Diagnostics
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      Camera Node:
                      <span className={`w-2 h-2 rounded-full inline-block ${cameraStatus === 'ONLINE' ? 'bg-cyan-400 animate-pulse' : cameraStatus === 'OFFLINE' ? 'bg-red-500' : 'bg-purple-500 animate-spin'}`}></span>
                      <strong className="text-white font-mono">{cameraStatus}</strong>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      State: <strong className={systemStatus === 'HEALTHY' ? 'text-cyan-400 font-mono' : systemStatus === 'ALERT' ? 'text-red-400 font-mono' : 'text-purple-400 font-mono animate-pulse'}>{systemStatus}</strong>
                    </span>
                  </div>
                </div>

                <div className="bg-black/80 rounded-2xl p-5 border border-white/5 font-mono text-xs text-slate-300 h-72 overflow-y-auto space-y-2 sovereign-scrollbar shadow-inner">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3">
                    <Terminal className="w-4 h-4" />
                    <span>LOCAL DECENTRALIZED SHELL</span>
                  </div>
                  {healingLogs.map((log, idx) => (
                    <div key={idx} className={`leading-relaxed ${log.includes('CRITICAL') ? 'text-red-400 font-bold' : log.includes('SYSTEM RESTORED') ? 'text-cyan-400 font-bold' : log.includes('Self-Healing') ? 'text-purple-400' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))}
                  {isHealingInProgress && (
                    <div className="flex items-center gap-2 text-purple-400 font-bold animate-pulse mt-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Executing self-healing hot-reboot node cascade...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SELF-DEVELOPING & SKILLOPT */}
          {activeTab === 'developing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="sovereign-panel p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">SkillOpt Engine</p>
                  <p className="text-2xl font-extrabold tracking-tight mt-1 text-white">Instruction Optimization</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Optimization Epochs:</span>
                      <span className="text-cyan-400 font-bold">Gen {optimizationGen}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Canopy Avoidance Success:</span>
                      <span className="text-cyan-400 font-bold">{successRate}%</span>
                    </div>
                  </div>
                  <button 
                    onClick={runSkillOptimization}
                    disabled={isOptimizing}
                    className="w-full mt-5 flex items-center justify-center gap-2 bg-cyan-400 text-black px-4 py-2.5 rounded-xl text-xs font-bold font-mono hover:bg-cyan-300 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isOptimizing ? 'Refining Skill Text...' : 'TRIGGER SKILLOPT OPTIMIZATION'}
                  </button>
                </div>

                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">SIA Weight Harness</p>
                  <p className="text-2xl font-extrabold tracking-tight mt-1 text-white">Dynamic Code Patches</p>
                  <div className="mt-4 space-y-2 font-mono text-xs text-slate-300 bg-black/60 p-4 rounded-xl border border-white/5">
                    <div className={activeCodeLine === 0 ? "text-cyan-400 font-bold bg-cyan-950/20 px-1 border-l-2 border-cyan-500" : "text-slate-500"}>1: def optimize_vertical_path(canopy_height, slope):</div>
                    <div className={activeCodeLine === 1 ? "text-cyan-400 font-bold bg-cyan-950/20 px-1 border-l-2 border-cyan-500" : "text-slate-500"}>2:     adjust_factor = slope * 0.941</div>
                    <div className={activeCodeLine === 2 ? "text-cyan-400 font-bold bg-cyan-950/20 px-1 border-l-2 border-cyan-500" : "text-slate-500"}>3:     return max(2.5, canopy_height * adjust_factor)</div>
                  </div>
                  <span className="text-[9px] text-cyan-400/70 font-mono block mt-2">Active Scaffold: Auto-healing verified sandbox</span>
                </div>
              </div>

              <div className="sovereign-panel rounded-3xl p-6 border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Self-Developing Code Optimization Log (SIA / SkillOpt)
                </h3>
                <div className="bg-black/80 rounded-2xl p-5 border border-white/5 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2 sovereign-scrollbar">
                  {optimizingLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed text-slate-400">
                      <span className="text-purple-400 font-mono">&gt; </span>{log}
                    </div>
                  ))}
                  {isOptimizing && (
                    <div className="text-cyan-400 font-bold animate-pulse">
                      Analyzing generation models... compiling code diffs...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FREEPHDLABOR SCIENCE */}
          {activeTab === 'science' && (
            <div className="space-y-6">
              <div className="sovereign-panel p-6 rounded-3xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    FreePhDLabor Scientific Synthesis
                  </h3>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-500/25">
                    Pipeline: {hypothesisStatus}
                  </span>
                </div>

                <div className="bg-cyan-950/10 border border-cyan-500/20 p-5 rounded-2xl">
                  <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mb-1">Active Hypothesis Formulation</p>
                  <p className="text-sm font-semibold leading-relaxed text-white">
                    "{activeHypothesis}"
                  </p>
                </div>

                <div className="bg-black/80 rounded-2xl p-5 border border-white/5 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2 sovereign-scrollbar">
                  {scienceLog.map((log, idx) => (
                    <div key={idx} className="leading-relaxed text-slate-400 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">✓</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HORIZON RSS RADAR */}
          {activeTab === 'radar' && (
            <div className="space-y-6">
              <div className="sovereign-panel p-6 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Horizon 24/7 Sahelian Information Scraper Feed
                </h3>

                <div className="space-y-4 h-[350px] overflow-y-auto sovereign-scrollbar pr-2">
                  {sahelAlerts.map(alert => (
                    <div key={alert.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-400 font-mono">{alert.source}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{alert.time}</span>
                        </div>
                        <p className="text-sm text-white font-medium">{alert.title}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${alert.level === 'WARNING' ? 'bg-red-950/40 text-red-400 border border-red-500/25' : 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/25'}`}>
                        {alert.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OMNIVOICE SPEECH DISPATCH */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="sovereign-panel p-5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">OmniVoice Local Model</p>
                  <p className="text-xl font-extrabold tracking-tight mt-1 text-white">Voice Cloning Status</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Target Operator Profile:</span>
                      <span className="text-white font-bold">{voiceModel}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Zero-API Voice synthesis:</span>
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        CLONED & LOCAL
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sovereign-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Voice Dispatch Terminal</p>
                    <p className="text-sm text-slate-300 mt-1">Speak or dictate system instructions offline without ElevenLabs cloud fees.</p>
                  </div>
                  <form onSubmit={handleVoiceCommand} className="flex gap-2 mt-4">
                    <input
                      type="text"
                      placeholder="Type simulated operator command..."
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-white font-mono"
                      value={lastCommandText}
                      onChange={(e) => setLastCommandText(e.target.value)}
                    />
                    <button 
                      type="submit"
                      className="bg-cyan-500 text-black px-4 py-3 rounded-xl text-xs font-bold font-mono hover:bg-cyan-400 transition-all shadow-lg active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              <div className="sovereign-panel rounded-3xl p-6 border border-white/5 space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  Operator Voice Command Dispatch Logs
                </h3>
                <div className="bg-black/80 rounded-2xl p-5 border border-white/5 font-mono text-xs text-slate-300 h-48 overflow-y-auto space-y-2 sovereign-scrollbar">
                  {commandHistory.map((cmd, idx) => (
                    <div key={idx} className="leading-relaxed text-slate-400 flex items-start gap-2">
                      <span className="text-cyan-400 font-mono">[Voice Dictation]:</span>
                      <span>"{cmd}"</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Network Swarm Structure Map */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sovereign-panel rounded-3xl p-6 border border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
              Decentralized Node Topology
            </h3>

            {/* Simulated Canvas Map representation */}
            <div className="relative bg-slate-950/60 h-64 border border-white/5 rounded-2xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px]"></div>
              
              {/* Pulsing Radar Ring */}
              <div className="absolute w-44 h-44 rounded-full border border-cyan-500/20 animate-ping opacity-20"></div>
              <div className="absolute w-24 h-24 rounded-full border border-purple-500/20 animate-ping opacity-15"></div>

              {/* Node central base station */}
              <div className="absolute flex flex-col items-center z-10">
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <Server className="w-4 h-4 text-black" />
                </div>
                <span className="text-[8px] font-mono text-cyan-400 mt-1 uppercase font-bold">Base Station</span>
              </div>

              {/* Node Drones */}
              <div className="absolute top-10 left-10 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-cyan-500 flex items-center justify-center shadow-md animate-bounce">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                </div>
                <span className="text-[7px] font-mono text-slate-400 mt-1 uppercase">Swarm-Alpha</span>
              </div>

              <div className="absolute bottom-12 right-12 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-slate-900 border border-purple-500 flex items-center justify-center shadow-md">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                </div>
                <span className="text-[7px] font-mono text-slate-400 mt-1 uppercase">Swarm-Bravo</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2">
                <span className="text-slate-400">Total Active Swarms:</span>
                <span className="text-white font-bold">02 Swarms (8 Drones)</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2">
                <span className="text-slate-400">Induction Dock Link:</span>
                <span className="text-cyan-400 font-bold uppercase">Secured</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono pb-2">
                <span className="text-slate-400">Local Network Encryption:</span>
                <span className="text-cyan-400 font-bold uppercase">AES-256 (Zero cloud-key)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
