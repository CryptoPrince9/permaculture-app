import { ClimateData, ElevationData, SoilData, EcologyData } from './api';

export interface GeneratedReport {
    summary: string;
    waterHarvesting: string;
    erosionRisk: string;
    plantGuilds: string;
    siteChallenges: string;
    microclimates: string;
    zone1Design: string;
    localEcology: string;
    soilHealth: string;
    sunStrategy: string;
    // New sections for 21-section portfolio
    ethics: string;
    methodology: string;
    clientGoals: string;
    baseMapDescription: string;
    functionalGroupings: string;
    zonesDescription: string;
    implementationTimeline: string;
    maintenancePlan: string;
    conclusion: string;
}

export function generateReportContent(
    climate: ClimateData | null,
    elevation: ElevationData | null,
    soil: SoilData | null,
    ecology: EcologyData | null,
    lat?: number,
    lng?: number
): GeneratedReport {
    const getAridRegionName = (latVal: number, lngVal: number): string => {
        if (latVal >= 11 && latVal <= 20 && lngVal >= -18 && lngVal <= 25) {
            return "Sahelian";
        }
        if (latVal >= 24 && latVal <= 40 && lngVal >= -125 && lngVal <= -100) {
            return "Sonoran/Mojave Dryland";
        }
        if (latVal >= 30 && latVal <= 45 && lngVal >= -10 && lngVal <= 40) {
            return "Mediterranean Arid";
        }
        if (latVal >= -38 && latVal <= -15 && lngVal >= 110 && lngVal <= 155) {
            return "Australian Outback";
        }
        if (latVal >= 15 && latVal <= 35 && lngVal >= 30 && lngVal <= 60) {
            return "Arabian Dryland";
        }
        return "Arid Dryland";
    };

    const getAridPioneerTreeName = (latVal: number, lngVal: number): string => {
        if (latVal >= 11 && latVal <= 20 && lngVal >= -18 && lngVal <= 25) {
            return "Faidherbia albida (Apple Ring Acacia)";
        }
        if (latVal >= 24 && latVal <= 40 && lngVal >= -125 && lngVal <= -100) {
            return "Prosopis glandulosa (Honey Mesquite)";
        }
        if (latVal >= -38 && latVal <= -15 && lngVal >= 110 && lngVal <= 155) {
            return "Acacia aneura (Mulga)";
        }
        return "Acacia tortilis (Umbrella Thorn)";
    };

    const latVal = lat !== undefined && lat !== null ? lat : 14.43204;
    const lngVal = lng !== undefined && lng !== null ? lng : -16.25148;
    const tempVal = climate ? climate.temperature : 24.5;
    const precipVal = climate ? climate.precipitation : 1.2;
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

    const aridRegion = getAridRegionName(latVal, lngVal);
    const aridPioneer = getAridPioneerTreeName(latVal, lngVal);
    const slopeStr = elevation ? `${elevation.slope.toFixed(1)}%` : "1.2%";

    const report: GeneratedReport = {
        summary: `This report provides a preliminary permaculture site analysis for coordinates ${latVal.toFixed(5)}°, ${lngVal.toFixed(5)}° (${climateZone} system).`,
        waterHarvesting: "Data unavailable.",
        erosionRisk: "Data unavailable.",
        plantGuilds: "Data unavailable.",
        siteChallenges: "Data unavailable.",
        microclimates: "Data unavailable.",
        zone1Design: "Data unavailable.",
        localEcology: "Data unavailable.",
        soilHealth: "Data unavailable.",
        sunStrategy: "Data unavailable.",
        ethics: "Earth Care, People Care, Fair Share.",
        methodology: "OBREDIM (Observation, Boundary, Resources, Evaluation, Design, Implementation, Maintenance).",
        clientGoals: "Autonomy, Food Security, and Regenerative surplus.",
        baseMapDescription: `Custom property boundary with a ${slopeStr} slope. Design paths, swales, and structures are aligned to follow contours.`,
        functionalGroupings: "Zone 0 (Homestead), Zone 1 (Kitchen Garden), Zone 2 (Orchards), Zone 3 (Agroforestry), Zone 4 (Semi-Wild), Zone 5 (Wild Buffer).",
        zonesDescription: `Zoning transitions outward from the Zone 0 homestead to Zone 5 wild corridors, optimizing daily travel times and energy inputs.`,
        implementationTimeline: "Phase 1: Hydrology & Access (Months 0-3), Phase 2: Windbreaks & Soil prep (Months 3-6), Phase 3: Crop Guild Planting (Months 6-12).",
        maintenancePlan: "Seasonal swale clearing, first-flush filter maintenance, and annual soil mulching.",
        conclusion: `A resilient ${climateZone.toLowerCase()} landscape plan optimized for the unique microclimatic factors of the site.`,
    };

    if (climate) {
        const harvestingPotential = annualPrecip * 100; // 100m² roof
        report.waterHarvesting = `${climateZone} Water Plan: Potential annual harvest of ${harvestingPotential.toLocaleString(undefined, { maximumFractionDigits: 0 })} L from a 100m² roof. Peak rainfall of ${(climate.precipitation * 30).toFixed(0)}mm/mo requires gutter bypass and swale infiltration networks.`;

        if (climateZone === 'Arid') {
            report.plantGuilds = `${aridRegion} Dryland: Overstory of ${aridRegion === 'Sahelian' ? 'Baobab' : 'Desert Ironwood'} and ${aridRegion === 'Sahelian' ? 'Acacia' : 'Honey Mesquite'} paired with Moringa and Pigeon Pea.`;
        } else if (climateZone === 'Tropical') {
            report.plantGuilds = "Humid Tropical: Mango/Avocado and Grand Nain Banana guild with shade-loving Ginger/Turmeric and Vetiver grass.";
        } else if (climateZone === 'Temperate') {
            report.plantGuilds = "Temperate: Apple tree overstory with Comfrey accumulator, Wild Strawberries, and Yarrow insectary.";
        } else {
            report.plantGuilds = "Mediterranean/Subtropical: Olive and Fig canopy with Spanish Broom nitrogen-fixer, Rosemary, and Thyme.";
        }

        const challenges = [];
        if (climate.windSpeed > 15) {
            const windDirName = climate.windDirection > 315 || climate.windDirection <= 45 ? "NE" :
                                climate.windDirection > 45 && climate.windDirection <= 135 ? "SE" :
                                climate.windDirection > 135 && climate.windDirection <= 225 ? "SW" : "NW";
            challenges.push(`High wind exposure (${climate.windSpeed.toFixed(1)} km/h) from ${windDirName}. Windbreak shelterbelt required.`);
        }
        if (annualPrecip < 600) {
            challenges.push(`Drought risk (precipitation ${annualPrecip.toFixed(0)}mm/yr). Target active rainwater catchment and passive swales.`);
        } else if (annualPrecip > 1500) {
            challenges.push(`Monsoon/erosion risk (precipitation ${annualPrecip.toFixed(0)}mm/yr). Target active drainage swales and ground cover.`);
        }
        report.siteChallenges = challenges.length > 0 ? challenges.join(" ") : "Stable microclimate. Focus on maximizing biodiversity and soil organic carbon.";
    }

    if (elevation) {
        report.erosionRisk = elevation.slope > 5 
            ? `High erosion risk (Slope: ${elevation.slope.toFixed(1)}%). Terracing, vetiver grass contour bands, or deep water swales mandatory.`
            : `Low-to-moderate erosion risk (Slope: ${elevation.slope.toFixed(1)}%). Standard contour swales and berm planting recommended.`;
        
        if (climateZone === 'Arid') {
            report.microclimates = `Elevation: ${elevation.elevation}m. High solar exposure and evaporation rates. Use ${aridPioneer} for dry-season nurse canopy shade.`;
        } else if (climateZone === 'Tropical') {
            report.microclimates = `Elevation: ${elevation.elevation}m. High humidity; design open wind channels to prevent mold and support crop ventilation.`;
        } else if (climateZone === 'Temperate') {
            report.microclimates = `Elevation: ${elevation.elevation}m. Frost pockets possible in low points; locate home and tender crops on mid-slope thermal belt.`;
        } else {
            report.microclimates = `Elevation: ${elevation.elevation}m. Hot, dry summers; utilize afternoon shade patterns from windbreaks to cool crops.`;
        }
    }

    if (soil) {
        const phStatus = soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Neutral/Ideal";
        let amendment = "biochar, woodchip mulch, and compost";
        if (soil.ph < 6) {
            amendment = "calcified rock dust, biochar, and compost";
        } else if (soil.ph > 7.5) {
            amendment = "sulfur, pine needle mulch, and composted manure";
        }
        report.soilHealth = `Measured soil pH is ${phStatus} (${soil.ph.toFixed(1)} pH). Soil Organic Carbon (SOC) is low at ${soil.organicCarbon.toFixed(1)} g/kg. Rebuild soil structure with ${amendment}.`;
        
        if (climateZone === 'Arid') {
            report.zone1Design = `Intensive raised beds with buried clay Ollas and greywater lines in ${phStatus} soil.`;
        } else if (climateZone === 'Tropical') {
            report.zone1Design = `Raised growing beds to prevent waterlogging, utilizing deep compost sheet mulches in ${phStatus} soil.`;
        } else if (climateZone === 'Temperate') {
            report.zone1Design = `Double-dug organic beds with winter cover crops (clover, winter rye) in ${phStatus} soil.`;
        } else {
            report.zone1Design = `Keyhole kitchen garden beds using sheet mulching and drip lines in ${phStatus} soil.`;
        }
    }

    if (ecology && ecology.taxa && ecology.taxa.length > 0) {
        report.localEcology = `Observed regional species: ${ecology.taxa.slice(0, 5).join(', ')}. Use these native/naturalized species to select companion support crops.`;
    } else {
        if (climateZone === 'Arid') {
            report.localEcology = "Dryland pioneer species observed. Focus on deep-rooted nitrogen fixers and drought-resilient succulents.";
        } else if (climateZone === 'Tropical') {
            report.localEcology = "Vigorous tropical flora observed. High biodiversity support available; focus on weed suppression and nutrient-cycling trees.";
        } else if (climateZone === 'Temperate') {
            report.localEcology = "Temperate deciduous forest/field species observed. Design around winter dormancy periods and insect-attracting flowers.";
        } else {
            report.localEcology = "Mediterranean scrub and evergreen species observed. Design around fire resistance and summer drought tolerance.";
        }
    }

    return report;
}
