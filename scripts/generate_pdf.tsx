import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import PDFReport from '../src/components/PDFReport';
import path from 'path';
import fs from 'fs';

// Asset Paths removed - rendering vector SVG directly

const mockData = {
    location: { lat: 14.4587, lng: -16.0126 },
    boundaryCoords: [
        { lat: 14.4595, lng: -16.0135 },
        { lat: 14.4595, lng: -16.0115 },
        { lat: 14.4579, lng: -16.0115 },
        { lat: 14.4579, lng: -16.0135 }
    ],
    climate: { temperature: 28, precipitation: 1.2, windSpeed: 18, windDirection: 45, solarRadiation: 22 },
    elevation: { elevation: 25, slope: 1.2 },
    soil: { ph: 7.2, organicCarbon: 12 },
    ecology: { 
        taxa: ['Baobab', 'Acacia', 'Moringa', 'Cashew'],
        taxaDetails: [
            { name: 'Adansonia digitata', commonName: 'African Baobab', photoBase64: '' },
            { name: 'Acacia tortilis', commonName: 'Umbrella Thorn', photoBase64: '' },
            { name: 'Moringa oleifera', commonName: 'Moringa tree', photoBase64: '' },
            { name: 'Azadirachta indica', commonName: 'Neem tree', photoBase64: '' }
        ]
    },
    userData: {
        projectName: 'Senegal Permaculture Oasis',
        clientName: 'Master Plan Client',
        goals: 'Integrated food forestry, off-grid water sovereignty, and livestock cycling.',
        budget: 'Strategic Investment'
    },
    sunData: { times: { sunrise: new Date(), sunset: new Date() } },
    generatedReport: {
        summary: "Full OSU PDC PRO portfolio design.",
        waterHarvesting: "Ollas, Swales, and 20kL storage.",
        erosionRisk: "Low (1.2% slope).",
        plantGuilds: "Baobab/Mango overstory with Moringa support.",
        siteChallenges: "Harmattan winds and seasonal aridity.",
        microclimates: "Cooling via Faidherbia albida canopy.",
        zone1Design: "Intensive kitchen garden with Olla irrigation.",
        localEcology: "Native Dior soil species.",
        soilHealth: "Neutral pH, low SOC.",
        sunStrategy: "15 degree South tilt for solar panels.",
        ethics: "Earth Care, People Care, Fair Share.",
        methodology: "OBREDIM Process.",
        clientGoals: "Autonomy and Food Security.",
        baseMapDescription: "25m x 100m plot near coast.",
        functionalGroupings: "Living, Production, Cycles.",
        zonesDescription: "Zones 0-5 implemented.",
        implementationTimeline: "12-month primary roll-out.",
        maintenancePlan: "Seasonal swale maintenance.",
        conclusion: "Ready for deployment."
    },
    maps: null
};

const outputFilePath = path.join(__dirname, '../public/reports/Senegal_PDC_PRO_Portfolio_Final.pdf');

async function generate() {
    console.log('Generating Final PDC PRO Landscape PDF...');
    try {
        const loadMockAsset = (fileName: string): string => {
            const filePath = path.join(__dirname, '../public/images', fileName);
            if (fs.existsSync(filePath)) {
                return `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`;
            }
            return '';
        };
        
        const testMockData = {
            ...mockData,
            maps: {
                satelliteMap: '',
                topoMap: '',
                streetMap: '',
                hillshadeMap: '',
                bananaGuild: loadMockAsset('nano_banana_guild.jpg'),
                waterHarvesting: loadMockAsset('water_harvesting.jpg'),
                gravityDrip: loadMockAsset('gravity_drip.jpg'),
                contourSwales: loadMockAsset('contour_swales.jpg'),
                concentricZoning: loadMockAsset('concentric_zoning.jpg'),
                functionalConcept: loadMockAsset('functional_concept.jpg')
            }
        };

        await ReactPDF.renderToFile(
            <PDFReport {...testMockData} />,
            outputFilePath
        );
        console.log(`PDF generated successfully at: ${outputFilePath}`);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

generate();
