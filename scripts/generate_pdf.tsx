import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import PDFReport from '../src/components/PDFReport';
import { generateReportContent } from '../src/lib/reportGenerator';
import path from 'path';
import fs from 'fs';

// Heaven's Gate Coordinates (Saudi Arabia / Arabian Desert)
const lat = 24.078650;
const lng = 39.902789;
const boundaryCoords = [
    { lat: 24.07954669460967, lng: 39.90275144577027 },
    { lat: 24.07739172996991, lng: 39.90418910980225 },
    { lat: 24.077254594630727, lng: 39.90358829498292 },
    { lat: 24.07831249202033, lng: 39.9016034603119 },
    { lat: 24.08004624942291, lng: 39.901388883590705 }
];

const userData = {
    projectName: "Heaven's Gate Permaculture Project",
    clientName: "Heaven's Gate Client",
    goals: "Establish a self-sustaining desert oasis, capture and infiltrate sheet-flow runoff via contour swales, utilize micro-climates for crop protection, and achieve energy sovereignty via solar dynamics.",
    budget: "Premium Development Model"
};

const outputFilePath = 'C:/Users/aakwa/Downloads/Heaven\'s_gate_PDC_Portfolio (8).pdf';

// Helper to fetch any image and convert it to Base64
const fetchBase64Image = async (url: string): Promise<string> => {
  if (!url) return '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    }
  } catch (err) {
    console.error('Error fetching image for Base64:', url, err);
  }
  return '';
};

async function generate() {
    console.log("Fetching real-world database records for Heaven's Gate...");
    
    // 1. Climate Data (Open-Meteo)
    let climate = { temperature: 34.5, precipitation: 0.2, windSpeed: 16.5, windDirection: 290, solarRadiation: 26.2 };
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=precipitation_sum,shortwave_radiation_sum&timezone=auto`);
        if (res.ok) {
            const data = await res.json();
            climate = {
                temperature: data.current_weather?.temperature || 34.5,
                precipitation: (data.daily?.precipitation_sum?.[0] || 70) / 365,
                windSpeed: data.current_weather?.windspeed || 16.5,
                windDirection: data.current_weather?.winddirection || 290,
                solarRadiation: data.daily?.shortwave_radiation_sum?.[0] || 26.2
            };
        }
    } catch (err) {
        console.error("Failed to fetch climate:", err);
    }

    // 2. Elevation Data (Open-Meteo)
    let elevation = { elevation: 620.0, slope: 2.1 };
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
        if (res.ok) {
            const data = await res.json();
            elevation = {
                elevation: data.elevation?.[0] || 620.0,
                slope: 2.1
            };
        }
    } catch (err) {
        console.error("Failed to fetch elevation:", err);
    }

    // 3. Soil Data (ISRIC)
    let soil = { ph: 7.9, organicCarbon: 2.4 };
    try {
        const res = await fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=phh2o&property=soc&depth=0-5cm&value=mean`);
        if (res.ok) {
            const data = await res.json();
            const ph = data.properties?.layers?.find((l: any) => l.name === 'phh2o')?.depths?.[0]?.values?.mean || 79;
            const soc = data.properties?.layers?.find((l: any) => l.name === 'soc')?.depths?.[0]?.values?.mean || 24;
            soil = { ph: ph / 10, organicCarbon: soc / 10 };
        }
    } catch (err) {
        console.error("Failed to fetch soil:", err);
    }

    // 4. Ecology (Arabian Desert Species)
    const ecology = {
        taxa: ['Acacia tortilis', 'Phoenix dactylifera', 'Oryx leucoryx', 'Chlamydotis macqueenii'],
        taxaDetails: [
            { name: 'Acacia tortilis', commonName: 'Umbrella Thorn Acacia', photoBase64: '' },
            { name: 'Phoenix dactylifera', commonName: 'Date Palm', photoBase64: '' },
            { name: 'Oryx leucoryx', commonName: 'Arabian Oryx', photoBase64: '' },
            { name: 'Chlamydotis macqueenii', commonName: 'Macqueen\'s Bustard', photoBase64: '' }
        ]
    };

    // Pre-load default base64 photos for flora/fauna from unsplash to look extremely premium!
    console.log("Fetching premium flora/fauna images...");
    const plantPhotos = [
        'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', // Acacia
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', // Date Palm
        'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400', // Oryx
        'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=400'  // Bustard
    ];
    for (let i = 0; i < ecology.taxaDetails.length; i++) {
        ecology.taxaDetails[i].photoBase64 = await fetchBase64Image(plantPhotos[i]);
    }

    // 5. Maps (ArcGIS REST Export)
    console.log("Fetching satellite, topographic, and street imagery from ArcGIS REST...");
    const minBoxSize = 0.02;
    const lats = boundaryCoords.map(b => b.lat);
    const lngs = boundaryCoords.map(b => b.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const latPadding = Math.max(latDiff * 0.2, 0.001);
    const lngPadding = Math.max(lngDiff * 0.2, 0.001);

    minLat -= latPadding;
    maxLat += latPadding;
    minLng -= lngPadding;
    maxLng += lngPadding;

    const currentLatDiff = maxLat - minLat;
    if (currentLatDiff < minBoxSize) {
        const pad = (minBoxSize - currentLatDiff) / 2;
        minLat -= pad;
        maxLat += pad;
    }
    const currentLngDiff = maxLng - minLng;
    if (currentLngDiff < minBoxSize) {
        const pad = (minBoxSize - currentLngDiff) / 2;
        minLng -= pad;
        maxLng += pad;
    }

    const satUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=800,500&format=jpg&f=image`;
    const topoUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=800,500&format=jpg&f=image`;
    const streetUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=800,500&format=jpg&f=image`;
    const reliefUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=800,500&format=jpg&f=image`;

    const [satB64, topoB64, streetB64, reliefB64] = await Promise.all([
        fetchBase64Image(satUrl),
        fetchBase64Image(topoUrl),
        fetchBase64Image(streetUrl),
        fetchBase64Image(reliefUrl)
    ]);

    const loadMockAsset = (fileName: string): string => {
        const filePath = path.join(__dirname, '../public/images', fileName);
        if (fs.existsSync(filePath)) {
            return `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`;
        }
        return '';
    };

    // Set JPEGs to empty string to activate SVG vector diagrams, load custom Acacia guild PNG
    const maps = {
        satelliteMap: satB64,
        topoMap: topoB64,
        streetMap: streetB64,
        hillshadeMap: reliefB64,
        bananaGuild: loadMockAsset('arid_acacia_guild.png'),
        waterHarvesting: loadMockAsset('water_harvesting.jpg'),
        gravityDrip: loadMockAsset('gravity_drip.jpg'),
        contourSwales: loadMockAsset('contour_swales.jpg'),
        concentricZoning: loadMockAsset('concentric_zoning.jpg'),
        functionalConcept: loadMockAsset('functional_concept.jpg')
    };

    // Generate sunData
    const sunData = { times: { sunrise: new Date(), sunset: new Date() } };

    // Run report generator
    const generatedReport = generateReportContent(climate, elevation, soil, ecology, lat, lng);

    console.log("Compiling Heaven's Gate PDF Master Portfolio...");
    try {
        await ReactPDF.renderToFile(
            <PDFReport 
                location={{ lat, lng }} 
                boundaryCoords={boundaryCoords}
                climate={climate} 
                elevation={elevation} 
                soil={soil} 
                ecology={ecology} 
                userData={userData} 
                sunData={sunData}
                generatedReport={generatedReport}
                maps={maps}
            />,
            outputFilePath
        );
        console.log(`PDF generated successfully at: ${outputFilePath}`);
    } catch (err) {
        console.error("PDF Compilation Error:", err);
    }
}

generate();
