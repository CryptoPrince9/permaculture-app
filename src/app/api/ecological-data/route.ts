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
          climate = {
            temperature: typeof data.current_weather?.temperature === 'number' ? data.current_weather.temperature : 24.5,
            precipitation: typeof data.daily?.precipitation_sum?.[0] === 'number' ? data.daily.precipitation_sum[0] : 1.2,
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

    // --- 4. Ecology Promise ---
    const ecologyPromise = (async () => {
      let ecology = { 
        taxa: ['Acacia tortilis', 'Adansonia digitata', 'Moringa oleifera', 'Azadirachta indica'],
        taxaDetails: [
          { name: 'Acacia tortilis', commonName: 'Umbrella Thorn Acacia', photoBase64: '' },
          { name: 'Adansonia digitata', commonName: 'African Baobab', photoBase64: '' },
          { name: 'Moringa oleifera', commonName: 'Moringa tree', photoBase64: '' },
          { name: 'Azadirachta indica', commonName: 'Neem tree', photoBase64: '' }
        ]
      };

      try {
        const res = await fetch(
          `https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=5&per_page=10`,
          { next: { revalidate: 86400 } }
        );
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          
          const parsedTaxa = results
            ?.map((r: any) => r.taxon?.preferred_common_name || r.taxon?.name)
            .filter((name: any) => typeof name === 'string' && name.trim().length > 0);
          
          if (Array.isArray(parsedTaxa) && parsedTaxa.length > 0) {
            const details = [];
            // Fetch default photos for the top 4 species in parallel
            const photoPromises = results.slice(0, 4).map(async (r: any) => {
              const name = r.taxon?.name || '';
              const commonName = r.taxon?.preferred_common_name || name;
              const photoUrl = r.taxon?.default_photo?.medium_url || r.taxon?.default_photo?.square_url || '';
              const photoBase64 = photoUrl ? await fetchBase64Image(photoUrl) : '';
              return { name, commonName, photoBase64 };
            });
            const resolvedDetails = await Promise.all(photoPromises);
            
            ecology = {
              taxa: parsedTaxa,
              taxaDetails: resolvedDetails
            };
          }
        }
      } catch (err) {
        console.error('Server-side ecology fetch error:', err);
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

        const loadBase64Asset = (fileName: string, mime: string = 'image/jpeg'): string => {
          try {
            const filePath = path.join(process.cwd(), 'public/images', fileName);
            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              return `data:${mime};base64,${buffer.toString('base64')}`;
            }
          } catch (err) {
            console.error(`Error loading asset ${fileName}:`, err);
          }
          return '';
        };

        maps = {
          satelliteMap: satB64,
          topoMap: topoB64,
          streetMap: streetB64,
          hillshadeMap: reliefB64,
          bananaGuild: loadBase64Asset('nano_banana_guild.jpg'),
          waterHarvesting: loadBase64Asset('water_harvesting.jpg'),
          gravityDrip: loadBase64Asset('gravity_drip.jpg'),
          contourSwales: loadBase64Asset('contour_swales.jpg'),
          concentricZoning: loadBase64Asset('concentric_zoning.jpg'),
          functionalConcept: loadBase64Asset('functional_concept.jpg')
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
