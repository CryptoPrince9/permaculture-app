export interface ClimateData {
    temperature: number;
    precipitation: number;
    windSpeed: number;
    windDirection: number;
    solarRadiation: number;
}

export interface ElevationData {
    elevation: number;
    slope: number;
}

export interface EcologyData {
    taxa: string[];
}

export async function fetchClimateData(lat: number, lng: number): Promise<ClimateData> {
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=precipitation_sum,shortwave_radiation_sum&timezone=auto`
        );
        const data = await response.json();
        return {
            temperature: data.current_weather.temperature,
            precipitation: data.daily?.precipitation_sum?.[0] || 0,
            windSpeed: data.current_weather.windspeed,
            windDirection: data.current_weather.winddirection,
            solarRadiation: data.daily?.shortwave_radiation_sum?.[0] || 0,
        };
    } catch (error) {
        console.error("Error fetching climate data:", error);
        return { temperature: 0, precipitation: 0, windSpeed: 0, windDirection: 0, solarRadiation: 0 };
    }
}

export async function fetchElevationData(lat: number, lng: number): Promise<ElevationData> {
    try {
        // Query 5 points to calculate slope (approximate 100m grid)
        const offset = 0.001; // roughly 111 meters
        const points = [
            { lat, lng },
            { lat: lat + offset, lng },
            { lat: lat - offset, lng },
            { lat, lng: lng + offset },
            { lat, lng: lng - offset },
        ];
        const latParam = points.map(p => p.lat).join(',');
        const lngParam = points.map(p => p.lng).join(',');

        const response = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${latParam}&longitude=${lngParam}`
        );
        const data = await response.json();
        const e = data.elevation || [0, 0, 0, 0, 0];
        
        // Simple grade calculation: (delta elevation / distance)
        const dz_ns = Math.abs(e[1] - e[2]);
        const dz_ew = Math.abs(e[3] - e[4]);
        const dist = offset * 111000 * 2; // Distance between points in meters
        const slope = (Math.max(dz_ns, dz_ew) / dist) * 100; // slope in percentage

        return {
            elevation: e[0],
            slope: slope,
        };
    } catch (error) {
        console.error("Error fetching elevation data:", error);
        return { elevation: 0, slope: 0 };
    }
}

export interface SoilData {
    ph: number;
    organicCarbon: number;
}

export async function fetchSoilData(lat: number, lng: number): Promise<SoilData> {
    try {
        const response = await fetch(
            `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=phh2o&property=soc&depth=0-5cm&value=mean`
        );
        const data = await response.json();
        const phLayer = data.properties?.layers?.find((l: any) => l.name === 'phh2o');
        const socLayer = data.properties?.layers?.find((l: any) => l.name === 'soc');

        return {
            ph: phLayer?.depths?.[0]?.values?.mean ? phLayer.depths[0].values.mean / 10 : 0,
            organicCarbon: socLayer?.depths?.[0]?.values?.mean ? socLayer.depths[0].values.mean / 10 : 0,
        };
    } catch (error) {
        console.error("Error fetching soil data:", error);
        return { ph: 0, organicCarbon: 0 };
    }
}

export async function fetchEcologyData(lat: number, lng: number): Promise<EcologyData> {
    try {
        const response = await fetch(
            `https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=5&per_page=10`
        );
        const data = await response.json();
        const taxa = data.results?.map((r: any) => r.taxon?.preferred_common_name || r.taxon?.name);
        return { taxa: taxa || [] };
    } catch (error) {
        console.error("Error fetching ecology data:", error);
        return { taxa: [] };
    }
}

