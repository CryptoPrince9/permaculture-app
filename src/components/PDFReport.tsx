import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle, Rect, Line, Polygon, G, Image } from '@react-pdf/renderer';
import { ClimateData, ElevationData, SoilData } from '../lib/api';
import { GeneratedReport } from '../lib/reportGenerator';

const safeFixed = (val: any, decimals: number = 1, fallback: string = "0.0"): string => {
    if (val === null || val === undefined || isNaN(Number(val))) return fallback;
    return Number(val).toFixed(decimals);
};

const calculateArea = (coords: Array<{ lat: number; lng: number }> | null | undefined): number => {
    if (!coords) return 2500;
    const validCoords = coords.filter(c => c && typeof c.lat === 'number' && !isNaN(c.lat) && typeof c.lng === 'number' && !isNaN(c.lng));
    if (validCoords.length < 3) return 2500;

    const lats = validCoords.map(c => c.lat);
    const avgLat = lats.reduce((sum, val) => sum + val, 0) / lats.length;
    const radLat = avgLat * Math.PI / 180;
    
    const latMetersPerDegree = 111320;
    const lngMetersPerDegree = 111320 * Math.cos(radLat);
    
    const ref = validCoords[0];
    const points = validCoords.map(c => ({
        x: (c.lng - ref.lng) * lngMetersPerDegree,
        y: (c.lat - ref.lat) * latMetersPerDegree
    }));
    
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        area += p1.x * p2.y - p2.x * p1.y;
    }
    return Math.abs(area / 2);
};

const formatArea = (area: number): string => {
    if (area >= 10000) {
        const ha = area / 10000;
        return `${area.toLocaleString(undefined, { maximumFractionDigits: 0 })} m² (${ha.toFixed(2)} ha)`;
    }
    return `${area.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`;
};

const getWindSector = (deg: number): string => {
    const sectors = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return sectors[index];
};

const getWindDirectionName = (deg: number): string => {
    const names = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return names[index];
};

const styles = StyleSheet.create({
    page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
    coverPage: { padding: 50, backgroundColor: '#1b4332', fontFamily: 'Helvetica', justifyContent: 'center', height: '100%' },
    coverSubtitle: { fontSize: 12, color: '#8fba9f', textTransform: 'uppercase', tracking: 2, marginBottom: 10, fontWeight: 'bold' },
    coverTitle: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 20 },
    coverMeta: { 
        borderTopWidth: 2, 
        borderTopColor: '#8fba9f', 
        borderTopStyle: 'solid', 
        paddingTop: 20, 
        marginTop: 40, 
        color: '#d8f3dc', 
        fontSize: 10, 
        lineHeight: 1.6 
    },
    header: { 
        fontSize: 8, 
        color: '#64748b', 
        borderBottomWidth: 1, 
        borderBottomColor: '#e2e8f0', 
        borderBottomStyle: 'solid', 
        paddingBottom: 8, 
        marginBottom: 20, 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        textTransform: 'uppercase',
        fontWeight: 'bold'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#cbd5e1',
        borderTopStyle: 'solid',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7,
        color: '#94a3b8'
    },
    h1: { fontSize: 18, fontWeight: 'bold', color: '#1b4332', marginBottom: 12, textTransform: 'uppercase' },
    h2: { fontSize: 12, fontWeight: 'bold', color: '#2d6a4f', marginTop: 15, marginBottom: 8 },
    bodyText: { fontSize: 9, lineHeight: 1.6, color: '#334155', marginBottom: 10 },
    caption: { fontSize: 7, italic: true, color: '#64748b', marginTop: 4, textAlign: 'center' },
    grid: { flexDirection: 'row', gap: 15, marginVertical: 15 },
    col: { 
        flex: 1, 
        backgroundColor: '#f8fafc', 
        padding: 12, 
        borderRadius: 6, 
        borderWidth: 1, 
        borderColor: '#f1f5f9', 
        borderStyle: 'solid' 
    },
    metricLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' },
    metricVal: { fontSize: 12, fontWeight: 'bold', color: '#1b4332', marginTop: 4 },
    table: { display: "flex", flexDirection: "column", width: "auto", borderStyle: "solid", borderWidth: 1, borderColor: '#e2e8f0', marginVertical: 10, borderRadius: 4, overflow: 'hidden' },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 20, alignItems: 'center' },
    tableHeaderRow: { flexDirection: "row", backgroundColor: '#f1f5f9', borderBottomWidth: 2, borderBottomColor: '#cbd5e1', minHeight: 22, alignItems: 'center' },
    tableCellHeader: { marginHorizontal: 8, fontSize: 8, fontWeight: 'bold', color: '#334155', flex: 1 },
    tableCell: { marginHorizontal: 8, fontSize: 8, color: '#475569', flex: 1 },
    drawingContainer: {
        width: '100%',
        height: 240,
        backgroundColor: '#fafaf9',
        borderWidth: 1,
        borderColor: '#e7e5e4',
        borderStyle: 'solid',
        borderRadius: 8,
        marginVertical: 15,
        justifyContent: 'center',
        alignItems: 'center'
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
        marginVertical: 15
    },
    photoCard: {
        width: '47%',
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderStyle: 'solid',
        padding: 8,
        marginBottom: 10
    },
    photoImage: {
        width: '100%',
        height: 100,
        borderRadius: 4,
        marginBottom: 6,
        objectFit: 'cover'
    },
    photoTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1b4332',
        marginBottom: 2
    },
    photoSubtitle: {
        fontSize: 7,
        italic: true,
        color: '#64748b'
    }
});

interface TaxonDetail {
    name: string;
    commonName: string;
    photoBase64: string;
}

interface PDFReportProps {
    location: { lat: number; lng: number } | null;
    boundaryCoords?: Array<{ lat: number; lng: number }> | null;
    climate: ClimateData | null;
    elevation: ElevationData | null;
    soil: SoilData | null;
    ecology: {
        taxa: string[];
        taxaDetails?: TaxonDetail[];
    } | null;
    userData: { projectName: string; clientName: string; goals: string; budget: string; };
    sunData: any;
    generatedReport: GeneratedReport | null;
    maps: { 
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
    } | null;
}

const PDFReport = ({ location, boundaryCoords, climate, elevation, soil, ecology, userData, sunData, generatedReport, maps }: PDFReportProps) => {
    const latStr = location ? `${safeFixed(location.lat, 5, "14.43204")}°N` : "14.43204°N";
    const lngStr = location ? `${safeFixed(location.lng, 5, "-16.25148")}°W` : "16.25148°W";

    // Calculate bounding box matching the geoproxy API bounds
    let minLat = location ? location.lat - 0.0035 : 14.43204 - 0.0035;
    let maxLat = location ? location.lat + 0.0035 : 14.43204 + 0.0035;
    let minLng = location ? location.lng - 0.0035 : -16.25148 - 0.0035;
    let maxLng = location ? location.lng + 0.0035 : -16.25148 + 0.0035;

    if (location && boundaryCoords && boundaryCoords.length > 0) {
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

    const projectLng = (lngVal: number) => {
        return ((lngVal - minLng) / (maxLng - minLng)) * 400;
    };
    
    const projectLat = (latVal: number) => {
        return ((maxLat - latVal) / (maxLat - minLat)) * 200;
    };

    const hX = location ? projectLng(location.lng) : 200;
    const hY = location ? projectLat(location.lat) : 100;

    const calculatedArea = calculateArea(boundaryCoords);
    const areaStr = formatArea(calculatedArea);

    const latVal = location ? location.lat : 14.43204;
    const isNorthern = latVal >= 0;

    const precipVal = climate ? climate.precipitation : 1.2;
    const tempVal = climate ? climate.temperature : 24.5;
    const absLat = Math.abs(latVal);
    const annualPrecip = precipVal * 365;

    let climateZone: 'Arid' | 'Tropical' | 'Temperate' | 'Subtropical' = 'Arid';

    if (tempVal >= 22 && annualPrecip >= 1200) {
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

    const designConfig = {
        Arid: {
            zoneName: "Arid/Sahelian Dryland System",
            plantGuildTitle: "Sahelian Syntropic Agroforestry Guild Design",
            plantGuildIntro: "Designed to combat desertification and wind erosion in arid zones by pairing drought-resilient overstory species with fast-growing nitrogen fixers.",
            plantGuildDescription: "The guild centers on the African Baobab and Umbrella Thorn Acacia, which create windbreaks and light shade filters. Moringa and Pigeon Pea produce continuous chop-and-drop biomass to rebuild soil organic matter, while marigolds protect the root zones.",
            guildSpecies: [
                { layer: "1. Overstory Canopy", species: "Adansonia digitata (Baobab)", role: "Deep taproots, shade, windbreak" },
                { layer: "2. Understory Nitrogen", species: "Acacia tortilis (Umbrella Thorn)", role: "Nitrogen fixation, sand stabilization" },
                { layer: "3. Chop-and-Drop Biomass", species: "Moringa oleifera (Moringa)", role: "High-protein biomass, mineral accumulation" },
                { layer: "4. Herbaceous Companion", species: "Cajanus cajan (Pigeon Pea)", role: "Root aeration, edible pea pods" }
            ],
            guildLowerHeading: "Musa 'Truly Tiny' (Nano Banana) Arid Guild Layout",
            guildLowerText: "The design details our dwarf banana guild adapted for dry regions. The central banana sits in a micro-catchment basin, insulated by sweet potato live-mulch to protect root moisture, and supported by comfrey and pigeon pea.",
            waterTitle: "Sahelian Rainwater Harvesting & Cistern Loop",
            waterIntro: "Rainwater calculations are calibrated for the high-intensity seasonal storms of arid regions. Gutters channel runoff through a first-flush diverter to a 20,000L cistern.",
            waterSpecs: "FIRST-FLUSH DIVERTER + 20,000L CISTERN STORAGE",
            dripTitle: "Arid Gravity-Fed Drip & Buried Ollas",
            dripIntro: "Distributes stored water via a low-pressure drip line coupled with porous clay Ollas. Ollas are buried next to trees, seeping water directly to root zones with zero evaporation.",
            dripSpecs: "GRAVITY-FED DRIP + BURIED CLAY OLLAS",
            swalesTitle: "Contour Swales & Micro-Catchment Trenches",
            swalesIntro: "Level swales capture high-volume flash runoff. Swale beds are backfilled with organic matter to act as underground sponges, keeping trees hydrated through dry seasons.",
            swalesSpecs: "INFILTRATION CONTOUR SWALES + STORAGE POND",
            zoningIntro: "Concentric zoning in arid areas centers around Zone 0 to provide windbreaks and thermal shading. Zone 1 kitchen gardens are placed on the eastern side to capture morning sun while avoiding harsh afternoon rays.",
            conceptIntro: "The functional bubble concept connects Zone 0 greywater to Zone 2 fruit orchards, and routes compost manure to Zone 1 beds, closing nutrient loops under high evaporation stress."
        },
        Tropical: {
            zoneName: "Humid Tropical Forest System",
            plantGuildTitle: "Humid Tropical Canopy Guild Design",
            plantGuildIntro: "Designed for high-precipitation tropical environments, optimizing vertical space across multiple canopy layers and managing heavy weed competition.",
            plantGuildDescription: "The guild features a fast-growing overstory of Mango or Avocado, understory bananas (Musa 'Grand Nain'), and a vigorous ground layer of Ginger, Turmeric, and Vetiver grass to prevent soil erosion.",
            guildSpecies: [
                { layer: "1. Overstory Canopy", species: "Mangifera indica (Mango) / Avocado", role: "Upper shade canopy, seasonal fruit yield" },
                { layer: "2. Understory Heavy Feeder", species: "Musa acuminata (Grand Nain Banana)", role: "Rapid nutrient cycling, water storage" },
                { layer: "3. Herbaceous Layer", species: "Zingiber officinale (Ginger) / Turmeric", role: "Valuable shade-tolerant cash crop" },
                { layer: "4. Groundcover & Erosion", species: "Vetiveria zizanioides (Vetiver Grass)", role: "Deep roots stabilizing contours and runoff" }
            ],
            guildLowerHeading: "Musa 'Grand Nain' Tropical Guild Layout",
            guildLowerText: "The central tropical banana plant is paired with sweet potato for complete soil coverage, ginger/turmeric for subsoil utilization, and vetiver grass on the downhill edge to arrest soil runoff.",
            waterTitle: "Tropical Runoff Management & Rain Gardens",
            waterIntro: "Rainwater systems focus on drainage and overflow safety. Catchment piping directs excess roof runoff away from structures into bio-retention swales and rain gardens.",
            waterSpecs: "SEDIMENTATION BASINS + BIO-RETENTION BYPASS",
            dripTitle: "Sub-Surface Drainage & Passive Hydration",
            dripIntro: "Irrigation is primarily passive. Sub-surface drainage channels divert standing water from Zone 1 to Zone 3 timber blocks, maintaining soil aeration during wet season peaks.",
            dripSpecs: "SUB-SURFACE DRAINAGE + PASSIVE RAIN GRADIENTS",
            swalesTitle: "Vetiver Grass Contours & Drainage Swales",
            swalesIntro: "Swales are designed with a slight grade (0.5%) to slowly drain excess water into natural waterways, preventing waterlogging and anaerobic root conditions.",
            swalesSpecs: "DRAINAGE CONTOURS + VETIVER SOIL BINDERS",
            zoningIntro: "Concentric zoning in humid climates prioritizes ventilation and air circulation. Zone 1 gardens are raised to prevent root rot, while dense Zone 4 forestry buffers protect against tropical storms.",
            conceptIntro: "The functional bubble concept connects roof runoff to aquaculture ponds and directs chicken coop wastes to compost yards, mitigating nutrient leaching from heavy rains."
        },
        Temperate: {
            zoneName: "Temperate Deciduous Forest System",
            plantGuildTitle: "Temperate Apple & Comfrey Guild Design",
            plantGuildIntro: "Designed for temperate climates to maximize solar gain, accumulate subsoil nutrients, and protect root zones from freezing winters.",
            plantGuildDescription: "The guild centers on Apple or Pear trees, surrounded by clover to fix nitrogen, comfrey to mine subsoil minerals, marigolds to repel pests, and currants to yield berries in partial shade.",
            guildSpecies: [
                { layer: "1. Overstory Canopy", species: "Malus domestica (Honeycrisp Apple)", role: "Deciduous fruit crop, solar-permeable winter canopy" },
                { layer: "2. Shrub Layer", species: "Ribes rubrum (Red Currant)", role: "Shade-tolerant berry yield, understory cycling" },
                { layer: "3. Dynamic Accumulator", species: "Symphytum officinale (Comfrey)", role: "Deep mining of potash, nutrient mulch accumulator" },
                { layer: "4. Nitrogen Cover Crop", species: "Trifolium repens (White Clover)", role: "Living green mulch, nitrogen fixation, pollinator lure" }
            ],
            guildLowerHeading: "Malus domestica (Apple) Temperate Guild Layout",
            guildLowerText: "The central Apple tree is surrounded by a ring of Comfrey plants (cut back 3 times a season for mulch), white clover living mulch, and garlic chives to prevent fungal scab.",
            waterTitle: "Temperate Keyline Dams & Swale Networks",
            waterIntro: "Calibrated for steady year-round rain. Runoff is captured in series ponds that store heat energy, acting as thermal mass to buffer local temperature drops.",
            waterSpecs: "THERMAL MASS PONDS + DETENTION SWALES",
            dripTitle: "Standard Gravity-Fed Drip & Straw Mulch",
            dripIntro: "Distributes water through high-durability drip lines laid under a thick layer of straw or woodchip mulch, reducing evaporation and feeding soil fungi.",
            dripSpecs: "GRAVITY-FED DRIP + HEAVY WOODCHIP MULCH",
            swalesTitle: "Contour Swales & Keyline Diversion Drains",
            swalesIntro: "Level swales are placed on keyline contours to spread water from valley pockets out to dry ridges, maximizing soil hydration across the entire slope.",
            swalesSpecs: "KEYLINE SWALES + COLD-SEASON BYPASS PONDS",
            zoningIntro: "Concentric zoning in temperate regions is shaped by the solar arc. Zone 1 gardens are placed on the south-facing slope of the house, while Zone 4 conifers form a northern windbreak.",
            conceptIntro: "The functional bubble concept routes household heating flue exhaust to greenhouses, and cycles deciduous leaf drops into compost layers to feed Zone 1 beds."
        },
        Subtropical: {
            zoneName: "Subtropical/Mediterranean Olive & Fig System",
            plantGuildTitle: "Mediterranean Olive & Fig Guild Design",
            plantGuildIntro: "Designed for winter-wet, summer-dry climates. Focuses on fire resilience, deep soil shading, and drought-tolerant companion plantings.",
            plantGuildDescription: "The guild centers on Olive or Fig trees, supported by nitrogen-fixing Spanish Broom, dynamic accumulator artichokes, and aromatic pest barriers like rosemary, lavender, and thyme.",
            guildSpecies: [
                { layer: "1. Overstory Canopy", species: "Olea europaea (Olive) / Ficus carica (Fig)", role: "Drought-hardy oil and fruit crop, evergreen shade" },
                { layer: "2. Nitrogen Shrub", species: "Genista monspessulana (Spanish Broom)", role: "Drought-hardy nitrogen fixing woody pioneer" },
                { layer: "3. Dynamic Accumulator", species: "Cynara cardunculus (Globe Artichoke)", role: "Deep roots mining minerals, broad organic leaf mulch" },
                { layer: "4. Aromatic Pest Barrier", species: "Rosmarinus / Lavandula / Thyme", role: "Essential oils repelling pests, attracting honeybees" }
            ],
            guildLowerHeading: "Olea europaea (Olive) Mediterranean Guild Layout",
            guildLowerText: "The central Olive tree is paired with globe artichoke for organic leaf mulch, spanish broom for nitrogen, and rosemary and thyme to create a pest-repelling ground ring.",
            waterTitle: "Mediterranean Terraces & Cistern Storage",
            waterIntro: "Calibrated for wet winters and dry summers. Rainwater is harvested from roofs during winter and stored in cisterns to irrigate through dry summer months.",
            waterSpecs: "WINTER CISTERN STORAGE + PASSIVE SOIL SPONGES",
            dripTitle: "Standard Drip & Stone Mulching",
            dripIntro: "Uses drip lines coupled with heavy stone mulch. Stacking flat stones around the root zone cools the soil and condenses morning dew, adding passive hydration.",
            dripSpecs: "GRAVITY DRIP + STONE THERMAL CONDENSERS",
            swalesTitle: "Terraced Swales & Stone-Lined Trenches",
            swalesIntro: "On sloped Mediterranean land, swales are reinforced with stone walls. This creates stable terraces that slow down winter torrents and prevent mudslides.",
            swalesSpecs: "STONE-REINFORCED SWALES + COLD-WATER PONDS",
            zoningIntro: "Concentric zoning focuses on fire safety and water efficiency. Zone 1 gardens are placed close to the house, while Zone 3 olives and figs act as a fire-resistant shelterbelt.",
            conceptIntro: "The functional bubble concept connects kitchen greywater to sub-surface olive roots, and routes dry grass clippings to sheep paddocks in Zone 3."
        }
    };

    const activeDesign = designConfig[climateZone];

    const getMiniBoundaryPoints = () => {
        if (!boundaryCoords || boundaryCoords.length < 3) {
            return "10,10 40,10 40,40 10,40";
        }
        const lats = boundaryCoords.map(c => c.lat);
        const lngs = boundaryCoords.map(c => c.lng);
        const minLatVal = Math.min(...lats);
        const maxLatVal = Math.max(...lats);
        const minLngVal = Math.min(...lngs);
        const maxLngVal = Math.max(...lngs);

        const latDiff = maxLatVal - minLatVal || 0.001;
        const lngDiff = maxLngVal - minLngVal || 0.001;
        const maxDiff = Math.max(latDiff, lngDiff);

        return boundaryCoords.map(c => {
            const x = 5 + ((c.lng - minLngVal) / maxDiff) * 40 + (40 - (lngDiff / maxDiff) * 40) / 2;
            const y = 5 + ((maxLatVal - c.lat) / maxDiff) * 40 + (40 - (latDiff / maxDiff) * 40) / 2;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    };
    const miniBoundaryPoints = getMiniBoundaryPoints();

    const windDir = climate ? climate.windDirection : 45;
    const windSpd = climate ? climate.windSpeed : 12.5;
    const windSector = getWindSector(windDir);
    const windDirectionName = getWindDirectionName(windDir);

    const afternoonSunAzimuth = isNorthern ? 240 : 300;
    const afternoonSectorShort = isNorthern ? "WSW" : "WNW";
    const afternoonSectorName = isNorthern ? "West-Southwest" : "West-Northwest";
    const fireRotation = afternoonSunAzimuth - 270;

    // Summer Arc: curves North if Northern Hemisphere, else curves South
    const summerArcPath = isNorthern
      ? `M ${hX - 50} ${hY} A 50 25 0 0 1 ${hX + 50} ${hY}`
      : `M ${hX - 50} ${hY} A 50 25 0 0 0 ${hX + 50} ${hY}`;
      
    const winterArcPath = isNorthern
      ? `M ${hX - 50} ${hY} A 50 25 0 0 0 ${hX + 50} ${hY}`
      : `M ${hX - 50} ${hY} A 50 25 0 0 1 ${hX + 50} ${hY}`;
      
    const summerTextY = isNorthern ? hY - 30 : hY + 35;
    const winterTextY = isNorthern ? hY + 35 : hY - 30;

    const windLabelRad = (windDir - 90) * Math.PI / 180;
    const windLabelX = Math.max(10, Math.min(350, hX + 85 * Math.cos(windLabelRad) - 25));
    const windLabelY = Math.max(15, Math.min(185, hY + 85 * Math.sin(windLabelRad)));

    const metersToDegreesLat = (meters: number) => meters / 111320;
    
    const getSvgRadius = (meters: number) => {
        const deg = metersToDegreesLat(meters);
        return (deg / (maxLat - minLat)) * 200;
    };

    // Calculate map scale length dynamically
    const radLat = (location ? location.lat : 14.43204) * Math.PI / 180;
    const mapWidthMeters = (maxLng - minLng) * 111320 * Math.cos(radLat);
    let scaleMeters = 25;
    if (mapWidthMeters > 500) scaleMeters = 100;
    if (mapWidthMeters > 2000) scaleMeters = 500;
    if (mapWidthMeters < 50) scaleMeters = 10;
    const scaleBarWidthSvg = (scaleMeters / mapWidthMeters) * 400;

    // Property Boundary SVG polygon points
    const boundaryPoints = (boundaryCoords && boundaryCoords.length >= 3)
        ? boundaryCoords.map(c => `${projectLng(c.lng)},${projectLat(c.lat)}`).join(' ')
        : `${projectLng(minLng + (maxLng-minLng)*0.15)},${projectLat(minLat + (maxLat-minLat)*0.15)} ` +
          `${projectLng(maxLng - (maxLng-minLng)*0.15)},${projectLat(minLat + (maxLat-minLat)*0.15)} ` +
          `${projectLng(maxLng - (maxLng-minLng)*0.15)},${projectLat(maxLat - (maxLat-minLat)*0.15)} ` +
          `${projectLng(minLng + (maxLng-minLng)*0.15)},${projectLat(maxLat - (maxLat-minLat)*0.15)}`;

    // Generate a curved swale path passing through the property
    const getSwalePath = (yPercent: number) => {
        if (!boundaryCoords || boundaryCoords.length < 3) {
            return `M ${projectLng(minLng + (maxLng-minLng)*0.25)} ${projectLat(minLat + (maxLat-minLat)*yPercent)} Q 200 ${projectLat(minLat + (maxLat-minLat)*yPercent) + 10} ${projectLng(minLng + (maxLng-minLng)*0.75)} ${projectLat(minLat + (maxLat-minLat)*yPercent)}`;
        }
        const lngs = boundaryCoords.map(c => c.lng);
        const lats = boundaryCoords.map(c => c.lat);
        const minB_Lng = Math.min(...lngs);
        const maxB_Lng = Math.max(...lngs);
        const minB_Lat = Math.min(...lats);
        const maxB_Lat = Math.max(...lats);
        
        const startLng = minB_Lng + (maxB_Lng - minB_Lng) * 0.15;
        const endLng = minB_Lng + (maxB_Lng - minB_Lng) * 0.85;
        const midLng = (startLng + endLng) / 2;
        
        const latVal = minB_Lat + (maxB_Lat - minB_Lat) * yPercent;
        
        const x1 = projectLng(startLng);
        const y1 = projectLat(latVal);
        const xm = projectLng(midLng);
        const ym = projectLat(latVal - (maxB_Lat - minB_Lat) * 0.05); // Curve slightly
        const x2 = projectLng(endLng);
        const y2 = projectLat(latVal);
        
        return `M ${x1} ${y1} Q ${xm} ${ym} ${x2} ${y2}`;
    };

    // NE Windbreak path
    const getWindbreakPath = () => {
        if (!boundaryCoords || boundaryCoords.length < 3) {
            return `M 320 30 L 350 70`;
        }
        const sortedByNE = [...boundaryCoords].sort((a, b) => (b.lat + b.lng) - (a.lat + a.lng));
        const nePoint = sortedByNE[0];
        const secondNEPoint = sortedByNE[1] || boundaryCoords[0];
        
        return `M ${projectLng(secondNEPoint.lng)} ${projectLat(secondNEPoint.lat)} L ${projectLng(nePoint.lng)} ${projectLat(nePoint.lat)}`;
    };

    // Lowest point (Southern side) for Pond placement
    const getPondCenter = () => {
        if (!boundaryCoords || boundaryCoords.length < 3) {
            return { x: 300, y: 110 };
        }
        const sortedBySouth = [...boundaryCoords].sort((a, b) => a.lat - b.lat);
        const southPoint = sortedBySouth[0];
        // Offset slightly north/inside the boundary
        return { x: projectLng(southPoint.lng), y: projectLat(southPoint.lat) - 15 };
    };
    const pondC = getPondCenter();

    // Trees layout inside property boundary
    const getAgroforestryTrees = () => {
        if (!location) return null;
        if (!boundaryCoords || boundaryCoords.length < 3) {
            // Default fallbacks
            return (
                <>
                    <Circle cx="160" cy="110" r="14" fill="#4ade80" opacity={0.6} stroke="#16a34a" strokeWidth="1" />
                    <Circle cx="160" cy="110" r="4" fill="#15803d" />
                    <Circle cx="260" cy="120" r="16" fill="#4ade80" opacity={0.6} stroke="#16a34a" strokeWidth="1" />
                    <Circle cx="260" cy="120" r="5" fill="#15803d" />
                </>
            );
        }
        const lngs = boundaryCoords.map(c => c.lng);
        const lats = boundaryCoords.map(c => c.lat);
        const minB_Lng = Math.min(...lngs);
        const maxB_Lng = Math.max(...lngs);
        const minB_Lat = Math.min(...lats);
        const maxB_Lat = Math.max(...lats);

        const trees = [
            { lng: minB_Lng + (maxB_Lng - minB_Lng)*0.4, lat: minB_Lat + (maxB_Lat - minB_Lat)*0.4, r: 10 },
            { lng: minB_Lng + (maxB_Lng - minB_Lng)*0.55, lat: minB_Lat + (maxB_Lat - minB_Lat)*0.42, r: 12 },
            { lng: minB_Lng + (maxB_Lng - minB_Lng)*0.68, lat: minB_Lat + (maxB_Lat - minB_Lat)*0.38, r: 8 },
            { lng: minB_Lng + (maxB_Lng - minB_Lng)*0.45, lat: minB_Lat + (maxB_Lat - minB_Lat)*0.58, r: 10 },
            { lng: minB_Lng + (maxB_Lng - minB_Lng)*0.58, lat: minB_Lat + (maxB_Lat - minB_Lat)*0.62, r: 14 }
        ];
        return trees.map((t, idx) => (
            <React.Fragment key={idx}>
                <Circle cx={projectLng(t.lng)} cy={projectLat(t.lat)} r={t.r} fill="#22c55e" opacity={0.5} stroke="#15803d" strokeWidth="0.5" />
                <Circle cx={projectLng(t.lng)} cy={projectLat(t.lat)} r={1.5} fill="#14532d" />
            </React.Fragment>
        ));
    };
    
    const Header = ({ sectionTitle }: { sectionTitle: string }) => (
        <View style={styles.header}>
            <Text>{userData.projectName || "PERMACULTURE PORTFOLIO"}</Text>
            <Text>{sectionTitle}</Text>
        </View>
    );

    const Footer = ({ pageNum }: { pageNum: string }) => (
        <View style={styles.footer}>
            <Text>Client: {userData.clientName || "Ahmed Khalil"}</Text>
            <Text>Coordinates: {latStr}, {lngStr}</Text>
            <Text>Page {pageNum}</Text>
        </View>
    );

    return (
        <Document>
            {/* PAGE 1: TITLE & COVER PAGE */}
            <Page size="A4" style={styles.coverPage}>
                <View>
                    <Text style={styles.coverSubtitle}>Permaculture Design Course (PDC) Portfolio</Text>
                    <Text style={styles.coverTitle}>{(userData?.projectName || "HEAVEN'S GATE: GOSSAS, SENEGAL").toUpperCase()}</Text>
                    <Text style={{ fontSize: 14, color: '#d8f3dc', marginBottom: 30, fontWeight: 'bold' }}>
                        A Professional 21-Section Site Design & Hydrological Plan
                    </Text>
                    
                    <View style={styles.coverMeta}>
                        <Text>CLIENT / STEWARD: {userData.clientName || "Ahmed Khalil"}</Text>
                        <Text>GEOGRAPHIC COORDINATES: {latStr}, {lngStr}</Text>
                        <Text>ECOLOGICAL CLASSIFICATION: Dryland / Sahelian Syntropic Buffer Zone</Text>
                        <Text>BUDGET FRAMEWORK: {userData.budget ? `$${userData.budget}` : "Phase-decoupled CAPEX bootstrap"}</Text>
                        <Text>DATE GENERATED: {new Date().toLocaleDateString()}</Text>
                    </View>
                </View>
            </Page>

            {/* PAGE 2: Executive Summary & Site Credentials (Sec 01) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="01 | Site Credentials" />
                <Text style={styles.h1}>Executive Summary & Credentials</Text>
                <Text style={styles.bodyText}>
                    This comprehensive permaculture master plan presents a detailed, site-specific regenerative design framework for the property at {userData.projectName || "Heaven's Gate: Gossas, Senegal"}. Grounded in the classic Yeomans Scale of Permanence and the structured OBREDIM (Observation, Boundaries, Resources, Evaluation, Design, Implementation, Maintenance) methodology, this analysis integrates high-resolution remote GIS telemetry, elevation modeling, and multi-spectral satellite imagery. The goal is to design a resilient, low-input agroecological system that mitigates Sahelian climate extremes while restoring biological diversity and economic viability.
                </Text>
                <Text style={styles.bodyText}>
                    By leveraging regional iNaturalist datasets and global soil registries, we establish an ecological baseline that forms the foundation of our site plan. This document details water capture dynamics, microclimatic manipulation, wind protection vectors, and intensive syntropic food forest designs, providing a clear roadmap for long-term regenerative stewardship.
                </Text>
                
                <Text style={styles.h2}>Primary Core Goals & Design Directives</Text>
                <Text style={styles.bodyText}>
                    {userData.goals || "The primary directives focus on the rapid establishment of multi-tiered syntropic food forest crop guilds, low-CAPEX active rainwater harvesting and passive earthwork retention networks, microclimatic mitigation to shield sensitive annuals from sun and wind stress, and deep soil rebuilding to sequester carbon and restore local hydrological functions."}
                </Text>

                <View style={styles.grid}>
                  <View style={styles.col}>
                    <Text style={styles.metricLabel}>Latitude / Longitude</Text>
                    <Text style={styles.metricVal}>{latStr}, {lngStr}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.metricLabel}>Total Area</Text>
                    <Text style={styles.metricVal}>{areaStr}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.metricLabel}>Design Slope</Text>
                    <Text style={styles.metricVal}>{elevation ? `${safeFixed(elevation.slope, 1, "0.5")}%` : "0.5%"}</Text>
                  </View>
                </View>

                <Footer pageNum="2" />
            </Page>

            {/* PAGE 3: Client Interview & Goals (Sec 02) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="02 | Client & Goals" />
                <Text style={styles.h1}>Client Profile & Design Requirements</Text>
                <Text style={styles.bodyText}>
                    A series of semi-structured client interviews was conducted to establish key priorities, capital constraints, labor budgets, and desired yields. The property steward, {userData.clientName || "Ahmed Khalil"}, requested a robust, self-healing design that minimizes external inputs and maximizes resource loops. Key requirements include establishing a secure household water supply, protecting sensitive crops from the dry, desiccating Harmattan winds, and producing a diverse, nutrient-dense harvest of fruits, vegetables, and medicinal crops.
                </Text>
                <Text style={styles.bodyText}>
                    Through social permaculture principles, the design also addresses labor efficiency, staging works to align with seasonal cycles, and utilizing local materials such as Neem wood and biochar to reduce initial capital expenses. The table below correlates the primary client objectives with the specific ecological and structural solutions proposed in this landscape portfolio.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Client Goal</Text>
                    <Text style={styles.tableCellHeader}>Landscape Response</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>1. Water Sovereignty</Text>
                    <Text style={styles.tableCell}>First flush roof capture, swales on contour, infiltration ponds.</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>2. Wind Protection</Text>
                    <Text style={styles.tableCell}>Tiered NE Neem and Acacia tree shelterbelt blocks.</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>3. Crop Abundance</Text>
                    <Text style={styles.tableCell}>Syntropic guilds incorporating Baobab, Moringa, and Pigeon Pea.</Text>
                  </View>
                </View>
                <Footer pageNum="3" />
            </Page>

            {/* PAGE 4: Base Map & Context (Sec 03) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="03 | Base Map" />
                <Text style={styles.h1}>Scale Base Map & Site Boundaries</Text>
                <Text style={styles.bodyText}>
                    The scale base map represents the core geographical blueprint of the landscape plan. The property consists of a standard Sahelian homestead boundary (measuring 25 meters by 100 meters, elongated north-to-south). Zone 0 is strategically centered to minimize walking distances to intensive production sectors.
                </Text>
                <Text style={styles.bodyText}>
                    By mapping these structures on top of the street GIS networks, we identify secondary access roads, pipeline entry lines, and property fences. This scale layout allows precise planning for edge effects, shelterbelt locations, and passive gravity water runs from the domestic roof capture structures.
                </Text>
                
                <View style={{ width: '100%', height: 240, position: 'relative', marginVertical: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                    {maps?.satelliteMap ? (
                        <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                    )}
                    <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.25} />
                        
                        {/* Boundaries */}
                        <Polygon points={boundaryPoints} fill="none" stroke="#1b4332" strokeWidth="2.5" />
                        
                        {/* House */}
                        <Rect x={hX - 12} y={hY - 9} width="24" height="18" fill="#e2e8f0" fillOpacity={0.9} stroke="#475569" strokeWidth="1" />
                        <Text x={hX - 10} y={hY + 2} style={{ fontSize: 5, fill: '#1b4332', fontFamily: 'Helvetica-Bold' }}>ZONE 0</Text>
                        
                        {/* Scale & Compass */}
                        <Polygon points="370,40 375,55 370,50 365,55" fill="#1b4332" />
                        <Text x="368" y="65" style={{ fontSize: 7, fill: '#1b4332', fontFamily: 'Helvetica-Bold' }}>N</Text>
                        
                        {/* Calibrated Dynamic Scale Bar */}
                        <Rect x="40" y="180" width={scaleBarWidthSvg} height="4" fill="#1b4332" />
                        <Text x="40" y="193" style={{ fontSize: 6, fill: '#1b4332' }}>0m</Text>
                        <Text x={40 + scaleBarWidthSvg - 10} y={193} style={{ fontSize: 6, fill: '#1b4332' }}>{scaleMeters}m</Text>
                    </Svg>
                </View>
                <Text style={styles.caption}>Figure 1: Site boundaries and Zone 0 homestead overlaid on top of high-resolution satellite imagery.</Text>
                <Footer pageNum="4" />
            </Page>

            {/* PAGE 5: Climate Analysis & Precipitation (Sec 04) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="04 | Climate & Rain" />
                <Text style={styles.h1}>Climatic Profile & Precipitation Metrics</Text>
                <Text style={styles.bodyText}>
                    The regional climate falls squarely within the dry-arid Sahelo-Sudanian transition zone, presenting severe seasonal water stresses. Meteorological telemetry indicates a highly seasonal precipitation curve, with a brief, high-intensity monsoon season (typically July to October) followed by an extended, desiccating dry season (November to June) dominated by the northeast Harmattan winds.
                </Text>
                <Text style={styles.bodyText}>
                    Design mitigation focuses on maximizing water infiltration during heavy downpours using deep contour swales, combined with extensive chop-and-drop mulching to block soil water evaporation. The shelterbelt is positioned to intercept dry winds, reducing crop transpiration and creating a cooler, protected microclimate in the crop production areas.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Meteorological Variable</Text>
                    <Text style={styles.tableCellHeader}>Site Metric Value</Text>
                    <Text style={styles.tableCellHeader}>PDC Integration Plan</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Mean Temp</Text>
                    <Text style={styles.tableCell}>{climate ? `${safeFixed(climate.temperature, 1, "24.5")}°C` : "24.5°C"}</Text>
                    <Text style={styles.tableCell}>Evaporation control, heavy organic mulch</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Annual Precipitation</Text>
                    <Text style={styles.tableCell}>{climate ? `${safeFixed(climate.precipitation * 365, 0, "438")} mm/yr` : "438 mm/yr"}</Text>
                    <Text style={styles.tableCell}>Swales on contour, active water retaining</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Max Wind Speed</Text>
                    <Text style={styles.tableCell}>{climate ? `${safeFixed(climate.windSpeed, 1, "12.5")} km/h` : "12.5 km/h"}</Text>
                    <Text style={styles.tableCell}>NE windbreak shelterbelts (Harmattan wind)</Text>
                  </View>
                </View>
                <Footer pageNum="5" />
            </Page>

            {/* PAGE 6: Topography & Slope Analysis (Sec 05) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="05 | Topography & Slope" />
                <Text style={styles.h1}>LiDAR Shaded Relief & Contour Analysis</Text>
                <Text style={styles.bodyText}>
                    Topographic mapping utilizing remote LiDAR elevation modeling reveals a very gentle slope of {elevation ? `${safeFixed(elevation.slope, 2, "0.50")}%` : "0.50%"} across the property. Slope dynamics dictate the placement of all earthworks. On dryland properties with less than 2% slopes, passive sheet flow is the primary water movement vector during monsoon storms.
                </Text>
                <Text style={styles.bodyText}>
                    To prevent erosion and capture this runoff, we map contour swales that intercept flow patterns at right angles. The LiDAR terrain contours plotted below guide the excavation paths, ensuring that water is spread laterally along the ridges rather than accumulating in erosion-prone gully channels.
                </Text>
                
                <View style={{ width: '100%', height: 240, position: 'relative', marginVertical: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#e7e5e4' }}>
                    {maps?.hillshadeMap ? (
                        <Image src={maps.hillshadeMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                    )}
                    <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.15} />
                        
                        {/* Boundary */}
                        <Polygon points={boundaryPoints} fill="none" stroke="#f43f5e" strokeOpacity={0.4} strokeWidth="1.5" strokeDasharray="3,3" />
                        
                        {/* Calibrated Contours conforming to local property bounding shape */}
                        <Path d={`M ${hX - 60} ${hY - 20} Q ${hX} ${hY - 40} ${hX + 60} ${hY - 20}`} fill="none" stroke="#f43f5e" strokeOpacity={0.4} strokeWidth="1.5" strokeDasharray="3,3" />
                        <Path d={`M ${hX - 60} ${hY + 20} Q ${hX} ${hY} ${hX + 60} ${hY + 20}`} fill="none" stroke="#f43f5e" strokeOpacity={0.4} strokeWidth="1.5" strokeDasharray="3,3" />
                        
                        <Text x={hX - 30} y={hY - 32} style={{ fontSize: 5, fill: '#f43f5e' }}>CONTOUR LINE A</Text>
                        <Text x={hX - 30} y={hY + 8} style={{ fontSize: 5, fill: '#f43f5e' }}>CONTOUR LINE B</Text>
                        
                        {/* Scale */}
                        <Rect x="40" y="180" width={scaleBarWidthSvg} height="4" fill="#1b4332" />
                        <Text x="40" y="193" style={{ fontSize: 6, fill: '#1b4332' }}>0m</Text>
                        <Text x={40 + scaleBarWidthSvg - 10} y={193} style={{ fontSize: 6, fill: '#1b4332' }}>{scaleMeters}m</Text>
                    </Svg>
                </View>
                <Text style={styles.caption}>Figure 2: Shaded Relief topographic LiDAR terrain model displaying contour boundaries.</Text>
                <Footer pageNum="6" />
            </Page>

            {/* PAGE 7: Satellite Map Overlay (Sec 05b) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="05b | Satellite Map" />
                <Text style={styles.h1}>High-Resolution Satellite Orthophoto</Text>
                <Text style={styles.bodyText}>
                    The high-resolution satellite orthophoto acts as a visual verification tool, confirming boundary details, tree canopies, and soil variations. In this Sahelian zone, the satellite layer highlights bare soils subject to wind erosion, allowing us to map bare zones that require cover cropping.
                </Text>
                <Text style={styles.bodyText}>
                    Overlaid green vectors show the primary permaculture zone boundaries, highlighting where intensive agroforestry systems transition into Zone 3 cropping and Zone 5 wild buffer zones. This spatial validation ensures that our digital elevation designs line up perfectly with the actual physical landscape features.
                </Text>
                
                <View style={{ width: '100%', height: 240, position: 'relative', marginVertical: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                    {maps?.satelliteMap ? (
                        <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                    )}
                    <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.15} />
                        <Polygon points={boundaryPoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray="4,4" />
                        <Text x={hX - 50} y={hY - 15} style={{ fontSize: 6, fill: '#22c55e', fontFamily: 'Helvetica-Bold' }}>ACTIVE PROPERTY BOUNDARY</Text>
                    </Svg>
                </View>
                <Text style={styles.caption}>Figure 3: Satellite orthophoto showing the boundaries of the design site.</Text>
                <Footer pageNum="7" />
            </Page>

            {/* PAGE 8: Sector Analysis & Wind/Solar vectors (Sec 06) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="06 | Sector Analysis" />
                <Text style={styles.h1}>Sector Dynamics & Energy Vectors</Text>
                <Text style={styles.bodyText}>
                    Sector analysis maps incoming external energy forces (sunlight, wind directions, wildfire risks, and animal migration pathways) that flow through the property. The prevailing winds blowing from the {windDirectionName.toLowerCase()} (azimuth {safeFixed(windDir, 0)}°) are a significant design factor for crop yields and site moisture retention.
                </Text>
                <Text style={styles.bodyText}>
                    To mitigate these factors, we implement a tiered windbreak shelterbelt on the windward ({windSector}) boundary, utilizing nitrogen-fixing, wind-tolerant pioneer trees such as Acacia and Neem. Afternoon high-heat vectors from the {afternoonSectorName} (azimuth {afternoonSunAzimuth}°) are managed through a cleared maintenance firebreak and heat-tolerant succulent plantings.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Sector Vector</Text>
                    <Text style={styles.tableCellHeader}>Direction / Compass Angle</Text>
                    <Text style={styles.tableCellHeader}>Design Mitigation</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Prevailing Dry Winds</Text>
                    <Text style={styles.tableCell}>{`${windSector} (Azimuth ${safeFixed(windDir, 0)}°)`}</Text>
                    <Text style={styles.tableCell}>{`Tiered pioneer windbreak shelterbelt along the ${windSector} border`}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>High Heat / Fire Risk</Text>
                    <Text style={styles.tableCell}>{`${afternoonSectorShort} (Azimuth ${afternoonSunAzimuth}°)`}</Text>
                    <Text style={styles.tableCell}>{`Cleared firebreak buffer and succulent barriers on the ${afternoonSectorShort} border`}</Text>
                  </View>
                </View>
                <Footer pageNum="8" />
            </Page>

            {/* PAGE 9: High-Fidelity Sector Compass Overlay (Sec 06b) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="06b | Sector Compass" />
                <Text style={styles.h1}>Microclimatic Sector Compass Overlay</Text>
                <Text style={styles.bodyText}>
                    The high-fidelity Sector Compass visualizes the spatial orientation of external energy corridors intersecting the site's centerpoint. Solar arc analysis determines shading requirements: the summer solstice sun tracks almost directly overhead, necessitating vertical shade canopies, while the winter sun shifts slightly South, allowing targeted solar access to living spaces.
                </Text>
                <Text style={styles.bodyText}>
                    Wind vectors are plotted to show the prevailing wind from the {windDirectionName.toLowerCase()} (azimuth {safeFixed(windDir, 0)}°). This map coordinates the precise placement of structural wind barriers and windward filtration buffers to maximize humidity retention across the central zone.
                </Text>
                
                <View style={{ width: '100%', height: 240, position: 'relative', marginVertical: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                    {maps?.satelliteMap ? (
                        <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                    )}
                    <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.25} />
                        
                        {/* Dynamic Property Boundary */}
                        <Polygon points={boundaryPoints} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,3" />

                        {/* Compass Dial centered on Zone 0 */}
                        <Circle cx={hX} cy={hY} r="60" fill="none" stroke="#334155" strokeWidth="1.5" />
                        <Circle cx={hX} cy={hY} r="35" fill="none" stroke="#475569" strokeWidth="0.5" strokeDasharray="2,2" />
                        
                        {/* Axial Lines */}
                        <Line x1={hX} y1={hY - 70} x2={hX} y2={hY + 70} stroke="#475569" strokeWidth="0.5" />
                        <Line x1={hX - 70} y1={hY} x2={hX + 70} y2={hY} stroke="#475569" strokeWidth="0.5" />
                        
                        {/* Summer Sun Arc */}
                        <Path d={summerArcPath} fill="none" stroke="#d97706" strokeWidth="3" />
                        <Text x={hX - 45} y={summerTextY} style={{ fontSize: 6, fill: '#d97706', fontFamily: 'Helvetica-Bold' }}>SUMMER SOLSTICE CORRIDOR</Text>

                        {/* Winter Sun Arc */}
                        <Path d={winterArcPath} fill="none" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3,3" />
                        <Text x={hX - 45} y={winterTextY} style={{ fontSize: 5, fill: '#b45309', fontFamily: 'Helvetica-Bold' }}>WINTER SOLSTICE PATH</Text>
                        
                        {/* Dynamic Wind Vector Group */}
                        <G transform={`rotate(${windDir}, ${hX}, ${hY})`}>
                            {/* Wind line coming from the outside towards the center */}
                            <Line x1={hX} y1={hY - 75} x2={hX} y2={hY - 25} stroke="#2563eb" strokeWidth="2.5" />
                            {/* Arrowhead pointing down */}
                            <Polygon points={`${hX},${hY - 25} ${hX - 5},${hY - 32} ${hX + 5},${hY - 32}`} fill="#2563eb" />
                        </G>
                        <Text x={windLabelX} y={windLabelY} style={{ fontSize: 5.5, fill: '#2563eb', fontFamily: 'Helvetica-Bold' }}>
                            {`WIND: ${windSpd.toFixed(1)} km/h (${windDir}°)`}
                        </Text>
  
                        {/* High Heat/Fire Risk Sector (dynamic based on hemisphere) */}
                        <G transform={`rotate(${fireRotation}, ${hX}, ${hY})`}>
                            <Path d={`M ${hX} ${hY} L ${hX - 60} ${hY - 15} A 60 60 0 0 0 ${hX - 60} ${hY + 15} Z`} fill="#dc2626" opacity={0.2} stroke="#dc2626" strokeWidth="1" />
                        </G>
                        <Text x={hX - 65} y={isNorthern ? hY + 45 : hY - 45} style={{ fontSize: 5, fill: '#dc2626', fontFamily: 'Helvetica-Bold' }}>
                            {`${afternoonSectorShort} AFTERNOON HEAT`}
                        </Text>
  
                        <Text x={hX - 3} y={hY - 75} style={{ fontSize: 8, fill: '#1e293b', fontFamily: 'Helvetica-Bold' }}>N</Text>
                        <Text x={hX - 3} y={hY + 80} style={{ fontSize: 8, fill: '#1e293b', fontFamily: 'Helvetica-Bold' }}>S</Text>
                    </Svg>
                </View>
                <Text style={styles.caption}>Figure 4: Sector Compass overlayed on top of Shaded Relief LiDAR terrain model.</Text>
                <Footer pageNum="9" />
            </Page>

            {/* PAGE 10: Concentric Zoning Hierarchy (Sec 07) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="07 | Zones Hierarchy" />
                <Text style={styles.h1}>Concentric Zoning & Buffer Classifications</Text>
                <Text style={styles.bodyText}>
                    Concentric zoning is a core permaculture energy-efficiency strategy that arranges landscape elements based on their human visitation frequency and labor requirements. Zones range from Zone 0 (the house/hub of activity) to Zone 5 (fully unmanaged wild ecosystems left to natural succession).
                </Text>
                <Text style={styles.bodyText}>
                    {activeDesign.zoningIntro} By mapping concentric rings outward from the central settlement, we optimize daily labor: high-care kitchen gardens sit in Zone 1 within arm's reach of the kitchen, semi-intensive orchards and animal forage systems occupy Zone 2 and 3, while windbreaks and native seed collection areas form the outer Zone 4 and 5 buffers.
                </Text>
                
                <View style={styles.grid}>
                    <View style={{ flex: 1.2, height: 160, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                        {maps?.satelliteMap ? (
                            <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                        )}
                        <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.25} />
                            
                            {/* Dynamic Property Boundary */}
                            <Polygon points={boundaryPoints} fill="none" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="3,3" />

                            {/* Concentric Zone Rings centered on Zone 0 */}
                            <Circle cx={hX} cy={hY} r={getSvgRadius(65)} fill="#f0fdf4" opacity={0.4} stroke="#bbf7d0" strokeWidth="1" />
                            <Circle cx={hX} cy={hY} r={getSvgRadius(35)} fill="#ecfdf5" opacity={0.45} stroke="#a7f3d0" strokeWidth="1" />
                            <Circle cx={hX} cy={hY} r={getSvgRadius(15)} fill="#f8fafc" opacity={0.5} stroke="#e2e8f0" strokeWidth="1" />
                            <Circle cx={hX} cy={hY} r={8} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                            
                            <Text x={hX - 12} y={hY + 2} style={{ fontSize: 5, fill: '#334155', fontFamily: 'Helvetica-Bold' }}>ZONE 0</Text>
                            <Text x={hX + 18} y={hY + 2} style={{ fontSize: 5, fill: '#475569', fontFamily: 'Helvetica-Bold' }}>ZONE 1</Text>
                            <Text x={hX + 38} y={hY + 2} style={{ fontSize: 5, fill: '#047857', fontFamily: 'Helvetica-Bold' }}>ZONE 2</Text>
                            <Text x={hX + 68} y={hY + 2} style={{ fontSize: 5, fill: '#15803d', fontFamily: 'Helvetica-Bold' }}>ZONE 3</Text>
                        </Svg>
                    </View>
                    {maps?.concentricZoning && (
                        <View style={{ flex: 0.8, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', position: 'relative' }}>
                            <Image src={maps.concentricZoning} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            {/* Blue print overlay */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                                <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>CONCENTRIC ZONING SCHEMATIC</Text>
                                <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Site: ${userData.projectName || "Unnamed"} | Zone: ${activeDesign.zoneName}`}</Text>
                                <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Area: ${areaStr} | Lat: ${latStr}`}</Text>
                            </View>
                            
                            {/* Mini Site Key Map */}
                            <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width="22" height="22" viewBox="0 0 50 50">
                                    <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                    <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                                </Svg>
                                <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={styles.caption}>Figure 5: Concentric zoning plan detailing system access layers.</Text>
                <Footer pageNum="10" />
            </Page>

            {/* PAGE 11: Zone 0 & Zone 1 Design Details (Sec 07b) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="07b | Zone 0 & 1" />
                <Text style={styles.h1}>Intensive Production zone & Settlements</Text>
                <Text style={styles.bodyText}>
                    Zone 0 (the residential structure) and Zone 1 (the immediate kitchen garden and seedling nursery) form the high-density core of the design. These sectors are visited multiple times daily, making them the ideal location for high-value crops, delicate herb beds, intensive composting, and seedling propagation.
                </Text>
                <Text style={styles.bodyText}>
                    Design components in Zone 1 utilize zero-evaporation Olla irrigation (porous clay pots buried in the soil) and greywater diversion channels from the kitchen. The microclimate here is heavily regulated through overhead shade fabrics, vertical vine trellises, and wind-blocking boundary plantings to support intensive annual vegetable production.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Element</Text>
                    <Text style={styles.tableCellHeader}>Design Details</Text>
                    <Text style={styles.tableCellHeader}>Water Input Source</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Kitchen Garden</Text>
                    <Text style={styles.tableCell}>Edible annuals, medicinal herbs, raised organic beds</Text>
                    <Text style={styles.tableCell}>Olla irrigation, greywater pipes</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Nursery</Text>
                    <Text style={styles.tableCell}>Seed propagation, sensitive grafted cultivars</Text>
                    <Text style={styles.tableCell}>Rainwater tank overflow gravity line</Text>
                  </View>
                </View>
                <Footer pageNum="11" />
            </Page>

            {/* PAGE 12: Soil Profile & Clay Textures (Sec 08) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="08 | Soil Profile" />
                <Text style={styles.h1}>Soil Characteristics & Chemistry</Text>
                <Text style={styles.bodyText}>
                    Baseline soil telemetry identifies the chemical and biological starting conditions of the property. The soil has a neutral pH of {soil ? `${safeFixed(soil.ph, 1, "6.1")} pH` : "6.1 pH"}, which is highly favorable for nutrient uptake and accommodates a wide variety of Sahelian crops. However, the Soil Organic Carbon (SOC) levels are critically low at {soil ? `${safeFixed(soil.organicCarbon, 1, "10.5")} g/kg` : "10.5 g/kg"}.
                </Text>
                <Text style={styles.bodyText}>
                    Low organic carbon reduces water-holding capacity and mineral retention in the sandy "Dior" soils of the region. Soil strategies must focus immediately on rebuilding humic complexes, stabilizing soil structure, and inoculating the rhizosphere with mycorrhizal fungi to prevent leaching of vital minerals during the brief rainy season.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Soil Layer (0-5cm)</Text>
                    <Text style={styles.tableCellHeader}>Measured Metric Value</Text>
                    <Text style={styles.tableCellHeader}>Sahelian Soil Strategy</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>pH (H2O)</Text>
                    <Text style={styles.tableCell}>{soil ? `${safeFixed(soil.ph, 1, "6.1")} pH` : "6.1 pH"}</Text>
                    <Text style={styles.tableCell}>Ideal. Fits Moringa, Azadirachta, and Acacia Senegalia.</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Soil Organic Carbon</Text>
                    <Text style={styles.tableCell}>{soil ? `${safeFixed(soil.organicCarbon, 1, "10.5")} g/kg` : "10.5 g/kg"}</Text>
                    <Text style={styles.tableCell}>Critically low. Amend with Biochar and heavy mulches.</Text>
                  </View>
                </View>
                <Footer pageNum="12" />
            </Page>

            {/* PAGE 13: Soil Remediation & Carbon Sequestration (Sec 09) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="09 | Soil Amendment" />
                <Text style={styles.h1}>Biological Soil Building Strategies</Text>
                <Text style={styles.bodyText}>
                    Rebuilding degraded Sahelian soils requires active biological remediation. Our primary strategy centers on the application of biochar (pyrolyzed crop waste), which is inoculated with nutrient-rich compost teas and animal manure to create highly porous carbon sinks that house beneficial soil microorganisms.
                </Text>
                <Text style={styles.bodyText}>
                    We combine biochar application with pioneer nitrogen-fixing cover crops like *Cajanus cajan* (Pigeon Pea) and *Vigna unguiculata* (Cowpea). These deep-rooting leguminous species break up compacted soil layers, deposit organic matter, and fix atmospheric nitrogen in the root zone, creating a fertile soil foundation for subsequent crop guilds.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Remediation Phase</Text>
                    <Text style={styles.tableCellHeader}>Input Materials</Text>
                    <Text style={styles.tableCellHeader}>Target Outcome</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Phase 1: Biochar</Text>
                    <Text style={styles.tableCell}>Neem wood biochar activated with manure tea</Text>
                    <Text style={styles.tableCell}>Microbial colonization, cation exchange capacity boost</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Phase 2: Green Cover</Text>
                    <Text style={styles.tableCell}>Pigeon pea and cowpea understory guilds</Text>
                    <Text style={styles.tableCell}>Atmospheric nitrogen fixation, biological root pathways</Text>
                  </View>
                </View>
                <Footer pageNum="13" />
            </Page>

            {/* PAGE 14: Microclimates & Canopy Shelters (Sec 10) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="10 | Microclimates" />
                <Text style={styles.h1}>Canopy Microclimate & Shade Engineering</Text>
                <Text style={styles.bodyText}>
                    Under the intense solar radiation of the Sahel, canopy shade engineering is vital to lower ambient temperatures and reduce crop transpiration. We utilize the unique ecological characteristics of *Faidherbia albida*, a native nitrogen-fixing leguminous tree that exhibits reverse leaf phenology.
                </Text>
                <Text style={styles.bodyText}>
                    *Faidherbia albida* drops its leaves during the wet season, allowing sunlight to reach understory crops when water is abundant. In the dry season, it grows a dense green canopy that shields the ground from scorching heat, significantly lowering soil temperatures and wind velocities while depositing nutrient-rich leaf litter directly onto the crop zones.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Canopy Layer</Text>
                    <Text style={styles.tableCellHeader}>Species Guild</Text>
                    <Text style={styles.tableCellHeader}>Microclimate Benefit</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Emergent Canopy (12m+)</Text>
                    <Text style={styles.tableCell}>Adansonia digitata (African Baobab)</Text>
                    <Text style={styles.tableCell}>Deep moisture extraction, wind dispersal barrier</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Support Understory (4-6m)</Text>
                    <Text style={styles.tableCell}>Moringa oleifera (Moringa)</Text>
                    <Text style={styles.tableCell}>Rapid leaf chop-and-drop mulch shade cooling</Text>
                  </View>
                </View>
                <Footer pageNum="14" />
            </Page>

            {/* PAGE 15: iNaturalist Local Flora species list (Sec 11) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="11 | Local Flora" />
                <Text style={styles.h1}>Observed Local Flora & Plant Photos</Text>
                <Text style={styles.bodyText}>
                    A localized survey of regional flora was compiled using iNaturalist research-grade registries to identify native and naturalized species that thrive in the local microclimatic conditions. The photo cards below display observed species (such as *Adansonia digitata* and *Moringa oleifera*) that have adapted to prolonged dry seasons.
                </Text>
                <Text style={styles.bodyText}>
                    These adapted species serve as the structural backbone of our agroforestry guilds. Their inclusion ensures high survival rates and provides secondary yields such as edible leaves, fiber, oil, and medicinal compounds, creating a highly resilient agroecological buffer.
                </Text>
                
                <View style={styles.photoGrid}>
                    {ecology?.taxaDetails && ecology.taxaDetails.slice(0, 2).map((taxon, idx) => (
                        <View key={idx} style={styles.photoCard}>
                            {taxon.photoBase64 ? (
                                <Image src={taxon.photoBase64} style={styles.photoImage} />
                            ) : (
                                <View style={{ width: '100%', height: 100, backgroundColor: '#cbd5e1', borderRadius: 4, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 8, color: '#475569' }}>No Photo Available</Text>
                                </View>
                            )}
                            <Text style={styles.photoTitle}>{taxon.commonName}</Text>
                            <Text style={styles.photoSubtitle}>{taxon.name}</Text>
                        </View>
                    ))}
                </View>
                <Text style={styles.caption}>Figure 5: iNaturalist plant observations captured for target coordinates.</Text>
                <Footer pageNum="15" />
            </Page>

            {/* PAGE 16: Local Fauna & Animal photos (Sec 12) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="12 | Local Fauna" />
                <Text style={styles.h1}>Sahelian Wildlife Observations</Text>
                <Text style={styles.bodyText}>
                    Local fauna observations provide critical insight into the surrounding trophic levels, pest-predator relationships, and biological nutrient cycles. The dynamic iNaturalist records catalog bird, mammal, and insect species occurring within a 5-kilometer radius of the design site.
                </Text>
                <Text style={styles.bodyText}>
                    Integrating fauna into the permaculture design is achieved by planting habitat corridors, installing raptor perches for rodent control, and utilizing insectary plant borders. This increases biodiversity, supports pollination loops, and establishes natural pest control vectors, reducing the need for chemical interventions.
                </Text>
                
                <View style={styles.photoGrid}>
                    {ecology?.taxaDetails && ecology.taxaDetails.slice(2, 4).map((taxon, idx) => (
                        <View key={idx} style={styles.photoCard}>
                            {taxon.photoBase64 ? (
                                <Image src={taxon.photoBase64} style={styles.photoImage} />
                            ) : (
                                <View style={{ width: '100%', height: 100, backgroundColor: '#cbd5e1', borderRadius: 4, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 8, color: '#475569' }}>No Photo Available</Text>
                                </View>
                            )}
                            <Text style={styles.photoTitle}>{taxon.commonName}</Text>
                            <Text style={styles.photoSubtitle}>{taxon.name}</Text>
                        </View>
                    ))}
                </View>
                <Text style={styles.caption}>Figure 6: iNaturalist animal and avian observations cataloged at target coordinates.</Text>
                <Footer pageNum="16" />
            </Page>

            {/* PAGE 17: Water Harvesting & Catchment System Design (Sec 13) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="13 | Water Harvesting" />
                <Text style={styles.h1}>{activeDesign.waterTitle}</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.waterIntro} Rainwater harvesting calculations are based on the total roof surface area (100 square meters) of the residential structure. Roof runoff flows through a first-flush diverter (which routes the initial dusty water away from the main cistern) before entering storage.
                </Text>
                <Text style={styles.bodyText}>
                    The technical schematic below maps the flow: from the roof surface, through external gutters and downspouts, into the filtration stack, and finally to gravity storage. Overflow is directed straight to infiltration basins, ensuring no water is lost.
                </Text>
                
                <View style={styles.grid}>
                    <View style={{ flex: 1.2, height: 160, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', backgroundColor: '#fafaf9' }}>
                        <Svg width="100%" height="100%" viewBox="0 0 400 200">
                            {/* Roof Catchment */}
                            <Rect x="20" y="30" width="120" height="40" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                            <Text x="30" y="52" style={{ fontSize: 6, fill: '#1b4332', fontFamily: 'Helvetica-Bold' }}>ROOF CATCHMENT (100m²)</Text>
                            
                            {/* Gutters and downspout */}
                            <Path d="M 140 50 L 180 50 L 180 80" fill="none" stroke="#64748b" strokeWidth="2" />
                            <Text x="150" y="45" style={{ fontSize: 5, fill: '#475569' }}>GUTTER</Text>
                            
                            {/* First Flush Diverter */}
                            <Rect x="175" y="80" width="10" height="30" fill="#94a3b8" />
                            <Line x1="175" y1="95" x2="195" y2="95" stroke="#475569" strokeWidth="1" />
                            <Text x="190" y="90" style={{ fontSize: 4, fill: '#475569' }}>FIRST FLUSH</Text>
                            
                            {/* Water Tank */}
                            <Rect x="220" y="60" width="80" height="90" fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" rx="4" />
                            <Rect x="220" y="105" width="80" height="45" fill="#38bdf8" />
                            <Text x="232" y="95" style={{ fontSize: 6, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>20,000L STORAGE TANK</Text>
                            
                            {/* Feed pipe from filter to tank */}
                            <Path d="M 180 80 L 220 80" fill="none" stroke="#0ea5e9" strokeWidth="2" />
                            
                            {/* Overflow pipe releasing to swale */}
                            <Path d="M 300 80 L 330 80 L 330 140" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                            <Text x="305" y="75" style={{ fontSize: 4, fill: '#2563eb' }}>OVERFLOW</Text>
                            
                            {/* Dynamic Site Data Text */}
                            <Text x="20" y="165" style={{ fontSize: 6.5, fill: '#1e293b', fontFamily: 'Helvetica-Bold' }}>
                                {`Rainfall: ${climate ? (climate.precipitation * 365).toFixed(0) : "438"} mm/yr`}
                            </Text>
                            <Text x="20" y="180" style={{ fontSize: 6.5, fill: '#1b4332', fontFamily: 'Helvetica-Bold' }}>
                                {`Catchment potential: ${climate ? (climate.precipitation * 365 * 100).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "43,800"} Liters/yr`}
                            </Text>
                        </Svg>
                    </View>
                    {maps?.waterHarvesting && (
                        <View style={{ flex: 0.8, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', position: 'relative' }}>
                            <Image src={maps.waterHarvesting} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            {/* Blue print overlay */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                                <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>{activeDesign.waterTitle.toUpperCase()}</Text>
                                <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Catchment: ${activeDesign.waterSpecs}`}</Text>
                                <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Specs: Roof runoff harvesting via gravity pipeline`}</Text>
                            </View>
                            
                            {/* Mini Site Key Map */}
                            <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width="22" height="22" viewBox="0 0 50 50">
                                    <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                    <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                                </Svg>
                                <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={styles.caption}>Figure 7: Technical schematic of first flush roof-to-cistern water harvesting loop.</Text>
                <Footer pageNum="17" />
            </Page>

            {/* PAGE 18: Gravity-fed Drip Irrigation System (Sec 14) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="14 | Drip Irrigation" />
                <Text style={styles.h1}>{activeDesign.dripTitle}</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.dripIntro} Stored cistern water is distributed using a low-pressure, gravity-fed drip irrigation system. By elevating the main storage tank, we generate sufficient head pressure to operate drip lines without requiring mechanical pumps.
                </Text>
                <Text style={styles.bodyText}>
                    The distribution layout maps the flow: from elevated tank, down the slope center, branching to individual crop rows. Companions are hydrated efficiently using micro-emitters, ensuring minimal evaporation loss.
                </Text>
                
                <View style={styles.grid}>
                    <View style={{ flex: 1.2, height: 160, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                        {maps?.satelliteMap ? (
                            <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                        )}
                        <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.2} />
                            
                            {/* Dynamic Property Boundary */}
                            <Polygon points={boundaryPoints} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

                            {/* Tank on Elevation (representing high head) */}
                            <Rect x={hX - 45} y={hY - 40} width="40" height="25" fill="#bae6fd" opacity={0.8} stroke="#0ea5e9" strokeWidth="1.5" />
                            <Text x={hX - 42} y={hY - 26} style={{ fontSize: 5, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>HIGH CISTERN</Text>
                            
                            {/* Main Valve */}
                            <Polygon points={`${hX - 5},${hY - 15} ${hX + 5},${hY - 5} ${hX - 5},${hY - 5} ${hX + 5},${hY - 15}`} fill="#ef4444" />
                            <Text x={hX + 8} y={hY - 10} style={{ fontSize: 4, fill: '#ef4444' }}>VALVE</Text>
                            
                            {/* Main pipeline going down */}
                            <Path d={`M ${hX - 25} ${hY - 15} L ${hX} ${hY - 15} L ${hX} ${hY + 30} L ${hX + 100} ${hY + 30}`} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                            <Text x={hX + 10} y={hY + 25} style={{ fontSize: 5, fill: '#0369a1' }}>MAIN SUPPLY LINE</Text>
                            
                            {/* Drip emitters at roots */}
                            <Circle cx={hX + 30} cy={hY + 30} r="2" fill="#3b82f6" />
                            <Circle cx={hX + 60} cy={hY + 30} r="2" fill="#3b82f6" />
                            <Circle cx={hX + 90} cy={hY + 30} r="2" fill="#3b82f6" />
                            
                            {/* Crop guild representation */}
                            <Circle cx={hX + 30} cy={hY + 15} r="8" fill="#22c55e" opacity={0.5} stroke="#16a34a" />
                            <Circle cx={hX + 60} cy={hY + 15} r="8" fill="#22c55e" opacity={0.5} stroke="#16a34a" />
                            <Circle cx={hX + 90} cy={hY + 15} r="8" fill="#22c55e" opacity={0.5} stroke="#16a34a" />
                            
                            <Text x={hX + 20} y={hY + 4} style={{ fontSize: 4, fill: '#14532d' }}>CANOPY</Text>
                            <Text x={hX + 50} y={hY + 4} style={{ fontSize: 4, fill: '#14532d' }}>UNDERSTORY</Text>
                            <Text x={hX + 80} y={hY + 4} style={{ fontSize: 4, fill: '#14532d' }}>COMPANIONS</Text>
                        </Svg>
                    </View>
                    {maps?.gravityDrip && (
                        <View style={{ flex: 0.8, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', position: 'relative' }}>
                            <Image src={maps.gravityDrip} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            {/* Blue print overlay */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                                <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>{activeDesign.dripTitle.toUpperCase()}</Text>
                                <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`System: ${activeDesign.dripSpecs}`}</Text>
                                <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Pressure Head: Elevated storage tank configuration`}</Text>
                            </View>
                            
                            {/* Mini Site Key Map */}
                            <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width="22" height="22" viewBox="0 0 50 50">
                                    <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                    <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                                </Svg>
                                <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={styles.caption}>Figure 8: Technical schematic of passive gravity drip pipeline.</Text>
                <Footer pageNum="18" />
            </Page>

            {/* PAGE 19: Hydrology Earthworks & Swales (Sec 15) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="15 | Hydrology swales" />
                <Text style={styles.h1}>{activeDesign.swalesTitle}</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.swalesIntro} Swales are level ditches dug along topographic contours, with the excavated soil mounded on the downhill side to form a berm. During heavy downpours, sheet runoff accumulates in the swale ditch, where it is held and allowed to infiltrate slowly.
                </Text>
                <Text style={styles.bodyText}>
                    The topo map overlay shows how swales slow down runoff, spread it, and allow it to sink. Berms are planted with deep-rooted species to stabilize the soil and tap into the water stored in the subsoil.
                </Text>
                
                <View style={styles.grid}>
                    <View style={{ flex: 1.2, height: 160, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                        {maps?.satelliteMap ? (
                            <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                        )}
                        <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.2} />
                            
                            {/* Boundary */}
                            <Polygon points={boundaryPoints} fill="none" stroke="#15803d" strokeWidth="2.5" />
                            
                            {/* Contours and Swale overlay inside boundary */}
                            <Path d={getSwalePath(0.35)} fill="none" stroke="#0ea5e9" strokeWidth="3.5" />
                            <Path d={getSwalePath(0.65)} fill="none" stroke="#0ea5e9" strokeWidth="3.5" />
                            
                            <Circle cx={pondC.x} cy={pondC.y} r="10" fill="#bae6fd" opacity={0.85} stroke="#0284c7" strokeWidth="1.5" />
                            <Text x={pondC.x - 7} y={pondC.y + 2} style={{ fontSize: 5, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>POND</Text>
                            
                            <Text x={hX - 35} y={hY - 25} style={{ fontSize: 5, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>CONTOUR SWALE A</Text>
                            <Text x={hX - 35} y={hY + 15} style={{ fontSize: 5, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>CONTOUR SWALE B</Text>
                            
                            <Rect x="40" y="180" width={scaleBarWidthSvg} height="4" fill="#1b4332" />
                            <Text x="40" y="193" style={{ fontSize: 6, fill: '#1b4332' }}>0m</Text>
                            <Text x={40 + scaleBarWidthSvg - 10} y={193} style={{ fontSize: 6, fill: '#1b4332' }}>{scaleMeters}m</Text>
                        </Svg>
                    </View>
                    {maps?.contourSwales && (
                        <View style={{ flex: 0.8, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', position: 'relative' }}>
                            <Image src={maps.contourSwales} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            {/* Blue print overlay */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                                <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>{activeDesign.swalesTitle.toUpperCase()}</Text>
                                <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Earthworks: ${activeDesign.swalesSpecs}`}</Text>
                                <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Slope: ${elevation ? elevation.slope.toFixed(1) : "1.2"}% | Active Soil Sponge System`}</Text>
                            </View>
                            
                            {/* Mini Site Key Map */}
                            <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width="22" height="22" viewBox="0 0 50 50">
                                    <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                    <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                                </Svg>
                                <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={styles.caption}>Figure 9: Infiltration contour swales and storage pond network overlaid on top of high-resolution satellite imagery.</Text>
                <Footer pageNum="19" />
            </Page>

            {/* PAGE 20: Concept & Flow Connectivity Bubble Diagram (Sec 16) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="16 | Bubble Diagram" />
                <Text style={styles.h1}>Functional Concept & Flow Connectivity</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.conceptIntro} The functional concept diagram illustrates the nutrient, waste, and energy flows across the property. Connections define how elements support each other: kitchen waste feeds Zone 1 compost piles, compost enriches Zone 1 raised beds, and graywater from Zone 0 houses hydrates Zone 2 agroforestry fruit guilds.
                </Text>
                <Text style={styles.bodyText}>
                    By optimizing these connections, we create a closed-loop system where waste becomes an input for another sector. This reduces human labor and increases system resilience, allowing the landscape to self-heal and self-regulate over time.
                </Text>
                
                <View style={styles.grid}>
                    <View style={{ flex: 1.2, height: 160, position: 'relative', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                        {maps?.satelliteMap ? (
                            <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                        )}
                        <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                            <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.25} />
                            
                            {/* Dynamic Property Boundary */}
                            <Polygon points={boundaryPoints} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,3" />

                            {/* Zone 0 House Bubble */}
                            <Circle cx={hX} cy={hY} r="25" fill="#f8fafc" opacity={0.75} stroke="#64748b" strokeWidth="2" />
                            <Text x={hX - 18} y={hY + 2} style={{ fontSize: 6, fill: '#334155', fontFamily: 'Helvetica-Bold' }}>ZONE 0</Text>
                            
                            {/* Zone 1 Intensive Kitchen Garden Bubble */}
                            <Circle cx={hX - 60} cy={hY - 30} r="30" fill="#f0fdf4" opacity={0.65} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,3" />
                            <Text x={hX - 78} y={hY - 28} style={{ fontSize: 6, fill: '#15803d', fontFamily: 'Helvetica-Bold' }}>ZONE 1</Text>
                            
                            {/* Zone 2 Semi-Intensive Agroforestry */}
                            <Circle cx={hX + 60} cy={hY + 30} r="35" fill="#ecfdf5" opacity={0.65} stroke="#10b981" strokeWidth="1.5" />
                            <Text x={hX + 42} y={hY + 32} style={{ fontSize: 6, fill: '#047857', fontFamily: 'Helvetica-Bold' }}>ZONE 2</Text>
     
                            {/* Zone 5 Wild Buffer */}
                            <Circle cx={hX + 110} cy={hY - 40} r="18" fill="#f0fdf4" opacity={0.65} stroke="#16a34a" strokeWidth="1" />
                            <Text x={hX + 98} y={hY - 38} style={{ fontSize: 5, fill: '#14532d', fontFamily: 'Helvetica-Bold' }}>ZONE 5</Text>
                            
                            {/* Connectors */}
                            <Path d={`M ${hX} ${hY} L ${hX - 30} ${hY - 15}`} fill="none" stroke="#22c55e" strokeWidth="1.5" />
                            <Path d={`M ${hX} ${hY} L ${hX + 25} ${hY + 12}`} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        </Svg>
                    </View>
                    {maps?.functionalConcept && (
                        <View style={{ flex: 0.8, height: 160, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', position: 'relative' }}>
                            <Image src={maps.functionalConcept} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            
                            {/* Blue print overlay */}
                            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                                <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>FUNCTIONAL CONCEPT FLOW DIAGRAM</Text>
                                <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Flow Strategy: Integrated closed-loop cycles`}</Text>
                                <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Site: ${userData.projectName || "Unnamed"} | Zone: ${activeDesign.zoneName}`}</Text>
                            </View>
                            
                            {/* Mini Site Key Map */}
                            <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                                <Svg width="22" height="22" viewBox="0 0 50 50">
                                    <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                    <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                                </Svg>
                                <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={styles.caption}>Figure 10: Concept Bubble Diagram detailing functional zonings and energy relationships overlaid on top of high-resolution satellite imagery.</Text>
                <Footer pageNum="20" />
            </Page>

            {/* PAGE 21: Syntropic Overstory Plant Guilds (Sec 17) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="17 | Crop Guilds" />
                <Text style={styles.h1}>{activeDesign.plantGuildTitle}</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.plantGuildIntro}
                </Text>
                <Text style={styles.bodyText}>
                    {activeDesign.plantGuildDescription}
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Guild Canopy layer</Text>
                    <Text style={styles.tableCellHeader}>Key Species</Text>
                    <Text style={styles.tableCellHeader}>Ecological Role</Text>
                  </View>
                  {activeDesign.guildSpecies.map((row, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{row.layer}</Text>
                      <Text style={styles.tableCell}>{row.species}</Text>
                      <Text style={styles.tableCell}>{row.role}</Text>
                    </View>
                  ))}
                </View>
                
                <Text style={styles.h2}>{activeDesign.guildLowerHeading}</Text>
                <Text style={styles.bodyText}>
                    {activeDesign.guildLowerText}
                </Text>
                {maps?.bananaGuild ? (
                    <View style={{ width: '100%', height: 160, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1', marginTop: 5, position: 'relative' }}>
                        <Image src={maps.bananaGuild} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        
                        {/* Blue print overlay */}
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7' }}>
                            <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>{activeDesign.guildLowerHeading.toUpperCase()}</Text>
                            <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Companion Guild Layout | Calibrated for: ${activeDesign.zoneName}`}</Text>
                            <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Specs: Concentric multi-tier companion planting layout`}</Text>
                        </View>
                        
                        {/* Mini Site Key Map */}
                        <View style={{ position: 'absolute', top: 4, right: 4, width: 34, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 3, borderWidth: 0.5, borderColor: '#cbd5e1', padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                            <Svg width="22" height="22" viewBox="0 0 50 50">
                                <Polygon points={miniBoundaryPoints} fill="none" stroke="#10b981" strokeWidth="2" />
                                <Circle cx="25" cy="25" r="3" fill="#ef4444" />
                            </Svg>
                            <Text style={{ fontSize: 3, color: '#475569', marginTop: 1, fontFamily: 'Helvetica-Bold' }}>KEY MAP</Text>
                        </View>
                    </View>
                ) : (
                    <View style={{ width: '100%', height: 80, backgroundColor: '#fafaf9', borderRadius: 4, marginTop: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: '#cbd5e1' }}>
                        <Text style={{ fontSize: 8, color: '#475569' }}>Crop Guild Diagram (Asset Compiling...)</Text>
                    </View>
                )}
                
                <Footer pageNum="21" />
            </Page>

            {/* PAGE 22: Energy & Solar Dynamics (Sec 18) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="18 | Solar Dynamics" />
                <Text style={styles.h1}>Master Plan Design & Solar Arrays</Text>
                <Text style={styles.bodyText}>
                    The final integrated Master Plan maps the layout of the property. The residential sector (Zone 0) is centered to allow easy access, and is supported by a solar array. The array is mounted with a 15-degree South tilt, maximizing year-round solar energy capture.
                </Text>
                <Text style={styles.bodyText}>
                    Surrounding zones transition outward: from intensive Zone 1 gardens, through Zone 2 and 3 agroforestry guilds, and finally to Zone 4 and 5 wild shelterbelts. This spatial organization channels external resources, establishing a resilient landscape design.
                </Text>
                
                <View style={{ width: '100%', height: 240, position: 'relative', marginVertical: 15, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#e7e5e4' }}>
                    {maps?.satelliteMap ? (
                        <Image src={maps.satelliteMap} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fafaf9' }} />
                    )}
                    
                    {/* Blue print overlay */}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 4, paddingVertical: 3, borderTopWidth: 0.8, borderTopColor: '#0284c7', zIndex: 10 }}>
                        <Text style={{ fontSize: 5, color: '#38bdf8', fontFamily: 'Helvetica-Bold' }}>MASTER PLAN DESIGN LAYOUT</Text>
                        <Text style={{ fontSize: 4.2, color: '#e2e8f0', marginTop: 1 }}>{`Site: ${userData.projectName || "Unnamed"} | System: ${activeDesign.zoneName}`}</Text>
                        <Text style={{ fontSize: 3.8, color: '#94a3b8' }}>{`Area: ${areaStr} | Dimensions: ${scaleMeters * 4}m grid approx`}</Text>
                    </View>

                    <Svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', top: 0, left: 0 }}>
                        <Rect x="0" y="0" width="400" height="200" fill="#ffffff" opacity={0.2} />
                        
                        {/* Dynamic Property Boundary */}
                        <Polygon points={boundaryPoints} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeDasharray="3,3" />
                        
                        {/* House / Zone 0 */}
                        <Rect x={hX - 15} y={hY - 10} width="30" height="20" fill="#e2e8f0" fillOpacity={0.9} stroke="#475569" strokeWidth="1" />
                        <Text x={hX - 11} y={hY + 2} style={{ fontSize: 5, fill: '#1e293b', fontFamily: 'Helvetica-Bold' }}>HOUSE</Text>
                        
                        {/* Windbreaks along NE boundary */}
                        <Path d={getWindbreakPath()} fill="none" stroke="#14532d" strokeWidth="4" />
                        <Text x={hX + 60} y={hY - 45} style={{ fontSize: 5, fill: '#14532d', fontFamily: 'Helvetica-Bold' }}>WINDBREAK</Text>
 
                        {/* Swales */}
                        <Path d={getSwalePath(0.35)} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                        <Path d={getSwalePath(0.65)} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                        <Text x={hX - 30} y={hY - 22} style={{ fontSize: 5, fill: '#0369a1', fontFamily: 'Helvetica-Bold' }}>WATER SWALE A</Text>
                        
                        {/* Dynamic Vegetation circles (Moringa, Neem, Baobab canopies!) */}
                        {getAgroforestryTrees()}
 
                        {/* Water Tank & Solar PV Array */}
                        <Circle cx={hX + 18} cy={hY - 16} r="4.5" fill="#0284c7" />
                        <Rect x={hX - 28} y={hY + 12} width="12" height="8" fill="#1e3a8a" />
                        <Text x={hX - 27} y={hY + 18} style={{ fontSize: 4, fill: '#ffffff', fontFamily: 'Helvetica-Bold' }}>PV</Text>
                        
                        {/* Wildlife pathing */}
                        <Path d={`M ${hX} ${hY} L ${hX + 25} ${hY + 12}`} fill="none" stroke="#10b981" strokeWidth="1.5" />
                        <Path d={`M ${hX + 80} ${hY + 40} Q ${hX + 90} ${hY + 30} ${hX + 100} ${hY + 40}`} fill="none" stroke="#475569" strokeWidth="1.2" strokeDasharray="2,2" />
                        <Text x={hX + 70} y={hY + 50} style={{ fontSize: 5, fill: '#475569' }}>WILDLIFE PATH</Text>
                        
                        {/* Calibrated Dynamic Scale Bar */}
                        <Rect x="40" y="180" width={scaleBarWidthSvg} height="4" fill="#1b4332" />
                        <Text x="40" y="193" style={{ fontSize: 6, fill: '#1b4332' }}>0m</Text>
                        <Text x={40 + scaleBarWidthSvg - 10} y={193} style={{ fontSize: 6, fill: '#1b4332' }}>{scaleMeters}m</Text>
                    </Svg>
                </View>
                <Text style={styles.caption}>Figure 11: Final integrated Master Plan design overlaid on top of high-res Satellite imagery.</Text>
                <Footer pageNum="22" />
            </Page>

            {/* PAGE 23: Phased 12-Month Implementation Milestones (Sec 19) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="19 | Implementation" />
                <Text style={styles.h1}>Phased Implementation & Capex Milestones</Text>
                <Text style={styles.bodyText}>
                    Implementation is staged in three phases to align with seasonal cycles and optimize financial investment. Phase 1 focuses on earthworks and water storage systems: digging swales, installing cisterns, and mapping contours. This establishes the hydrological foundation before any planting begins.
                </Text>
                <Text style={styles.bodyText}>
                    Phase 2 introduces nitrogen-fixing cover crops and windbreaks to build soil organic matter and create protected microclimates. Phase 3 completes the plan with food forest orchards, companion guilds, and drip lines. This staged approach reduces risk and spreads capital costs.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Phase & Schedule</Text>
                    <Text style={styles.tableCellHeader}>Physical Actions</Text>
                    <Text style={styles.tableCellHeader}>Financial CAPEX Estimate</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Phase 1 (Months 0-3)</Text>
                    <Text style={styles.tableCell}>Contours mapping, swale digging, water tank setup</Text>
                    <Text style={styles.tableCell}>$850 (Self-installed earthworks)</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Phase 2 (Months 3-6)</Text>
                    <Text style={styles.tableCell}>Pioneer green manures cover crops, windbreak Neem planting</Text>
                    <Text style={styles.tableCell}>$320 (Seed stock & seedlings)</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Phase 3 (Months 6-12)</Text>
                    <Text style={styles.tableCell}>Syntropic crop guilds, fruit orchards, drip systems</Text>
                    <Text style={styles.tableCell}>$750 (Grafted cultivars, piping)</Text>
                  </View>
                </View>
                <Footer pageNum="23" />
            </Page>

            {/* PAGE 24: Maintenance & Seasonal Care Plan (Sec 20) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="20 | Maintenance Plan" />
                <Text style={styles.h1}>Seasonal Maintenance & Systems Care</Text>
                <Text style={styles.bodyText}>
                    Long-term sustainability relies on regular seasonal maintenance of the biological and structural systems. Tasks are divided by season: during the wet season, maintenance centers on checking swales for erosion, clearing spillways, and pruning fast-growing understory species.
                </Text>
                <Text style={styles.bodyText}>
                    Dry season maintenance focuses on monitoring drip lines, cleaning first-flush sediment filters, and applying thick organic mulches. This schedule keeps water systems operational and prevents solar evaporation, maintaining soil moisture and canopy health throughout the dry months.
                </Text>
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableCellHeader}>Season</Text>
                    <Text style={styles.tableCellHeader}>Required Care Tasks</Text>
                    <Text style={styles.tableCellHeader}>Frequency</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Dry Season</Text>
                    <Text style={styles.tableCell}>Checking drip line leaks, cleaning first-flush filter, replenishing organic mulches</Text>
                    <Text style={styles.tableCell}>Monthly</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Wet Season</Text>
                    <Text style={styles.tableCell}>Clearing swale silt, pruning Moringa branch biomass (chop-and-drop)</Text>
                    <Text style={styles.tableCell}>Weekly</Text>
                  </View>
                </View>
                <Footer pageNum="24" />
            </Page>

            {/* PAGE 25: QGIS & Google Earth Integration Guide (Sec 20b) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="20b | QGIS & Earth" />
                <Text style={styles.h1}>QGIS & Google Earth Integration Guide</Text>
                <Text style={styles.bodyText}>
                    This design package includes a fully compatible GIS vector payload in KML format. To integrate these regenerative design layouts back into professional GIS workflows, follow these instructions:
                </Text>
                
                <Text style={styles.h2}>1. Importing into Google Earth Pro & Web</Text>
                <Text style={styles.bodyText}>
                    Open Google Earth, navigate to File &gt; Open, and select the downloaded KML file. The spatial structures (Property Boundary, Zone 0 homestead, concentric Zone 1/2/3 vectors, contour swales, water pond, and northeast windbreaks) will overlay precisely onto the 3D terrain. You can toggle individual layers inside the "Places" pane.
                </Text>

                <Text style={styles.h2}>2. Importing and Calibrating in QGIS</Text>
                <Text style={styles.bodyText}>
                    In QGIS, drag and drop the KML file into your Layers Panel or select Layer &gt; Add Layer &gt; Add Vector Layer. Once imported, you can overlay the vectors on a high-resolution Digital Elevation Model (DEM) such as SRTM or Copernicus 30m terrain data to cross-analyze contour lines.
                </Text>

                <Text style={styles.h2}>3. Recommended QGIS Plugins & Hydrological Analysis</Text>
                <Text style={styles.bodyText}>
                    - Profile Tool: Plot precise topographic cross-sections along swales to verify level paths.
                    - qgis2threejs: Export your 3D design layers as interactive HTML/Web GL files.
                    - GRASS GIS (r.watershed): Run hydrological models on your DEM to calculate watershed boundaries, flow accumulation, and channel drainage lines to calibrate the water harvesting potential of the swale berms.
                </Text>
                <Footer pageNum="25" />
            </Page>

            {/* PAGE 26: Citations, References & Approval Signatures (Sec 21) */}
            <Page size="A4" style={styles.page}>
                <Header sectionTitle="21 | Citations" />
                <Text style={styles.h1}>Academic References & Signatures</Text>
                <Text style={styles.bodyText}>
                    This permaculture portfolio compiles remote geographical indices referenced directly to global research portals:
                </Text>
                <Text style={styles.bodyText}>
                    1. **Global Soil Grids Data**: ISRIC - World Soil Information. (2024). Soil properties queried via REST API at depth 0-5cm (properties: pH H2O, Soil Organic Carbon). URL: https://rest.isric.org.
                </Text>
                <Text style={styles.bodyText}>
                    2. **Climatic Meteorological Models**: Open-Meteo Weather Forecasting API. (2026). Climatic variables (precipitation summations, wind speed velocity vectors, solar radiation flux) compiled natively. URL: https://api.open-meteo.com.
                </Text>
                <Text style={styles.bodyText}>
                    3. **Flora/Fauna Observations Catalog**: iNaturalist Research-Grade Observations Species Registry. (2026). Regional species observations fetched from 5km radius observation centers. URL: https://api.inaturalist.org.
                </Text>
                <Text style={styles.bodyText}>
                    4. **Permaculture Core Methodology**: Mollison, B. (1988). *Permaculture: A Designers\' Manual*. Tagari Publications. OBREDIM structural cycles mapped directly from Mollisonian keyline systems.
                </Text>

                <View style={{ marginTop: 50, borderTopWidth: 1, borderTopColor: '#cbd5e1', borderTopStyle: 'solid', paddingTop: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1b4332', textAlign: 'center' }}>
                        APPROVED PERMACULTURE PDC PORTFOLIO DESIGN
                    </Text>
                    <Text style={{ fontSize: 7, color: '#64748b', textAlign: 'center', marginTop: 5 }}>
                        Validated for dynamic, decentralized dryland restoration. Earth Care, People Care, Fair Share.
                    </Text>
                </View>
                <Footer pageNum="26" />
            </Page>
        </Document>
    );
};

export default PDFReport;
