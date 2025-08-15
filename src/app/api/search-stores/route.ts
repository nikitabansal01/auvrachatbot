import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Check if we have Google Places API key
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!googleApiKey) {
      // Fallback: return generic store suggestions
      return NextResponse.json({
        stores: generateGenericStores(query),
        message: 'Using generic store suggestions (Google Places API not configured)'
      });
    }

    // Use Google Places API to find real stores
    const stores = await searchGooglePlaces(query, lat, lng, googleApiKey);
    
    return NextResponse.json({ stores });
  } catch (error) {
    console.error('Store search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search stores',
      stores: []
    }, { status: 500 });
  }
}

async function searchGooglePlaces(query: string, lat: string | null, lng: string | null, apiKey: string) {
  try {
    // Build the search URL
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&type=establishment`;
    
    if (lat && lng) {
      searchUrl += `&location=${lat},${lng}&radius=50000`; // 50km radius
    }
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        formatted_address: place.formatted_address,
        rating: place.rating,
        opening_hours: place.opening_hours,
        formatted_phone_number: place.formatted_phone_number,
        distance: calculateDistance(lat, lng, place.geometry?.location?.lat, place.geometry?.location?.lng)
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Google Places API error:', error);
    return [];
  }
}

function calculateDistance(lat1: string | null, lng1: string | null, lat2: number | undefined, lng2: number | undefined): string {
  if (!lat1 || !lng1 || lat2 === undefined || lng2 === undefined) {
    return 'Unknown distance';
  }
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - parseFloat(lat1)) * Math.PI / 180;
  const dLng = (lng2 - parseFloat(lng1)) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(parseFloat(lat1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return `${distance.toFixed(1)} miles`;
}

function generateGenericStores(query: string): any[] {
  // Fallback store suggestions when API is not available
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('health') || queryLower.includes('natural')) {
    return [
      {
        place_id: 'generic_1',
        name: 'Whole Foods Market',
        vicinity: 'Multiple locations',
        formatted_address: 'Check local directory',
        rating: 4.2,
        opening_hours: { open_now: true },
        formatted_phone_number: 'Call local store',
        distance: '2-8 miles'
      },
      {
        place_id: 'generic_2',
        name: 'Sprouts Farmers Market',
        vicinity: 'Multiple locations',
        formatted_address: 'Check local directory',
        rating: 4.0,
        opening_hours: { open_now: true },
        formatted_phone_number: 'Call local store',
        distance: '3-10 miles'
      }
    ];
  }
  
  if (queryLower.includes('pharmacy')) {
    return [
      {
        place_id: 'generic_3',
        name: 'CVS Pharmacy',
        vicinity: 'Multiple locations',
        formatted_address: 'Check local directory',
        rating: 3.8,
        opening_hours: { open_now: true },
        formatted_phone_number: 'Call local store',
        distance: '1-5 miles'
      },
      {
        place_id: 'generic_4',
        name: 'Walgreens',
        vicinity: 'Multiple locations',
        formatted_address: 'Check local directory',
        rating: 3.9,
        opening_hours: { open_now: true },
        formatted_phone_number: 'Call local store',
        distance: '1-6 miles'
      }
    ];
  }
  
  // Default grocery stores
  return [
    {
      place_id: 'generic_5',
      name: 'Safeway',
      vicinity: 'Multiple locations',
      formatted_address: 'Check local directory',
      rating: 3.7,
      opening_hours: { open_now: true },
      formatted_phone_number: 'Call local store',
      distance: '2-7 miles'
    },
    {
      place_id: 'generic_6',
      name: 'Local Grocery Store',
      vicinity: 'Check local directory',
      formatted_address: 'Check local directory',
      rating: 4.0,
      opening_hours: { open_now: true },
      formatted_phone_number: 'Call local store',
      distance: '1-4 miles'
    }
  ];
} 