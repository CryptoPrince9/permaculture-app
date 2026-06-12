import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get('url');
  const qParam = searchParams.get('q');
  
  const query = qParam || urlParam;
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  // If it's a geocoding search query (not starting with http)
  if (!query.startsWith('http://') && !query.startsWith('https://')) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Permaculture-Intelligence-App/1.0 (ahmed-khalils-projects)'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return NextResponse.json({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        });
      }
      return NextResponse.json({ error: 'Address not found' }, { status: 422 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Geocoding failed' }, { status: 500 });
    }
  }
  
  try {
    // Follow redirect
    const response = await fetch(query, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const finalUrl = response.url;
    
    // Extract coordinates from final URL
    const gmapsCoordsRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qCoordsRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const generalRegex = /(-?\d+\.\d+),(-?\d+\.\d+)/;
    
    let match = finalUrl.match(gmapsCoordsRegex) || finalUrl.match(qCoordsRegex) || finalUrl.match(generalRegex);
    
    if (match) {
      return NextResponse.json({
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        resolvedUrl: finalUrl
      });
    }
    
    // Fallback: search response body text
    const text = await response.text();
    const staticMapRegex = /staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/;
    let staticMatch = text.match(staticMapRegex);
    if (staticMatch) {
      return NextResponse.json({
        lat: parseFloat(staticMatch[1]),
        lng: parseFloat(staticMatch[2])
      });
    }
    
    return NextResponse.json({ error: 'Could not extract coordinates from the resolved URL.' }, { status: 422 });
  } catch (error: any) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: error.message || 'Failed to resolve URL.' }, { status: 500 });
  }
}
