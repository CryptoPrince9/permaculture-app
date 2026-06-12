import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { lat, lng, boundary } = await request.json();

    if (lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing lat or lng coordinates.' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // e.g. "username/permaculture-app"

    if (!token || !repo) {
      // Return a simulated success with a guide message if credentials are not configured,
      // so that it works out-of-the-box and guides the user on how to enable live repo dispatches.
      return NextResponse.json({ 
        success: false, 
        warning: 'GitHub credentials not configured. Please define GITHUB_TOKEN and GITHUB_REPO in .env.local to trigger live repository workflows.',
        simulatedPayload: {
          url: `https://api.github.com/repos/${repo || 'OWNER/REPO'}/dispatches`,
          event_type: 'run-gis-pipeline',
          client_payload: { lat, lng, boundary }
        }
      });
    }

    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Permaculture-App-Orchestrator'
      },
      body: JSON.stringify({
        event_type: 'run-gis-pipeline',
        client_payload: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          boundary: boundary || []
        }
      })
    });

    if (res.ok) {
      return NextResponse.json({ 
        success: true, 
        message: `QGIS pipeline triggered successfully on GitHub repository: ${repo}` 
      });
    } else {
      const errorText = await res.text();
      return NextResponse.json({ 
        error: `Failed to trigger GitHub pipeline (Status: ${res.status})`, 
        details: errorText 
      }, { status: res.status });
    }

  } catch (err: any) {
    console.error('Trigger QGIS error:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to dispatch QGIS pipeline' 
    }, { status: 500 });
  }
}
