import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const projectName = searchParams.get('project') || 'Permaculture Landscape Plan';

    if (!latParam || !lngParam) {
      return new Response('Missing lat or lng', { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response('Invalid lat or lng', { status: 400 });
    }

    // Determine climate zone dynamically
    let climateZone = 'Arid';
    const absLat = Math.abs(lat);
    let temp = 24.5;
    let precip = 1.2;

    try {
      const climRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=precipitation_sum&timezone=auto`,
        { next: { revalidate: 3600 } }
      );
      if (climRes.ok) {
        const data = await climRes.json();
        if (data) {
          temp = data.current_weather?.temperature || 24.5;
          precip = data.daily?.precipitation_sum?.[0] || 1.2;
        }
      }
    } catch (err) {
      console.error('Kumu CSV weather fetch error, using lat heuristics:', err);
    }

    const annualPrecip = precip * 365;
    if (temp >= 22 && annualPrecip >= 1200) {
      climateZone = 'Tropical';
    } else if (absLat > 35) {
      climateZone = 'Temperate';
    } else if (absLat > 22 && absLat <= 35) {
      climateZone = 'Subtropical';
    } else {
      if (annualPrecip < 600) {
        climateZone = 'Arid';
      } else {
        climateZone = 'Tropical';
      }
    }

    const getAridRegionName = (lLat: number, lLng: number): string => {
      if (lLat >= 11 && lLat <= 20 && lLng >= -18 && lLng <= 25) return "Sahelian";
      if (lLat >= 24 && lLat <= 40 && lLng >= -125 && lLng <= -100) return "Sonoran";
      if (lLat >= 30 && lLat <= 45 && lLng >= -10 && lLng <= 40) return "Mediterranean";
      if (lLat >= -38 && lLat <= -15 && lLng >= 110 && lLng <= 155) return "Australian Outback";
      if (lLat >= 15 && lLat <= 35 && lLng >= 30 && lLng <= 60) return "Arabian";
      return "Arid";
    };

    const aridRegion = getAridRegionName(lat, lng);

    const windbreakConfig: Record<string, string> = {
      Arid: `Tiered multi-row shelterbelt blocks planted with Neem, Acacia, and Prosopis to buffer dry ${aridRegion.toLowerCase()} winds and prevent soil desiccation.`,
      Tropical: "Dense multi-story shelterbelt planted with Casuarina, Mango, and Bamboo to buffer heavy storm and monsoon wind vectors.",
      Temperate: "Evergreen and deciduous shelterbelt block planted with Pine, Oak, and Currants to buffer freezing winter winds.",
      Subtropical: "Drought-hardy shelterbelt planted with Cypress, Olive, Fig, and Rosemary to buffer dry summer winds and sea breezes."
    };

    const activeWindbreakDesc = windbreakConfig[climateZone] || windbreakConfig.Arid;

    // Define elements
    const elements = [
      { label: "Zone 0 Homestead", type: "Homestead", desc: "Primary living space, labor center, and roof catchment structure." },
      { label: "Rainwater Cistern", type: "Water System", desc: "Elevated water storage tank collecting roof runoff." },
      { label: "Solar PV Array", type: "Infrastructure", desc: "Provides electrical energy to the homestead." },
      { label: "Zone 1 Garden", type: "Ecological Zone", desc: "High-frequency kitchen garden with raised beds and annual crops." },
      { label: "Zone 2 Orchards", type: "Ecological Zone", desc: `Perennial fruit trees and support plants adapted to the ${climateZone} climate.` },
      { label: "Zone 3 Pasture", type: "Ecological Zone", desc: "Rotational animal grazing and cover crops." },
      { label: "Contour Swales", type: "Water System", desc: "Passive earthworks intercepting water and replenishing soil aquifers." },
      { label: "Infiltration Pond", type: "Water System", desc: "Bio-retention pond recharging local groundwater." },
      { label: "Windbreak Shelterbelt", type: "Biological Asset", desc: activeWindbreakDesc }
    ];

    // Define connections
    const connections = [
      { from: "Zone 0 Homestead", to: "Rainwater Cistern", type: "Water Catchment", desc: "Roof runoff feeds the storage tank." },
      { from: "Rainwater Cistern", to: "Zone 1 Garden", type: "Irrigation", desc: "Gravity-fed drip irrigation supply." },
      { from: "Solar PV Array", to: "Zone 0 Homestead", type: "Energy Supply", desc: "Powers home appliances and monitoring sensors." },
      { from: "Contour Swales", to: "Zone 2 Orchards", type: "Hydration", desc: "Subsoil water storage feeds tree root zones." },
      { from: "Contour Swales", to: "Infiltration Pond", type: "Overflow", desc: "Excess runoff drains into the recharge pond." },
      { from: "Windbreak Shelterbelt", to: "Zone 1 Garden", type: "Microclimate Buffer", desc: "Blocks wind vectors, reducing soil evapotranspiration." },
      { from: "Zone 0 Homestead", to: "Zone 1 Garden", type: "Labor", desc: "Daily labor, planting, weeding, and compost return." },
      { from: "Zone 1 Garden", to: "Zone 0 Homestead", type: "Yield", desc: "Fresh vegetables and herbs for kitchen consumption." },
      { from: "Zone 2 Orchards", to: "Zone 0 Homestead", type: "Yield", desc: "Perennial fruit, nuts, and medicinal leaves." },
      { from: "Zone 3 Pasture", to: "Zone 2 Orchards", type: "Manure Loop", desc: "Grazing animals deposit nutrients to fertilize orchards." }
    ];

    let csvContent = `"Label","Type","Description","From","To","Connection Type","Connection Description"\n`;

    // Add elements (with empty From/To fields)
    elements.forEach(el => {
      csvContent += `"${el.label}","${el.type}","${el.desc.replace(/"/g, '""')}","","","",""\n`;
    });

    // Add connections
    connections.forEach(conn => {
      csvContent += `"${conn.from} to ${conn.to}","Connection","","${conn.from}","${conn.to}","${conn.type}","${conn.desc.replace(/'/g, "''").replace(/"/g, '""')}"\n`;
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${projectName.replace(/\s+/g, '_')}_Kumu_Relations.csv"`,
      },
    });

  } catch (globalErr: any) {
    console.error('Kumu CSV Exporter crash:', globalErr);
    return new Response('Failed to compile Kumu CSV file', { status: 500 });
  }
}
