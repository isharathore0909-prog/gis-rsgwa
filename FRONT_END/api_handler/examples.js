/**
 * API Handler Usage Examples
 * 
 * This file demonstrates how to use the centralized API handler.
 */

import api from '../api_handler';

// ==================== Location API Examples ====================

export async function exampleLocationAPI() {
    console.log('=== Location API Examples ===\n');

    // Get Rajasthan state
    const states = await api.location.getStates({ name: 'Rajasthan' });
    console.log('Rajasthan:', states[0]);

    // Get districts of Rajasthan
    const rajasthanId = states[0].id;
    const districts = await api.location.getDistricts({ state: rajasthanId });
    console.log(`Districts: ${districts.length}`);

    // Get blocks of first district
    if (districts.length > 0) {
        const districtId = districts[0].id;
        const blocks = await api.location.getBlocks({ district: districtId });
        console.log(`Blocks in ${districts[0].name}: ${blocks.length}`);
    }

    // Get location codes for Jaipur
    const codes = await api.location.getLocationCodes({ dist_name: 'Jaipur' });
    console.log('Location codes for Jaipur:', codes.length);
}

// ==================== Boundary API Examples ====================

export async function exampleBoundaryAPI() {
    console.log('\n=== Boundary API Examples ===\n');

    // Get district boundaries from backend
    const states = await api.location.getStates({ name: 'Rajasthan' });
    const rajasthanId = states[0].id;

    const districtBoundaries = await api.boundaries.getCollection({
        layer: 'district',
        parent_id: rajasthanId
    });
    console.log('District boundaries:', districtBoundaries.features.length);

    // Get boundary from external API
    const externalBoundary = await api.boundaries.getByDistrictCode('01');
    if (externalBoundary) {
        console.log('External boundary fetched:', externalBoundary.features.length, 'features');
    }

    // Get block boundaries
    const districts = await api.location.getDistricts({ state: rajasthanId });
    if (districts.length > 0) {
        const blockBoundaries = await api.boundaries.getCollection({
            layer: 'block',
            parent_id: districts[0].id
        });
        console.log('Block boundaries:', blockBoundaries.features.length);
    }
}

// ==================== Data API Examples ====================

export async function exampleDataAPI() {
    console.log('\n=== Data API Examples ===\n');

    // Get rainfall data
    const rainfall = await api.data.getRainfall({
        district: 'Jaipur',
        start_date: '2024-01-01',
        end_date: '2024-12-31'
    });
    console.log('Rainfall records:', rainfall.results?.length || rainfall.length);

    // Get water quality data
    const waterQuality = await api.data.getWaterQuality({
        district: 'Jaipur'
    });
    console.log('Water quality records:', waterQuality.results?.length || waterQuality.length);
}

// ==================== Geocoding Examples ====================

export async function exampleGeocodingAPI() {
    console.log('\n=== Geocoding API Examples ===\n');

    // Get address by coordinates (Jaipur coordinates)
    const address = await api.geocoding.getAddressByLatLon(
        26.9124,  // latitude
        75.7873,  // longitude
        true      // include boundary
    );
    console.log('Address:', address);

    // Get multiple points
    const points = await api.geocoding.getMultiplePoints([
        { lat: 26.9124, lon: 75.7873 },
        { lat: 26.8467, lon: 75.8036 }
    ]);
    console.log('Multiple points:', points);
}

// ==================== Hierarchical Boundary Fetching ====================

export async function exampleHierarchicalBoundaries() {
    console.log('\n=== Hierarchical Boundary Fetching ===\n');

    try {
        // Step 1: Get Rajasthan
        const states = await api.location.getStates({ name: 'Rajasthan' });
        const rajasthan = states[0];
        console.log('1. State:', rajasthan.name);

        // Step 2: Get Districts
        const districts = await api.boundaries.getCollection({
            layer: 'district',
            parent_id: rajasthan.id
        });
        console.log('2. Districts:', districts.features.length);

        // Step 3: Get Blocks of first district
        const firstDistrict = districts.features[0];
        const blocks = await api.boundaries.getCollection({
            layer: 'block',
            parent_id: firstDistrict.id
        });
        console.log('3. Blocks in', firstDistrict.properties.name, ':', blocks.features.length);

        // Step 4: Get GPs of first block
        if (blocks.features.length > 0) {
            const firstBlock = blocks.features[0];
            const gps = await api.boundaries.getCollection({
                layer: 'gp',
                parent_id: firstBlock.id
            });
            console.log('4. GPs in', firstBlock.properties.name, ':', gps.features.length);

            // Step 5: Get Villages of first GP
            if (gps.features.length > 0) {
                const firstGP = gps.features[0];
                const villages = await api.boundaries.getCollection({
                    layer: 'village',
                    parent_id: firstGP.id
                });
                console.log('5. Villages in', firstGP.properties.name, ':', villages.features.length);
            }
        }
    } catch (error) {
        console.error('Error in hierarchical fetching:', error);
    }
}

// ==================== Error Handling Example ====================

export async function exampleErrorHandling() {
    console.log('\n=== Error Handling Examples ===\n');

    try {
        // This will fail if backend is not running
        const data = await api.location.getStates();
        console.log('✅ Backend is running');
    } catch (error) {
        console.error('❌ Backend error:', error.message);
    }

    try {
        // This will fail if external API is not accessible
        const boundary = await api.boundaries.getByDistrictCode('01');
        if (boundary) {
            console.log('✅ External API is accessible');
        } else {
            console.log('⚠️ External API returned null');
        }
    } catch (error) {
        console.error('❌ External API error:', error.message);
    }
}

// ==================== Combined Example ====================

export async function exampleCombinedUsage() {
    console.log('\n=== Combined Usage Example ===\n');

    try {
        // 1. Get location data
        const states = await api.location.getStates({ name: 'Rajasthan' });
        const rajasthan = states[0];

        // 2. Get location codes
        const codes = await api.location.getLocationCodes({ dist_name: 'Jaipur' });

        if (codes.length > 0) {
            const firstCode = codes[0];
            console.log('Location code:', firstCode);

            // 3. Fetch boundary from external API using code
            const boundary = await api.boundaries.getByDistrictCode(firstCode.dist_code);

            if (boundary) {
                console.log('✅ Successfully fetched boundary from external API');
                console.log('   Features:', boundary.features.length);
            }

            // 4. Also get from backend for comparison
            const backendBoundary = await api.boundaries.getCollection({
                layer: 'district',
                parent_id: rajasthan.id
            });
            console.log('✅ Backend boundaries:', backendBoundary.features.length);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// ==================== Run All Examples ====================

export async function runAllExamples() {
    console.log('🚀 Running all API handler examples...\n');

    await exampleLocationAPI();
    await exampleBoundaryAPI();
    await exampleDataAPI();
    await exampleGeocodingAPI();
    await exampleHierarchicalBoundaries();
    await exampleErrorHandling();
    await exampleCombinedUsage();

    console.log('\n✅ All examples completed!');
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
    window.apiExamples = {
        runAll: runAllExamples,
        location: exampleLocationAPI,
        boundary: exampleBoundaryAPI,
        data: exampleDataAPI,
        geocoding: exampleGeocodingAPI,
        hierarchical: exampleHierarchicalBoundaries,
        errorHandling: exampleErrorHandling,
        combined: exampleCombinedUsage,
    };
    console.log('💡 API examples loaded! Use window.apiExamples.runAll() to test all');
}
