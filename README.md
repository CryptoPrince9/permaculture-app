# Permaculture Report App

A Next.js application for generating comprehensive permaculture site reports.

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App
1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to:
    **[http://localhost:3000](http://localhost:3000)**

## Features
- **Interactive Map**: Switch between Street and Satellite views.
- **Location Selection**:
    - Click on the map.
    - Draw a polygon boundary.
    - Paste a Google Maps link (e.g., `@51.5,-0.09`).
- **Data Analysis**:
    - Climate (Temperature, Precipitation, Wind, Solar).
    - Topography (Elevation, Slope).
    - Soil (pH, Organic Carbon).
- **Report Generation**:
    - View data on-screen.
    - Download a comprehensive 21-section PDF report.

## Deployments
- **Production Build**: Verified and fully compiling with `npm run build`.
- **Automatic CI/CD**: Linked directly to the GitHub repository. Every push to the `main` branch automatically triggers a new deployment on Vercel.
