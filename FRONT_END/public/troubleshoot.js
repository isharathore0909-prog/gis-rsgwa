/**
 * Boundary Troubleshooting Script
 * 
 * Add this to your browser console to debug boundary issues
 */

// Check if Final_Dist_Boundary.geojson is accessible
fetch('/Final_Dist_Boundary.geojson')
    .then(response => {
        console.log('✅ Final_Dist_Boundary.geojson response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Final_Dist_Boundary.geojson loaded successfully');
        console.log('   Type:', data.type);
        console.log('   Features:', data.features?.length || 'No features array');
        console.log('   First feature:', data.features?.[0] || data);
    })
    .catch(err => {
        console.error('❌ Error loading Final_Dist_Boundary.geojson:', err);
    });

// Check API connectivity
fetch('http://localhost:8000/api/location/states/?name=Rajasthan')
    .then(response => {
        console.log('✅ API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ States API response:', data);
        if (data && data.length > 0) {
            const rajasthanId = data[0].id;
            console.log('   Rajasthan ID:', rajasthanId);

            // Try to fetch districts
            return fetch(`http://localhost:8000/api/location/boundary-collection/?layer=district&parent_id=${rajasthanId}`, {
                headers: {
                    'X-Auth-Key': 'a5c8b623-33a2-4ab7-9b75-36589801b6ec'
                }
            });
        }
    })
    .then(response => {
        if (response) {
            console.log('✅ Districts API response status:', response.status);
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            console.log('✅ Districts data:', data);
            console.log('   Features count:', data.features?.length || 0);
        }
    })
    .catch(err => {
        console.error('❌ Error with API:', err);
    });

// Check external API
fetch('http://gpspl.geoplanetsolution.in/boundary-by-code/?district_code=01', {
    headers: {
        'X-Auth-Key': '00e94e69243f442580830ecfee5abe8f'
    }
})
    .then(response => {
        console.log('✅ External API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ External API response:', data);
    })
    .catch(err => {
        console.error('❌ Error with external API:', err);
    });

console.log('🔍 Troubleshooting script loaded. Check results above.');
