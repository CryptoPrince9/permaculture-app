import { NextResponse } from 'next/server';

function getCircleCoordsArray(centerLat: number, centerLng: number, radiusMeters: number): number[][] {
  const points: number[][] = [];
  const km = radiusMeters / 1000;
  const latOffset = km / 111.0;
  for (let i = 0; i <= 36; i++) {
    const angle = (i * 10 * Math.PI) / 180;
    const lngOffset = km / (111.0 * Math.cos((centerLat * Math.PI) / 180));
    const pLat = centerLat + latOffset * Math.sin(angle);
    const pLng = centerLng + lngOffset * Math.cos(angle);
    points.push([pLng, pLat]);
  }
  return points;
}

function getArcCoordsArray(centerLat: number, centerLng: number, radiusMeters: number, startAngleDeg: number, endAngleDeg: number): number[][] {
  const points: number[][] = [];
  const km = radiusMeters / 1000;
  const latOffset = km / 111.0;
  const steps = 15;
  const stepAngle = (endAngleDeg - startAngleDeg) / steps;
  for (let i = 0; i <= steps; i++) {
    const angle = ((startAngleDeg + i * stepAngle) * Math.PI) / 180;
    const lngOffset = km / (111.0 * Math.cos((centerLat * Math.PI) / 180));
    const pLat = centerLat + latOffset * Math.sin(angle);
    const pLng = centerLng + lngOffset * Math.cos(angle);
    points.push([pLng, pLat]);
  }
  return points;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const boundaryParam = searchParams.get('boundary');
    const projectName = searchParams.get('project') || 'Permaculture Landscape Plan';

    if (!latParam || !lngParam) {
      return new Response('Missing lat or lng', { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response('Invalid lat or lng', { status: 400 });
    }

    let boundaryCoords: Array<{ lat: number, lng: number }> = [];
    if (boundaryParam) {
      try {
        boundaryCoords = JSON.parse(boundaryParam);
      } catch (err) {
        console.error('GeoJSON export boundary parsing error:', err);
      }
    }

    if (boundaryCoords.length === 0) {
      const offsetLat = 0.00045; // ~50m
      const offsetLng = 0.00022; // ~25m
      boundaryCoords = [
        { lat: lat + offsetLat, lng: lng - offsetLng },
        { lat: lat + offsetLat, lng: lng + offsetLng },
        { lat: lat - offsetLat, lng: lng + offsetLng },
        { lat: lat - offsetLat, lng: lng - offsetLng },
      ];
    }

    // Close polygon ring
    const closedBoundary = [...boundaryCoords];
    if (closedBoundary.length > 0) {
      closedBoundary.push(closedBoundary[0]);
    }
    const boundaryPoints = closedBoundary.map(c => [c.lng, c.lat]);

    const zone1Points = getCircleCoordsArray(lat, lng, 15);
    const zone2Points = getCircleCoordsArray(lat, lng, 35);
    const zone3Points = getCircleCoordsArray(lat, lng, 65);
    const pondPoints = getCircleCoordsArray(lat, lng + 0.0002, 6);

    const swaleAPoints = getArcCoordsArray(lat, lng, 28, 120, 240);
    const swaleBPoints = getArcCoordsArray(lat, lng, 50, 120, 240);

    const shelterbeltPoints = [
      [lng + 0.0003, lat + 0.0004],
      [lng + 0.0005, lat + 0.0002],
      [lng + 0.0005, lat - 0.0002]
    ];

    const geojson = {
      type: "FeatureCollection",
      name: `${projectName} - farmOS & Mapeo Assets`,
      features: [
        {
          type: "Feature",
          properties: {
            name: "Property Boundary",
            type: "land",
            land_type: "property",
            status: "active",
            description: "The outer geographic limits of the permaculture project area."
          },
          geometry: {
            type: "Polygon",
            coordinates: [boundaryPoints]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Zone 0: Primary Settlement (House)",
            type: "structure",
            structure_type: "housing",
            status: "active",
            description: "The primary living space, center of high human activity and main roof water catchment surface."
          },
          geometry: {
            type: "Point",
            coordinates: [lng, lat]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Zone 1: Intensive Kitchen Garden",
            type: "land",
            land_type: "garden",
            status: "active",
            description: "Zone 1 intensive vegetable beds, compost loops, and nursery."
          },
          geometry: {
            type: "Polygon",
            coordinates: [zone1Points]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Zone 2: Semi-Intensive Agroforestry",
            type: "land",
            land_type: "orchard",
            status: "active",
            description: "Zone 2 fruit forest orchards, companion guilds, and gravity drip lines."
          },
          geometry: {
            type: "Polygon",
            coordinates: [zone2Points]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Zone 3: Grazing & Broadscale Crops",
            type: "land",
            land_type: "pasture",
            status: "active",
            description: "Zone 3 rotational animal grazing, grain fields, and animal structures."
          },
          geometry: {
            type: "Polygon",
            coordinates: [zone3Points]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Zone 2 Infiltration Pond",
            type: "water",
            water_type: "pond",
            status: "active",
            description: "A bio-retention pond located at a natural low point to capture contour overflow and recharge local groundwater."
          },
          geometry: {
            type: "Polygon",
            coordinates: [pondPoints]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Contour Swale A",
            type: "water",
            water_type: "swale",
            status: "active",
            description: "Passive earthwork trench on contour designed to intercept sheet flow runoff and hydrate Zone 2."
          },
          geometry: {
            type: "LineString",
            coordinates: swaleAPoints
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Contour Swale B",
            type: "water",
            water_type: "swale",
            status: "active",
            description: "Secondary level swale capturing sheet flow runoff and storing subsoil hydration buffers."
          },
          geometry: {
            type: "LineString",
            coordinates: swaleBPoints
          }
        },
        {
          type: "Feature",
          properties: {
            name: "Shelterbelt Windbreak",
            type: "land",
            land_type: "forest",
            status: "active",
            description: "Tiered multi-row shelterbelt block to buffer wind vectors and reduce wind erosion."
          },
          geometry: {
            type: "LineString",
            coordinates: shelterbeltPoints
          }
        }
      ]
    };

    return new Response(JSON.stringify(geojson, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/geo+json',
        'Content-Disposition': `attachment; filename="${projectName.replace(/\s+/g, '_')}_farmOS_Mapeo.geojson"`,
      },
    });

  } catch (globalErr: any) {
    console.error('GeoJSON Exporter crash:', globalErr);
    return new Response('Failed to compile GeoJSON file', { status: 500 });
  }
}
