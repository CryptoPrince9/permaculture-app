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
    ecology: EcologyData | null
): GeneratedReport {
    const report: GeneratedReport = {
        summary: "This report provides a preliminary permaculture site analysis based on global datasets.",
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
        baseMapDescription: "25m x 100m rectangular plot with a 1.2% westward slope.",
        functionalGroupings: "Living, Intensive Production, Animal Cycling, Buffer, Wild corridor.",
        zonesDescription: "Zone 0 (House) to Zone 5 (Wild/Buffer) implementation.",
        implementationTimeline: "Phase 1: Hydrology (Mo 0-3), Phase 2: Biomass (Mo 3-6), Phase 3: Yield (Mo 6-12).",
        maintenancePlan: "Seasonal swale clearing and annual soil amendment application.",
        conclusion: "A robust semi-arid design ready for site-specific validation.",
    };

    if (climate) {
        const annualPrecip = climate.precipitation * 365;
        const roofArea = 100;
        const harvestingPotential = annualPrecip * roofArea;
        report.waterHarvesting = `Potential annual harvest: ${harvestingPotential.toLocaleString()} L from a 100m² catchment. Prioritize earthworks like swales for the 430mm seasonal peak.`;

        if (climate.temperature < 25) {
            report.plantGuilds = "Temperate/Subtropical: Mango, Cashew, and Pigeon Pea overstory.";
        } else {
            report.plantGuilds = "Arid/Sahelian: Baobab, Moringa, Neem, and Acacia senegal guilds recommended.";
        }

        const challenges = [];
        if (climate.windSpeed > 15) challenges.push(`High wind exposure (${climate.windSpeed}km/h) from NE. Dense windbreaks required.`);
        if (annualPrecip < 500) challenges.push("Semi-arid conditions. Focus on 'planting the rain' via swales and Zai pits.");
        report.siteChallenges = challenges.length > 0 ? challenges.join(" ") : "Stable climate detected.";
    }

    if (elevation) {
        report.erosionRisk = elevation.slope > 5 
            ? `Moderate erosion risk (Slope: ${elevation.slope.toFixed(1)}%). Terracing or contour swales mandatory.`
            : `Low erosion risk (Slope: ${elevation.slope.toFixed(1)}%). Suitable for standard swales.`;
        
        report.microclimates = `Elevation: ${elevation.elevation}m. High evaporation; use 'Faidherbia albida' for dry-season shade.`;
    }

    if (soil) {
        const phStatus = soil.ph < 6 ? "Acidic" : soil.ph > 7.5 ? "Alkaline" : "Neutral/Ideal";
        report.soilHealth = `The soil is ${phStatus} (pH ${soil.ph}). SOC at ${soil.organicCarbon} g/kg is low; prioritize biochar and deep mulching.`;
        report.zone1Design = `Intensive kitchen garden with Olla irrigation to minimize evaporation in ${phStatus} soil.`;
    }

    if (ecology && ecology.taxa.length > 0) {
        report.localEcology = `Observed species: ${ecology.taxa.slice(0, 5).join(', ')}. Guide for support species choices.`;
    }

    return report;
}
