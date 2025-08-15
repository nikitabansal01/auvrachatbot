# Store Search Setup Guide

This guide explains how to set up real-time store search functionality in your chatbot.

## 🚀 Quick Start

The store search system now provides **real-time, location-based store recommendations** instead of hardcoded suggestions.

## 🔑 Required API Keys

### Google Places API (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Places API**
4. Create credentials (API Key)
5. Add the API key to your environment variables:

```bash
# .env.local
GOOGLE_PLACES_API_KEY=your_api_key_here
```

## 📍 How It Works

### With Google Places API:
- **Real-time search** for stores in user's location
- **Actual store data** including names, addresses, ratings, hours
- **Distance calculations** based on user coordinates
- **Store details** like phone numbers and opening hours

### Without API (Fallback):
- **Smart fallback** to common store chains
- **Location-aware suggestions** based on city/state
- **Generic store types** with helpful search links

## 🛠️ API Endpoint

The system uses `/api/search-stores` endpoint that:
- Accepts `query`, `lat`, and `lng` parameters
- Searches multiple store types (health food, pharmacy, grocery)
- Returns formatted store results
- Handles errors gracefully

## 🔍 Search Strategy

1. **Primary Search**: Google Places API for real stores
2. **Fallback Search**: Common store chains in the area
3. **Manual Search**: Links to Google Maps, Yelp, Google Search

## 📱 User Experience

Users now see:
- ✅ **Real store names** instead of generic suggestions
- 📍 **Actual addresses** and distances
- ⭐ **Store ratings** and hours
- 📞 **Phone numbers** for calling ahead
- 🔗 **Direct links** to Google Maps

## 🚨 Troubleshooting

### Store Search Not Working?
1. Check if `/api/search-stores` endpoint is accessible
2. Verify Google Places API key is set correctly
3. Check browser console for error messages
4. Ensure location coordinates are valid

### Fallback Mode Active?
- System automatically falls back to generic suggestions
- Users still get helpful store recommendations
- Search tools remain fully functional

## 💡 Future Enhancements

- **Yelp API integration** for reviews and photos
- **Store inventory checking** for specific items
- **Price comparison** across stores
- **Delivery/pickup options** integration

## 🔒 Security Notes

- API keys are server-side only
- User locations are not stored permanently
- Search queries are logged for debugging only
- No personal data is shared with third parties 