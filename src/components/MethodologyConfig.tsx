"use client";

import { useState, useEffect } from 'react';

interface MethodologyConfigProps {
  location: { lat: number; lng: number } | null;
  onConfigChange: (config: any) => void;
}

export default function MethodologyConfig({ location, onConfigChange }: MethodologyConfigProps) {
  const [financialStrategy, setFinancialStrategy] = useState<string[]>([]);
  const [methodology, setMethodology] = useState<string>('Syntropic Agroforestry');
  const [aiRecommendedMethod, setAiRecommendedMethod] = useState('');
  const [aiRecommendationReason, setAiRecommendationReason] = useState('');

  useEffect(() => {
    if (location) {
      setAiRecommendedMethod('Analyzing...');
      setAiRecommendationReason('Querying local weather databases and SoilGrids APIs for site-specific telemetry...');
      
      let active = true;
      
      const fetchTelemetry = async () => {
        try {
          const [weatherRes, soilRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current_weather=true&daily=precipitation_sum&timezone=auto`),
            fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${location.lng}&lat=${location.lat}&property=phh2o&property=soc&depth=0-5cm&value=mean`, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            })
          ]);
          
          let precipitation = 1.2;
          let temperature = 24.5;
          let ph = 6.8;
          let soc = 4.5;
          
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            temperature = wData.current_weather?.temperature ?? 24.5;
            precipitation = wData.daily?.precipitation_sum?.[0] ?? 1.2;
          }
          
          if (soilRes.ok) {
            const sData = await soilRes.json();
            const phLayer = sData.properties?.layers?.find((l: any) => l.name === 'phh2o');
            const socLayer = sData.properties?.layers?.find((l: any) => l.name === 'soc');
            const rawPh = phLayer?.depths?.[0]?.values?.mean;
            const rawSoc = socLayer?.depths?.[0]?.values?.mean;
            ph = typeof rawPh === 'number' ? rawPh / 10 : 6.8;
            soc = typeof rawSoc === 'number' ? rawSoc / 10 : 4.5;
          }
          
          const annualPrecip = precipitation * 365;
          const absLat = Math.abs(location.lat);
          
          let recommended = 'Syntropic Agroforestry';
          let reason = 'Balanced design for high soil organic content restoration and multistoried companion planting.';
          
          if (annualPrecip < 300) {
            recommended = 'Biosaline & Halophyte Systems';
            reason = `Hyper-arid zone (Annual Rainfall: ${annualPrecip.toFixed(0)}mm). High evaporation rates. Recommended salt-tolerant crops, buried Ollas, and biosaline buffers.`;
          } else if (annualPrecip >= 300 && annualPrecip < 600) {
            recommended = 'Keyline Permaculture Design';
            reason = `Arid/Semi-arid zone (Annual Rainfall: ${annualPrecip.toFixed(0)}mm, Soil pH: ${ph.toFixed(1)}). Focus on passive water catchment, swales, and Keyline soil rejuvenation.`;
          } else if (absLat > 35) {
            recommended = 'Miyawaki Afforestation';
            reason = `Temperate climate (Lat: ${location.lat.toFixed(2)}°, pH: ${ph.toFixed(1)}). Optimized for rapid micro-climate creation, dense native forest building, and soil remediation.`;
          } else if (annualPrecip >= 1200 && temperature >= 22) {
            recommended = 'Syntropic Agroforestry';
            reason = `Humid tropical climate (Annual Rainfall: ${annualPrecip.toFixed(0)}mm). Optimized for vertical food forest layers, heavy nutrient cycling, and biomass production.`;
          } else {
            recommended = 'Syntropic Agroforestry';
            reason = `Subtropical/temperate moisture index (Annual Rainfall: ${annualPrecip.toFixed(0)}mm, pH: ${ph.toFixed(1)}). Supports dense canopy stratification and soil organic carbon recovery.`;
          }
          
          if (active) {
            setAiRecommendedMethod(recommended);
            setAiRecommendationReason(reason);
            setMethodology(recommended);
            onConfigChange({ methodology: recommended, financialStrategy });
          }
        } catch (err) {
          console.error("Error in Methodology telemetry fetch:", err);
          const lat = Math.abs(location.lat);
          let recommended = 'Syntropic Agroforestry';
          let reason = 'Balanced design for high soil organic content restoration and multistoried companion planting.';
          if (lat < 15) {
            recommended = 'Biosaline & Halophyte Systems';
            reason = 'Arid zone with high evaporation rates. Optimizes salt-tolerant crops and soil cover.';
          } else if (lat >= 15 && lat < 35) {
            recommended = 'Syntropic Agroforestry';
            reason = 'Ideal tropical/subtropical moisture index. Supports dense canopy stratification.';
          } else {
            recommended = 'Miyawaki Afforestation';
            reason = 'Temperate climate, optimized for fast micro-climate creation and rapid organic soil remediation.';
          }
          
          if (active) {
            setAiRecommendedMethod(recommended);
            setAiRecommendationReason(reason);
            setMethodology(recommended);
            onConfigChange({ methodology: recommended, financialStrategy });
          }
        }
      };
      
      fetchTelemetry();
      
      return () => {
        active = false;
      };
    }
  }, [location]);

  const handleToggle = (strategy: string) => {
    const newStrategy = financialStrategy.includes(strategy)
      ? financialStrategy.filter(s => s !== strategy)
      : [...financialStrategy, strategy];
    setFinancialStrategy(newStrategy);
    onConfigChange({ methodology, financialStrategy: newStrategy });
  };

  return (
    <section className="glass-panel p-6 rounded-2xl border border-white/40">
      <h2 className="text-xl font-bold mb-4 text-primary">Ecological Methodology & Financials</h2>
      
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">AI Recommended Methodology</p>
        {!location ? (
          <div className="bg-white/40 p-4 rounded-xl border border-dashed border-gray-300 text-center">
            <p className="text-xs text-gray-600">Select a location on the map to unlock AI recommendation & methodology selection</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-accent/10 to-primary/5 p-4 rounded-xl border border-accent/30">
              <span className="inline-block text-[9px] font-bold bg-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wider mb-1.5 animate-pulse">AI Recommended Option</span>
              <h4 className="font-bold text-primary text-sm">{aiRecommendedMethod}</h4>
              <p className="text-xs text-gray-600 mt-1">{aiRecommendationReason}</p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Methodology Selection (Manual Override)</label>
              <select 
                className="w-full text-sm bg-white border border-gray-200 rounded-xl p-3 text-primary focus:ring-1 focus:ring-accent outline-none shadow-sm font-medium"
                value={methodology}
                onChange={(e) => {
                  setMethodology(e.target.value);
                  onConfigChange({ methodology: e.target.value, financialStrategy });
                }}
              >
                <option value="Syntropic Agroforestry">Syntropic Agroforestry</option>
                <option value="Miyawaki Afforestation">Miyawaki Afforestation</option>
                <option value="Biosaline & Halophyte Systems">Biosaline & Halophyte Systems</option>
                <option value="Keyline Permaculture Design">Keyline Permaculture Design</option>
                <option value="Standard Broadacre">Standard Broadacre</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Financial Strategy (Select multiple)</p>
        <div className="space-y-3">
          {[
            { id: 'zero-capex', label: 'Zero-CAPEX / Debt-Free', desc: 'Prioritizes low upfront costs, manual earthworks.' },
            { id: 'max-yield', label: 'Maximum Commercial Yield', desc: 'High-value cash crops, intensive earthworks.' },
            { id: 'phased', label: 'Phased Bootstrapping', desc: 'Reinvests yields from Zone 1 & 2 to fund outer zones.' },
          ].map(strategy => (
            <label key={strategy.id} className="flex items-start gap-3 p-3 bg-white/40 rounded-xl cursor-pointer hover:bg-white/60 transition-colors">
              <input 
                type="checkbox" 
                className="mt-1 w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                checked={financialStrategy.includes(strategy.id)}
                onChange={() => handleToggle(strategy.id)}
              />
              <div>
                <p className="font-semibold text-sm text-primary">{strategy.label}</p>
                <p className="text-xs text-gray-600">{strategy.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
