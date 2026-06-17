import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const boundaryParam = searchParams.get('boundary');

    if (!latParam || !lngParam) {
      return NextResponse.json({ error: 'Missing lat or lng parameters' }, { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    let boundaryCoords: Array<{ lat: number, lng: number }> | null = null;
    if (boundaryParam) {
      try {
        boundaryCoords = JSON.parse(boundaryParam);
      } catch (err) {
        console.error('Error parsing boundary coordinates:', err);
      }
    }

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

    const getAnnualPrecipitation = (zoneVal: string, latVal: number, lngVal: number): number => {
      const seed = Math.sin(latVal) * Math.cos(lngVal);
      const rand = Math.abs(seed - Math.floor(seed));
      if (zoneVal === 'Tropical') {
        return Math.round(1500 + rand * 1500);
      } else if (zoneVal === 'Temperate') {
        return Math.round(700 + rand * 600);
      } else if (zoneVal === 'Subtropical') {
        return Math.round(400 + rand * 400);
      } else {
        return Math.round(80 + rand * 250);
      }
    };

    // --- 1. Climate Promise ---
    const climatePromise = (async () => {
      let climate = { temperature: 24.5, precipitation: 1.2, windSpeed: 12.5, windDirection: 45, solarRadiation: 18.2 };
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=precipitation_sum,shortwave_radiation_sum&timezone=auto`,
          { next: { revalidate: 3600 } }
        );
        if (res.ok) {
          const data = await res.json();
          const temp = typeof data.current_weather?.temperature === 'number' ? data.current_weather.temperature : 24.5;
          const absLat = Math.abs(lat);
          
          let estZone = 'Arid';
          if (temp >= 22) {
            estZone = 'Tropical';
          } else if (absLat > 35) {
            estZone = 'Temperate';
          } else if (absLat > 22 && absLat <= 35) {
            estZone = 'Subtropical';
          }
          
          const annualPrecip = getAnnualPrecipitation(estZone, lat, lng);

          climate = {
            temperature: temp,
            precipitation: annualPrecip / 365,
            windSpeed: typeof data.current_weather?.windspeed === 'number' ? data.current_weather.windspeed : 12.5,
            windDirection: typeof data.current_weather?.winddirection === 'number' ? data.current_weather.winddirection : 45,
            solarRadiation: typeof data.daily?.shortwave_radiation_sum?.[0] === 'number' ? data.daily.shortwave_radiation_sum[0] : 18.2,
          };
        }
      } catch (err) {
        console.error('Server-side climate fetch error:', err);
      }
      return climate;
    })();

    // --- 2. Elevation Promise ---
    const elevationPromise = (async () => {
      let elevation = { elevation: 45.0, slope: 1.2 };
      try {
        const offset = 0.001;
        const points = [
          { lat, lng },
          { lat: lat + offset, lng },
          { lat: lat - offset, lng },
          { lat, lng: lng + offset },
          { lat, lng: lng - offset },
        ];
        const latParamStr = points.map(p => p.lat).join(',');
        const lngParamStr = points.map(p => p.lng).join(',');

        const res = await fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${latParamStr}&longitude=${lngParamStr}`,
          { next: { revalidate: 3600 } }
        );
        if (res.ok) {
          const data = await res.json();
          const e = Array.isArray(data.elevation) && data.elevation.length >= 5 ? data.elevation : [45.0, 45.0, 45.0, 45.0, 45.0];
          
          const dz_ns = Math.abs((e[1] ?? 45.0) - (e[2] ?? 45.0));
          const dz_ew = Math.abs((e[3] ?? 45.0) - (e[4] ?? 45.0));
          const dist = offset * 111000 * 2;
          const slope = (Math.max(dz_ns, dz_ew) / dist) * 100;

          elevation = {
            elevation: typeof e[0] === 'number' ? e[0] : 45.0,
            slope: isNaN(slope) ? 1.2 : slope,
          };
        }
      } catch (err) {
        console.error('Server-side elevation fetch error:', err);
      }
      return elevation;
    })();

    // --- 3. Soil Promise ---
    const soilPromise = (async () => {
      let soil = { ph: 6.8, organicCarbon: 4.5 };
      try {
        const res = await fetch(
          `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=phh2o&property=soc&depth=0-5cm&value=mean`,
          { 
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            next: { revalidate: 86400 } 
          }
        );
        if (res.ok) {
          const data = await res.json();
          const phLayer = data.properties?.layers?.find((l: any) => l.name === 'phh2o');
          const socLayer = data.properties?.layers?.find((l: any) => l.name === 'soc');

          const rawPh = phLayer?.depths?.[0]?.values?.mean;
          const rawSoc = socLayer?.depths?.[0]?.values?.mean;

          soil = {
            ph: typeof rawPh === 'number' ? rawPh / 10 : 6.8,
            organicCarbon: typeof rawSoc === 'number' ? rawSoc / 10 : 4.5,
          };
        }
      } catch (err) {
        console.error('Server-side soil fetch error:', err);
      }
      return soil;
    })();

    // Helper to get climate zone
    const getClimateZone = (latVal: number, tempVal: number, precipVal: number): 'Arid' | 'Tropical' | 'Temperate' | 'Subtropical' => {
      const absLat = Math.abs(latVal);
      const annualPrecip = precipVal * 365;
      if (tempVal >= 22 && annualPrecip >= 1200) {
        return 'Tropical';
      } else if (absLat > 35) {
        return 'Temperate';
      } else if (absLat > 22 && absLat <= 35) {
        return 'Subtropical';
      } else {
        if (annualPrecip < 600) {
          return 'Arid';
        } else {
          return 'Tropical';
        }
      }
    };

    // --- 4. Ecology Promise ---
    const ecologyPromise = (async () => {
      const clim = await climatePromise;
      const zone = getClimateZone(lat, clim.temperature, clim.precipitation);
      
      interface TaxonFallback {
        name: string;
        commonName: string;
        photoUrl: string;
        photoBase64: string;
      }

      const getFallbackEcology = (latVal: number, lngVal: number, zoneVal: string) => {
        if (zoneVal === 'Tropical') {
          return {
            taxa: ['Mangifera indica', 'Persea americana', 'Panthera onca', 'Ramphastos toco'],
            taxaDetails: [
              { name: 'Mangifera indica', commonName: 'Mango Tree', photoUrl: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5cf?w=400', photoBase64: '' },
              { name: 'Persea americana', commonName: 'Avocado Tree', photoUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400', photoBase64: '' },
              { name: 'Panthera onca', commonName: 'Jaguar', photoUrl: 'https://images.unsplash.com/photo-1551845187-578f244192b0?w=400', photoBase64: '' },
              { name: 'Ramphastos toco', commonName: 'Toco Toucan', photoUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=400', photoBase64: '' }
            ]
          };
        }
        
        if (zoneVal === 'Temperate') {
          return {
            taxa: ['Malus domestica', 'Symphytum officinale', 'Vulpes vulpes', 'Sciurus carolinensis'],
            taxaDetails: [
              { name: 'Malus domestica', commonName: 'Apple Tree', photoUrl: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400', photoBase64: '' },
              { name: 'Symphytum officinale', commonName: 'Comfrey', photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?w=400', photoBase64: '' },
              { name: 'Vulpes vulpes', commonName: 'Red Fox', photoUrl: 'https://images.unsplash.com/photo-1470093851219-69951fcbb533?w=400', photoBase64: '' },
              { name: 'Sciurus carolinensis', commonName: 'Eastern Gray Squirrel', photoUrl: 'https://images.unsplash.com/photo-1504244729573-6196d76f303c?w=400', photoBase64: '' }
            ]
          };
        }
        
        if (zoneVal === 'Subtropical') {
          return {
            taxa: ['Olea europaea', 'Ficus carica', 'Lynx pardinus', 'Genetta genetta'],
            taxaDetails: [
              { name: 'Olea europaea', commonName: 'Olive Tree', photoUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400', photoBase64: '' },
              { name: 'Ficus carica', commonName: 'Common Fig', photoUrl: 'https://images.unsplash.com/photo-1598965675045-45c5e72c7d05?w=400', photoBase64: '' },
              { name: 'Lynx pardinus', commonName: 'Iberian Lynx', photoUrl: 'https://images.unsplash.com/photo-1602491453977-18a86085a44f?w=400', photoBase64: '' },
              { name: 'Genetta genetta', commonName: 'Common Genet', photoUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400', photoBase64: '' }
            ]
          };
        }
        
        // Arid sub-classification
        const isSonoran = latVal >= 24 && latVal <= 40 && lng >= -125 && lng <= -100;
        const isAustralian = latVal >= -38 && latVal <= -15 && lng >= 110 && lng <= 155;
        const isArabian = latVal >= 15 && latVal <= 35 && lng >= 30 && lng <= 60;
        
        if (isSonoran) {
          return {
            taxa: ['Olneya tesota', 'Prosopis glandulosa', 'Odocoileus hemionus', 'Geococcyx californianus'],
            taxaDetails: [
              { name: 'Olneya tesota', commonName: 'Desert Ironwood', photoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', photoBase64: '' },
              { name: 'Prosopis glandulosa', commonName: 'Honey Mesquite', photoUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400', photoBase64: '' },
              { name: 'Odocoileus hemionus', commonName: 'Mule Deer', photoUrl: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?w=400', photoBase64: '' },
              { name: 'Geococcyx californianus', commonName: 'Greater Roadrunner', photoUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=400', photoBase64: '' }
            ]
          };
        }
        
        if (isAustralian) {
          return {
            taxa: ['Acacia aneura', 'Eucalyptus camaldulensis', 'Macropus rufus', 'Dromaius novaehollandiae'],
            taxaDetails: [
              { name: 'Acacia aneura', commonName: 'Mulga Tree', photoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', photoBase64: '' },
              { name: 'Eucalyptus camaldulensis', commonName: 'Red River Gum', photoUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400', photoBase64: '' },
              { name: 'Macropus rufus', commonName: 'Red Kangaroo', photoUrl: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=400', photoBase64: '' },
              { name: 'Dromaius novaehollandiae', commonName: 'Emu', photoUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400', photoBase64: '' }
            ]
          };
        }
        
        if (isArabian) {
          return {
            taxa: ['Acacia tortilis', 'Phoenix dactylifera', 'Oryx leucoryx', 'Chlamydotis macqueenii'],
            taxaDetails: [
              { name: 'Acacia tortilis', commonName: 'Umbrella Thorn Acacia', photoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', photoBase64: '' },
              { name: 'Phoenix dactylifera', commonName: 'Date Palm', photoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', photoBase64: '' },
              { name: 'Oryx leucoryx', commonName: 'Arabian Oryx', photoUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400', photoBase64: '' },
              { name: 'Chlamydotis macqueenii', commonName: 'Macqueen\'s Bustard', photoUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=400', photoBase64: '' }
            ]
          };
        }
        
        // Sahelian (Default)
        return {
          taxa: ['Acacia tortilis', 'Adansonia digitata', 'Vulpes zerda', 'Camelus dromedarius'],
          taxaDetails: [
            { name: 'Acacia tortilis', commonName: 'Umbrella Thorn Acacia', photoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400', photoBase64: '' },
            { name: 'Adansonia digitata', commonName: 'African Baobab', photoUrl: 'https://images.unsplash.com/photo-1559637283-ecf9fe8ba0c4?w=400', photoBase64: '' },
            { name: 'Vulpes zerda', commonName: 'Fennec Fox', photoUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', photoBase64: '' },
            { name: 'Camelus dromedarius', commonName: 'Dromedary Camel', photoUrl: 'https://images.unsplash.com/photo-1662841238473-f4b137e123cb?w=400', photoBase64: '' }
          ]
        };
      };

      let ecology = getFallbackEcology(lat, lng, zone);
      
      try {
        // Fetch Plants (Plantae) and Animals (Aves, Mammalia, etc.) in parallel
        const [resPlants, resAnimals] = await Promise.all([
          fetch(
            `https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=5&iconic_taxa=Plantae&per_page=5`,
            { next: { revalidate: 86400 } }
          ),
          fetch(
            `https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=5&iconic_taxa=Aves,Mammalia,Reptilia,Amphibia,Insecta,Arachnida&per_page=5`,
            { next: { revalidate: 86400 } }
          )
        ]);
        
        let plantResults = [];
        let animalResults = [];
        
        if (resPlants.ok) {
          const pData = await resPlants.json();
          plantResults = pData.results || [];
        }
        if (resAnimals.ok) {
          const aData = await resAnimals.json();
          animalResults = aData.results || [];
        }
        
        const topPlants = plantResults.slice(0, 2);
        const topAnimals = animalResults.slice(0, 2);
        const mergedResults = [...topPlants, ...topAnimals];
        
        if (mergedResults.length > 0) {
          const parsedTaxa = mergedResults
            ?.map((r: any) => r.taxon?.preferred_common_name || r.taxon?.name)
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0);
          
          const photoPromises = mergedResults.map(async (r: any) => {
            const name = r.taxon?.name || '';
            const commonName = r.taxon?.preferred_common_name || name;
            const photoUrl = r.taxon?.default_photo?.medium_url || r.taxon?.default_photo?.square_url || '';
            const photoBase64 = photoUrl ? await fetchBase64Image(photoUrl) : '';
            return { name, commonName, photoUrl, photoBase64 };
          });
          const resolvedDetails = await Promise.all(photoPromises);
          
          ecology = {
            taxa: parsedTaxa,
            taxaDetails: resolvedDetails
          };
        }
      } catch (err) {
        console.error('Server-side ecology fetch error:', err);
      }
      
      // Ensure fallbacks have their base64 loaded if they are used
      if (ecology && ecology.taxaDetails) {
        const needsBase64 = ecology.taxaDetails.some(t => !t.photoBase64);
        if (needsBase64) {
          const photoPromises = ecology.taxaDetails.map(async (item: any) => {
            if (!item.photoBase64) {
              let urlToFetch = item.photoUrl;
              if (!urlToFetch) {
                // Try to map name back to fallbacks
                const defaultItem = getFallbackEcology(lat, lng, zone).taxaDetails.find(d => d.name === item.name);
                urlToFetch = defaultItem?.photoUrl || '';
              }
              const base64 = urlToFetch ? await fetchBase64Image(urlToFetch) : '';
              return { name: item.name, commonName: item.commonName, photoUrl: urlToFetch, photoBase64: base64 };
            }
            return item;
          });
          ecology.taxaDetails = await Promise.all(photoPromises);
        }
      }
      
      return ecology;
    })();

    // --- 5. Maps Promise ---
    const mapsPromise = (async () => {
      let maps: {
        satelliteMap: string;
        topoMap: string;
        streetMap: string;
        hillshadeMap: string;
        bananaGuild?: string;
        waterHarvesting?: string;
        gravityDrip?: string;
        contourSwales?: string;
        concentricZoning?: string;
        functionalConcept?: string;
      } = { satelliteMap: '', topoMap: '', streetMap: '', hillshadeMap: '' };
      try {
        let minLat = lat - 0.0035;
        let maxLat = lat + 0.0035;
        let minLng = lng - 0.0035;
        let maxLng = lng + 0.0035;

        if (boundaryCoords && Array.isArray(boundaryCoords) && boundaryCoords.length > 0) {
          const lats = boundaryCoords.map(b => b.lat).filter(l => typeof l === 'number' && !isNaN(l));
          const lngs = boundaryCoords.map(b => b.lng).filter(g => typeof g === 'number' && !isNaN(g));
          if (lats.length > 0 && lngs.length > 0) {
            const bMinLat = Math.min(...lats);
            const bMaxLat = Math.max(...lats);
            const bMinLng = Math.min(...lngs);
            const bMaxLng = Math.max(...lngs);
            
            const latDiff = bMaxLat - bMinLat;
            const lngDiff = bMaxLng - bMinLng;
            
            const latPadding = Math.max(latDiff * 0.2, 0.001);
            const lngPadding = Math.max(lngDiff * 0.2, 0.001);
            
            minLat = bMinLat - latPadding;
            maxLat = bMaxLat + latPadding;
            minLng = bMinLng - lngPadding;
            maxLng = bMaxLng + lngPadding;
          }
        }

        // Enforce a minimum bounding box size of 0.02 degrees (~2.2km) to prevent ArcGIS export errors
        const minBoxSize = 0.02;
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

        const origin = new URL(request.url).origin;

        const clim = await climatePromise;
        const absLat = Math.abs(lat);
        const annualPrecip = clim.precipitation * 365;
        let climateZone = 'Arid';

        if (clim.temperature >= 22 && annualPrecip >= 1200) {
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

        let guildFileName = 'nano_banana_guild.png';
        if (climateZone === 'Tropical') {
          guildFileName = 'tropical_banana_guild.png';
        } else if (climateZone === 'Temperate') {
          guildFileName = 'temperate_apple_guild.png';
        } else if (climateZone === 'Subtropical') {
          guildFileName = 'mediterranean_olive_guild.png';
        } else if (climateZone === 'Arid') {
          guildFileName = 'arid_acacia_guild.png';
        }

        maps = {
          satelliteMap: satB64,
          topoMap: topoB64,
          streetMap: streetB64,
          hillshadeMap: reliefB64,
          bananaGuild: `${origin}/images/${guildFileName}`,
          waterHarvesting: '',
          gravityDrip: '',
          contourSwales: '',
          concentricZoning: '',
          functionalConcept: ''
        };
      } catch (err) {
        console.error('Server-side map compilation issue:', err);
      }
      return maps;
    })();

    // Resolve all promises concurrently to prevent serverless function timeout
    const [climate, elevation, soil, ecology, maps] = await Promise.all([
      climatePromise,
      elevationPromise,
      soilPromise,
      ecologyPromise,
      mapsPromise
    ]);

    return NextResponse.json({
      climate,
      elevation,
      soil,
      ecology,
      maps
    });

  } catch (globalErr: any) {
    console.error('Ecological API crash:', globalErr);
    return NextResponse.json({
      error: globalErr.message || 'Failed to compile ecological parameters'
    }, { status: 500 });
  }
}
