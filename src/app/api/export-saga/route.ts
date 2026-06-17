import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const projectName = searchParams.get('project') || 'Permaculture Landscape Plan';

    if (!latParam || !lngParam) {
      return new Response('Missing lat or lng', { status: 400 });
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response('Invalid lat or lng', { status: 400 });
    }

    // Solar angle details for SAGA lighting
    const azimuth = 315.0; // Standard NW illumination for shaded relief
    const declination = 45.0; // Standard elevation angle

    const batContent = `@echo off
:: =====================================================================
:: SAGA GIS Headless Terrain & Hydrology Processor
:: Project: ${projectName}
:: Target Site: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}
:: Generated: 2026-06-17
:: =====================================================================
echo [INFO] Initializing SAGA GIS Terrain Analysis Pipeline...
echo.

:: 1. Define paths and environment variables. Update SAGA_PATH if installed in a different location.
set SAGA_PATH="C:\\Program Files\\SAGA"
set PATH=%SAGA_PATH%;%PATH%

:: 2. Check SAGA Installation
where saga_cmd >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] SAGA GIS command-line tool (saga_cmd.exe) was not found in PATH or %SAGA_PATH%.
    echo Please install SAGA GIS from https://saga-gis.sourceforge.io and update SAGA_PATH in this script.
    pause
    exit /b 1
)

:: 3. Prepare input DEM. Download a local GeoTIFF DEM (e.g. SRTM 30m) and place it in the same directory as 'dem.tif'.
if not exist "dem.tif" (
    echo [WARNING] Input 'dem.tif' was not found in the current directory.
    echo Please place a local elevation GeoTIFF (dem.tif) matching the site boundary in this directory.
    echo.
)

echo [STEP 1/6] Importing DEM GeoTIFF into SAGA Grid Format...
saga_cmd io_gdal 0 -FILES=dem.tif -GRIDS=dem.sgrd
if %errorlevel% neq 0 echo [WARN] Failed to import dem.tif. Make sure dem.tif exists and is a valid GeoTIFF.

echo.
echo [STEP 2/6] Running SAGA Sink-Removal (Wang & Liu Preprocessor)...
:: wang_liu algorithm: ta_preprocessor module 4
saga_cmd ta_preprocessor 4 -ELEV=dem.sgrd -FILLED=dem_filled.sgrd -MINSLOPE=0.01
if %errorlevel% neq 0 echo [WARN] Preprocessing sink-fill failed.

echo.
echo [STEP 3/6] Calculating Morphometry Indices (Slope, Aspect, Curvature)...
:: ta_morphometry module 0
saga_cmd ta_morphometry 0 -ELEVATION=dem_filled.sgrd -SLOPE=slope.sgrd -ASPECT=aspect.sgrd -HCURV=hcurvature.sgrd -VCURV=vcurvature.sgrd
if %errorlevel% neq 0 echo [WARN] Morphometry calculation failed.

echo.
echo [STEP 4/6] Running Top-Down Flow Accumulation model...
:: ta_hydrology module 0
saga_cmd ta_hydrology 0 -ELEVATION=dem_filled.sgrd -FLOW=flow_accum.sgrd -METHOD=4
if %errorlevel% neq 0 echo [WARN] Hydrology flow accumulation calculation failed.

echo.
echo [STEP 5/6] Computing Topographic Wetness Index (TWI)...
:: ta_hydrology module 15
saga_cmd ta_hydrology 15 -DEM=dem_filled.sgrd -TWI=twi.sgrd
if %errorlevel% neq 0 echo [WARN] TWI calculation failed.

echo.
echo [STEP 6/6] Generating Shaded Relief (Analytical Hillshading)...
:: ta_lighting module 0
saga_cmd ta_lighting 0 -ELEVATION=dem_filled.sgrd -SHADE=hillshade.sgrd -AZIMUTH=${azimuth} -DECLINATION=${declination}
if %errorlevel% neq 0 echo [WARN] Lighting hillshade calculation failed.

echo.
echo [INFO] Exporting SAGA Grids back to standard GeoTIFF format for QGIS overlay...
saga_cmd io_gdal 1 -GRIDS=slope.sgrd -FILE=twi_slope.tif
saga_cmd io_gdal 1 -GRIDS=flow_accum.sgrd -FILE=twi_flow_accum.tif
saga_cmd io_gdal 1 -GRIDS=twi.sgrd -FILE=twi_wetness.tif
saga_cmd io_gdal 1 -GRIDS=hillshade.sgrd -FILE=twi_hillshade.tif

echo.
echo =====================================================================
echo [SUCCESS] SAGA GIS processing complete! 
echo Shaded Relief (twi_hillshade.tif), Wetness Index (twi_wetness.tif),
echo Slope (twi_slope.tif), and Flow Accumulation (twi_flow_accum.tif)
echo have been exported. Open these files in QGIS for permaculture planning.
echo =====================================================================
pause
`;

    return new Response(batContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-bat',
        'Content-Disposition': `attachment; filename="${projectName.replace(/\s+/g, '_')}_saga_process.bat"`,
      },
    });

  } catch (globalErr: any) {
    console.error('SAGA batch script Exporter crash:', globalErr);
    return new Response('Failed to compile SAGA batch script', { status: 500 });
  }
}
