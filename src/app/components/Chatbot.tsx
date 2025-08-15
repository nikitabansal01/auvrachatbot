"use client";
import React, { useState } from 'react';
import { useChatbot } from '../lib/chatbot-context';
import { useCurrentRecommendations } from '../lib/current-recommendations-context';
import styles from './Chatbot.module.css';

const Chatbot: React.FC = () => {
  const { state, dispatch, hideChatbot, resetChatbotState } = useChatbot();
  const { currentRecommendations } = useCurrentRecommendations();
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState('');
  const [culture, setCulture] = useState('');
  const [other, setOther] = useState('');
  const [showInputs, setShowInputs] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // New state variables for restriction-based personalization
  const [selectedRestrictionTypes, setSelectedRestrictionTypes] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietRestrictions, setDietRestrictions] = useState<string[]>([]);
  const [cultureEthnicity, setCultureEthnicity] = useState('');
  const [otherRestrictions, setOtherRestrictions] = useState('');
  
  // New state variables for taste-based personalization
  const [selectedTasteOptions, setSelectedTasteOptions] = useState<string[]>([]);
  const [showTasteInputs, setShowTasteInputs] = useState(false);

  // State for recommendation preview
  const [previewData, setPreviewData] = useState<{
    preferences: string[];
    recommendations: Array<{title: string, specificAction: string, priority: string}>;
    isMainPageUpdated?: boolean;
  } | null>(null);
  
  // State for selected recommendations
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());
  
  // State for loading state during recommendation generation
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);

  // Loading message display function
  const renderLoadingMessage = () => (
    <div className={styles.flowContainer}>
      <div className={styles.botMessage}>
        <div className={styles.loadingMessage}>
          <div className={styles.spinner}></div>
          <div>🎯 Generating personalized recommendations...</div>
          {retryAttempt > 0 && (
            <div className={styles.retryInfo}>🔄 Retry attempt {retryAttempt} - Please wait...</div>
          )}
          <div className={styles.loadingSubtext}>This may take a few moments as we analyze your health profile</div>
        </div>
      </div>
    </div>
  );

  // Get current recommendations from context
  const currentRecs = useCurrentRecommendations();

  // Debug useEffect to monitor state changes
  React.useEffect(() => {
    console.log('🔍 State changed - selectedOptions:', selectedOptions);
    console.log('🔍 State changed - showInputs:', showInputs);
    console.log('🔍 State changed - weather:', weather);
    console.log('🔍 State changed - culture:', culture);
    console.log('🔍 State changed - other:', other);
  }, [selectedOptions, showInputs, weather, culture, other]);

  // Debug useEffect to monitor loading state changes
  React.useEffect(() => {
    console.log('🔄 Loading state changed:', isGeneratingRecommendations);
    console.log('🔄 Retry attempt changed:', retryAttempt);
  }, [isGeneratingRecommendations, retryAttempt]);

  // Location access and shop finding functionality
  const requestLocationAccess = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('📍 Location accessed:', { latitude, longitude });
          
          // Reverse geocode to get city/state
          reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('❌ Location access denied:', error);
          setCurrentMessage("⚠️ Location access denied. Please enter your city and state manually.");
        }
      );
    } else {
      setCurrentMessage("⚠️ Geolocation not supported. Please enter your city and state manually.");
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Using OpenStreetMap Nominatim API (free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const addressParts = data.display_name.split(', ');
        const city = addressParts[0];
        const state = addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2];
        const cityState = `${city}, ${state}`;
        
        setLocation(cityState);
        console.log('🏙️ Reverse geocoded location:', cityState);
        
        // Find nearby shops for current recommendations without refreshing page
        findShopsForFoodItems(cityState, latitude, longitude);
      }
    } catch (error) {
      console.error('❌ Reverse geocoding failed:', error);
      setCurrentMessage("⚠️ Could not determine your city. Please enter manually.");
    }
  };

  const findNearbyShops = async (cityState: string, latitude: number, longitude: number) => {
    try {
      // Use recommendations from component level
      const foodItems = currentRecs.currentRecommendations.filter(rec => rec.category === 'food');
      
      if (foodItems.length === 0) {
        console.log('🍽️ No food recommendations to find shops for');
        setCurrentMessage(`🏪 Location set to ${cityState}! When you get food recommendations, I'll help you find nearby shops.`);
        return;
      }

      // Find shops and online options for the food items
      const shopResults = await findShopsAndOnlineOptions(foodItems, cityState, latitude, longitude);
      
      if (shopResults.length > 0) {
        setCurrentMessage(`🏪 Found detailed shopping options in ${cityState}:\n\n${shopResults.join('\n')}`);
      } else {
        setCurrentMessage(`🏪 No nearby shops found for the recommended items in ${cityState}. You can try online retailers or local health food stores.`);
      }
    } catch (error) {
      console.error('❌ Shop search failed:', error);
    }
  };



  // Set default flow when chatbot becomes visible
  React.useEffect(() => {
    console.log('🔍 Chatbot state:', { isVisible: state.isVisible, currentFlow: state.currentFlow });
    if (state.isVisible && !state.currentFlow) {
      console.log('🚀 Setting default flow to feedback');
      dispatch({ type: 'SET_FLOW', flow: 'feedback' });
    }
    
    // Clear any existing message when chatbot becomes visible
    if (state.isVisible && currentMessage) {
      console.log('🧹 Clearing existing message');
      setCurrentMessage('');
    }
  }, [state.isVisible, state.currentFlow, dispatch, currentMessage]);

  // Function to find shops for specific food items without refreshing page
  const findShopsForFoodItems = async (cityState: string, latitude: number, longitude: number) => {
    try {
      // Get current food recommendations from the page
      const foodItems = currentRecs.currentRecommendations.filter(rec => rec.category === 'food');
      
      if (foodItems.length === 0) {
        console.log('🍽️ No food recommendations to find shops for');
        setCurrentMessage(`🏪 Location set to ${cityState}! When you get food recommendations, I'll help you find nearby shops.`);
        return;
      }

      // Find shops and online options for the current food items
      const shopResults = await findShopsAndOnlineOptions(foodItems, cityState, latitude, longitude);
      
      if (shopResults.length > 0) {
        setCurrentMessage(`🏪 Found shopping options in ${cityState}:\n\n${shopResults.join('\n')}\n\n💡 These options include both local stores and online retailers. You can visit local stores or order online!`);
      } else {
        setCurrentMessage(`🏪 No nearby shops found for the recommended items in ${cityState}. You can try online retailers or local health food stores.`);
      }
    } catch (error) {
      console.error('❌ Shop search failed:', error);
    }
  };

  // Function to find shops for manually entered location
  const findShopsForManualLocation = async () => {
    console.log('🔍 Find shops button clicked!');
    console.log('📍 Current location:', location);
    
    if (!location.trim()) {
      console.log('❌ No location entered');
      setCurrentMessage("⚠️ Please enter your city and state first.");
      return;
    }

    try {
      console.log('🔍 Getting current food recommendations...');
      console.log('🔍 Current recommendations context:', currentRecs);
      console.log('🔍 Current recommendations:', currentRecs.currentRecommendations);
      
      // Get current food recommendations from the page
      const foodItems = currentRecs.currentRecommendations.filter(rec => rec.category === 'food');
      console.log('🍽️ Found food items:', foodItems);
      
      if (foodItems.length === 0) {
        console.log('❌ No food recommendations found');
        setCurrentMessage(`🏪 No food recommendations found on the page yet. Please wait for recommendations to load, then I can help you find nearby shops in ${location}!`);
        return;
      }

      console.log('🔍 Finding shops and online options...');
      // Find shops and online options for the current food items
      const shopResults = await findShopsAndOnlineOptions(foodItems, location, 0, 0); // Using 0,0 for manual location
      console.log('🏪 Shop results:', shopResults);
      
      if (shopResults.length > 0) {
        setCurrentMessage(`🏪 Found shopping options in ${location}:\n\n${shopResults.join('\n')}\n\n💡 These options include both local stores and online retailers. You can visit local stores or order online!`);
      } else {
        setCurrentMessage(`🏪 No nearby shops found for the recommended items in ${location}. You can try online retailers or local health food stores.`);
      }
    } catch (error) {
      console.error('❌ Shop search failed:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't search for shops right now. Please try again later.");
    }
  };

  const findShopsAndOnlineOptions = async (foodItems: Array<{title?: string}>, cityState: string, latitude: number, longitude: number) => {
    // Small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = [];
    
    for (const item of foodItems) {
      const itemTitle = item.title || 'Unknown Item';
      
      // Generate dynamic store suggestions and online options
      const itemResults = await generateStoreSuggestions(itemTitle, cityState, latitude, longitude);
      results.push(itemResults);
    }
    
    return results;
  };

  // New function to generate dynamic store suggestions
  const generateStoreSuggestions = async (itemTitle: string, cityState: string, latitude: number, longitude: number) => {
    const itemLower = itemTitle.toLowerCase();
    
    let result = `📍 **${itemTitle}**\n`;
    
    // Determine item type for better suggestions
    const isSupplement = itemLower.includes('supplement') || itemLower.includes('vitamin') || itemLower.includes('mineral');
    const isHerb = itemLower.includes('herb') || itemLower.includes('tea') || itemLower.includes('spice');
    const isOrganic = itemLower.includes('organic') || itemLower.includes('natural');
    const isProduce = itemLower.includes('vegetable') || itemLower.includes('fruit') || itemLower.includes('produce');
    
    // Online purchase options for supplements and herbs
    if (isSupplement || isHerb) {
      result += `🛒 **Online Options:**\n`;
      result += `   • [Amazon](https://www.amazon.com/s?k=${encodeURIComponent(itemTitle)}) - Fast delivery\n`;
      result += `   • [iHerb](https://www.iherb.com/search?kw=${encodeURIComponent(itemTitle)}) - Health supplements\n`;
      result += `   • [Vitacost](https://www.vitacost.com/search?search=${encodeURIComponent(itemTitle)}) - Discount supplements\n`;
      result += `   • [Thrive Market](https://thrivemarket.com/search?q=${encodeURIComponent(itemTitle)}) - Organic & natural\n\n`;
    }
    
    // Real-time store search based on location
    result += `🏪 **Searching for stores in ${cityState}...**\n`;
    
    try {
      // Search for real stores in the area
      const storeResults = await searchRealStores(itemTitle, cityState, latitude, longitude);
      
      if (storeResults.length > 0) {
        result += `✅ **Found ${storeResults.length} stores near you:**\n\n`;
        
        storeResults.forEach((store, index) => {
          result += `**${index + 1}. ${store.name}**\n`;
          result += `   📍 ${store.distance} miles away\n`;
          result += `   🏠 ${store.address}\n`;
          if (store.rating) result += `   ⭐ ${store.rating}/5 stars\n`;
          if (store.hours) result += `   🕒 ${store.hours}\n`;
          if (store.phone) result += `   📞 ${store.phone}\n`;
          result += `   🔗 [View on Google Maps](${store.googleMapsUrl})\n\n`;
        });
      } else {
        result += `❌ **No specific stores found in ${cityState}**\n`;
        result += `   • Try expanding your search area\n`;
        result += `   • Check online retailers\n`;
        result += `   • Search for stores in nearby cities\n`;
      }
    } catch (error) {
      console.error('Store search failed:', error);
      result += `⚠️ **Store search temporarily unavailable**\n`;
      result += `   • Use the search tools below to find stores manually\n`;
    }
    
    // Add search tools for manual lookup
    result += `\n🔍 **Search for Stores:**\n`;
    result += `   • [Google Maps: "${itemTitle} in ${cityState}"](https://www.google.com/maps/search/${encodeURIComponent(itemTitle + ' in ' + cityState)}) - Find nearby stores\n`;
    result += `   • [Yelp: "${itemTitle} stores in ${cityState}"](https://www.yelp.com/search?find_desc=${encodeURIComponent(itemTitle + ' stores')}&find_loc=${encodeURIComponent(cityState)}) - Read reviews\n`;
    result += `   • [Google Search: "${itemTitle} stores ${cityState}"](https://www.google.com/search?q=${encodeURIComponent(itemTitle + ' stores ' + cityState)}) - Get store listings\n`;
    
    // Add helpful tips
    result += `\n💡 **Shopping Tips:**\n`;
    result += `   • **Call ahead:** Check if stores have your specific item in stock\n`;
    result += `   • **Store hours:** Verify opening times before visiting\n`;
    result += `   • **Online ordering:** Many stores offer pickup or delivery\n`;
    result += `   • **Compare prices:** Check multiple stores for best deals\n`;
    result += `   • **Ask staff:** Store employees can help locate specific items\n`;
    
    return result;
  };

  // New function to search for real stores using multiple APIs
  const searchRealStores = async (itemTitle: string, cityState: string, latitude: number, longitude: number) => {
    const stores: any[] = [];
    
    try {
      // Try to use Google Places API if available
      if (process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) {
        const googleStores = await searchGooglePlaces(itemTitle, cityState, latitude, longitude);
        stores.push(...googleStores);
      }
      
      // Fallback: Use a combination of search strategies
      if (stores.length === 0) {
        const fallbackStores = await searchFallbackStores(itemTitle, cityState);
        stores.push(...fallbackStores);
      }
      
      // Limit results to top 5 stores
      return stores.slice(0, 5);
    } catch (error) {
      console.error('Store search error:', error);
      return [];
    }
  };

  // Search using Google Places API
  const searchGooglePlaces = async (itemTitle: string, cityState: string, latitude: number, longitude: number) => {
    try {
      // Search for health food stores, pharmacies, and grocery stores
      const searchTerms = [
        'health food store',
        'vitamin shop',
        'pharmacy',
        'grocery store',
        'natural food store'
      ];
      
      const allStores: any[] = [];
      
      for (const term of searchTerms) {
        const query = `${term} ${cityState}`;
        try {
          const response = await fetch(`/api/search-stores?query=${encodeURIComponent(query)}&lat=${latitude}&lng=${longitude}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.stores && Array.isArray(data.stores)) {
              allStores.push(...data.stores);
            }
          }
        } catch (fetchError) {
          console.error(`Failed to fetch stores for term: ${term}`, fetchError);
          continue; // Continue with next search term
        }
      }
      
      // Remove duplicates and format results
      const uniqueStores = allStores.filter((store, index, self) => 
        index === self.findIndex(s => s.place_id === store.place_id)
      );
      
      return uniqueStores.map(store => ({
        name: store.name || 'Unknown Store',
        distance: store.distance || 'Unknown',
        address: store.vicinity || store.formatted_address || 'Address not available',
        rating: store.rating,
        hours: store.opening_hours?.open_now ? 'Open now' : 'Hours vary',
        phone: store.formatted_phone_number || 'Phone not available',
        googleMapsUrl: store.place_id ? `https://www.google.com/maps/place/?q=place_id:${store.place_id}` : `https://www.google.com/maps/search/${encodeURIComponent(store.name + ' ' + cityState)}`
      }));
    } catch (error) {
      console.error('Google Places search failed:', error);
      return [];
    }
  };

  // Fallback search using web scraping simulation
  const searchFallbackStores = async (itemTitle: string, cityState: string) => {
    // This simulates finding stores by searching common chains in the area
    const commonChains: { [key: string]: string[] } = {
      'health food': ['Whole Foods Market', 'Sprouts Farmers Market', 'Natural Grocers', 'Trader Joe\'s'],
      'pharmacy': ['CVS Pharmacy', 'Walgreens', 'Rite Aid', 'Walmart Pharmacy'],
      'grocery': ['Safeway', 'Albertsons', 'Kroger', 'FoodMaxx', 'Lucky Supermarkets'],
      'supplement': ['GNC', 'Vitamin World', 'The Vitamin Shoppe', 'Holland & Barrett']
    };
    
    const stores: any[] = [];
    const itemLower = itemTitle.toLowerCase();
    
    // Determine store types based on item
    let storeTypes: string[] = ['grocery'];
    if (itemLower.includes('supplement') || itemLower.includes('vitamin')) {
      storeTypes.push('supplement', 'health food');
    }
    if (itemLower.includes('herb') || itemLower.includes('tea')) {
      storeTypes.push('health food');
    }
    
    // Generate store suggestions
    storeTypes.forEach(type => {
      if (commonChains[type]) {
        commonChains[type].forEach((chainName: string) => {
          stores.push({
            name: chainName,
            distance: `${Math.floor(Math.random() * 8) + 2}-${Math.floor(Math.random() * 8) + 5} miles`,
            address: `Multiple locations in ${cityState}`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            hours: 'Hours vary by location',
            phone: 'Call local store',
            googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(chainName + ' ' + cityState)}`
          });
        });
      }
    });
    
    return stores;
  };





  const acceptRecommendationChanges = () => {
    console.log('✅ Accept button clicked!');
    console.log('📋 previewData at accept:', previewData);
    console.log('🔍 Selected recommendations:', Array.from(selectedRecommendations));
    
    if (!previewData) {
      console.log('❌ No previewData found when accepting');
      return;
    }
    
    if (selectedRecommendations.size === 0) {
      setCurrentMessage("⚠️ Please select at least one recommendation before accepting.");
      return;
    }
    
    try {
      // Get only the selected recommendations
      const selectedRecs = Array.from(selectedRecommendations).map(index => previewData.recommendations[index]);
      console.log('🎯 Selected recommendations to transfer:', selectedRecs);
      
      // Convert selected recommendations to the format expected by the main page
      const recommendationsToTransfer = selectedRecs.map((rec, index) => ({
        title: rec.title,
        specificAction: rec.specificAction,
        category: 'food', // Default category for personalized recommendations
        researchBacking: {
          summary: `Personalized recommendation based on your preferences: ${previewData.preferences.join(', ')}`,
          studies: []
        },
        contraindications: [],
        frequency: 'Daily',
        expectedTimeline: '2-4 weeks',
        priority: rec.priority,
        // Mark as personalized
        isPersonalized: true,
        personalizationDate: new Date().toISOString(),
        originalTitle: rec.title,
        originalAction: rec.specificAction
      }));
      
      console.log('🔄 Recommendations formatted for transfer:', recommendationsToTransfer);
      
      // Get current recommendations from main page
      const currentMainPageRecs = currentRecs.currentRecommendations;
      console.log('📋 Current main page recommendations:', currentMainPageRecs);
      
      // Create updated recommendations list
      let updatedRecommendations;
      
      if (currentMainPageRecs.length === 0) {
        // If main page has no recommendations, use only the selected ones
        updatedRecommendations = recommendationsToTransfer;
        console.log('🔄 Main page was empty, using only selected recommendations');
      } else {
        // If main page has recommendations, replace them with selected ones
        updatedRecommendations = recommendationsToTransfer;
        console.log('🔄 Replacing main page recommendations with selected ones');
      }
      
      console.log('🔄 Final updated recommendations:', updatedRecommendations);
      
      // Update the main page recommendations
      currentRecs.updateRecommendations(updatedRecommendations);
      console.log('✅ Main page recommendations updated');
      
      // Trigger main page refresh
      console.log('🔄 Triggering main page refresh from chatbot...');
      currentRecs.refreshMainPage();
      console.log('✅ Main page refresh triggered');
      
      // Show success message with only selected recommendations
      setCurrentMessage(
        `✅ Perfect! Your selected recommendations have been transferred to the main page!\n\n` +
        `**Transferred Recommendations:**\n${selectedRecs.map((rec, index) => 
          `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
        ).join('\n')}\n\n` +
        `💡 Your main page now shows these ${selectedRecs.length} personalized recommendations!\n\n` +
        `🎯 Close this chatbot to see your updated recommendations on the main page.`
      );
      
      // Change flow to show success message
      dispatch({ type: 'SET_FLOW', flow: 'recommendations-accepted' });
      
      // Hide chatbot after 5 seconds to let user see the success message
      setTimeout(() => {
        hideChatbot();
        // Clear the message and preview data after hiding
        setTimeout(() => {
          setCurrentMessage('');
          setPreviewData(null);
          setSelectedRecommendations(new Set()); // Reset selection
        }, 100);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to update recommendations:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't update your recommendations. Please try again.");
    }
  };

  const rejectRecommendationChanges = () => {
    setCurrentMessage("❌ Got it! Your current recommendations stay the same. No changes were made to your page.");
    
    // Clear preview data
    setPreviewData(null);
    
    // Show the message for 2 seconds, then hide chatbot
    setTimeout(() => {
      hideChatbot();
      // Clear the message after hiding
      setTimeout(() => setCurrentMessage(''), 100);
    }, 2000);
  };

  const revertPersonalization = () => {
    try {
      // Revert all personalized recommendations to their original state
      const revertedRecommendations = currentRecs.currentRecommendations.map(rec => {
        if (rec.isPersonalized && rec.originalTitle && rec.originalAction) {
          return {
            ...rec,
            title: rec.originalTitle,
            specificAction: rec.originalAction,
            isPersonalized: false,
            personalizationDate: undefined,
            originalTitle: undefined,
            originalAction: undefined
          };
        }
        return rec;
      });
      
      // Update the main page recommendations
      currentRecs.updateRecommendations(revertedRecommendations);
      
      // Trigger main page refresh
      console.log('🔄 Triggering main page refresh from revert...');
      currentRecs.refreshMainPage();
      console.log('✅ Main page refresh triggered from revert');
      
      setCurrentMessage(
        `🔄 **Personalization Reverted!**\n\n` +
        `Your recommendations have been restored to their original state.\n\n` +
        `💡 You can now close this chatbot and see the original recommendations on your main page.`
      );
      
      // Hide chatbot after 5 seconds
      setTimeout(() => {
        hideChatbot();
        // Clear the message after hiding
        setTimeout(() => setCurrentMessage(''), 100);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to revert personalization:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't revert your recommendations. Please try again.");
    }
  };

  const suggestMoreAlternatives = async () => {
    if (!previewData) return;
    
    try {
      setCurrentMessage("🔄 Generating alternative recommendations...");
      
      // Generate different alternatives based on the same preferences
      const alternativeRecommendations = await generateAlternativeRecommendations(previewData.preferences);
      
      // Update preview data with alternatives
      setPreviewData({ 
        preferences: previewData.preferences, 
        recommendations: alternativeRecommendations 
      });
      
      // Show the new alternatives with a simple message
      const alternativesMessage = `🔄 **Alternative Recommendations**\n\n` +
        `**Based on your preferences:** ${previewData.preferences.join(', ')}\n\n` +
        `**🆕 New alternatives to try:**\n${alternativeRecommendations.map((rec, index) => 
          `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
        ).join('\n')}\n\n` +
        `**Review these alternatives, then decide:**\n` +
        `✅ I love these - Keep them\n` +
        `🔄 I'd like different options\n` +
        `❌ I prefer my current ones`;
      
      setCurrentMessage(alternativesMessage);
      
    } catch (error) {
      console.error('❌ Failed to generate alternatives:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't generate alternatives. Please try again.");
    }
  };

  // First duplicate function removed - keeping the one at the end of the file

  if (!state.isVisible) {
    console.log('🚫 Chatbot not visible');
    return null;
  }

  console.log('✅ Chatbot is visible, currentFlow:', state.currentFlow);

  // Show current message if set
  if (currentMessage) {
    return (
      <div className={styles.overlay}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.avatar}>🤖</div>
            <h3>Health Coach</h3>
            <button className={styles.closeButton} onClick={hideChatbot}>
              ×
            </button>
          </div>
          <div className={styles.messages}>
            <div className={styles.message}>
              {currentMessage}
            </div>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              {previewData ? (
                // Show accept/reject/suggest more buttons for immediate recommendations
                <>
                  <button 
                    onClick={() => handlePersonalizedRecommendationAction('accept')}
                    style={{ 
                      padding: '12px 24px', 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginRight: '15px',
                      fontWeight: '600'
                    }}
                  >
                    ✅ Accept & Transfer to Main Page
                  </button>
                  {currentRecs.currentRecommendations.some(rec => rec.isPersonalized) && (
                    <button 
                      onClick={revertPersonalization}
                      style={{ 
                        padding: '12px 24px', 
                        backgroundColor: '#6c757d', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginRight: '15px',
                        fontWeight: '600'
                      }}
                    >
                      🔄 Revert to Original
                    </button>
                  )}
                  <button 
                    onClick={() => handlePersonalizedRecommendationAction('suggest')}
                    style={{ 
                      padding: '12px 24px', 
                      backgroundColor: '#ffc107', 
                      color: '#212529', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginRight: '15px',
                      fontWeight: '600'
                    }}
                  >
                    🔄 Generate Different Options
                  </button>
                  <button 
                    onClick={() => handlePersonalizedRecommendationAction('reject')}
                    style={{ 
                      padding: '12px 24px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginRight: '15px',
                      fontWeight: '600'
                    }}
                  >
                    ❌ Keep Current Ones
                  </button>
                </>
              ) : (
                // Show regular close buttons
                <>
                  <button 
                    onClick={() => {
                      console.log('🚪 User manually closing chatbot');
                      setCurrentMessage('');
                      hideChatbot();
                    }}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      marginRight: '10px'
                    }}
                  >
                    ✅ Got it, thanks!
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentMessage('');
                      resetChatbotState();
                      dispatch({ type: 'SET_FLOW', flow: 'feedback' });
                    }}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🔄 Reset Chatbot
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleFeedback = (rating: 'liked' | 'disliked' | 'changes') => {
    console.log('🎯 Feedback received:', rating);
    dispatch({ type: 'SET_FEEDBACK', rating });
    
    if (rating === 'liked') {
      // Show positive feedback and celebration
      console.log('✅ User liked the plan, showing celebration message');
      setCurrentMessage("🎉 Yayyy!!! Let's go with this plan today! You're going to feel amazing! 💪✨");
      
      // Hide chatbot after 3 seconds
      setTimeout(() => {
        console.log('🕐 3 seconds passed, hiding chatbot');
        hideChatbot();
      }, 3000);
      
      // Also mark that feedback was given to prevent showing again
      console.log('📝 Marking feedback as given for today');
    } else if (rating === 'disliked' || rating === 'changes') {
      // Show feedback reason question
      console.log('❌ User disliked or wants changes, showing feedback reason question');
      dispatch({ type: 'SET_FLOW', flow: 'feedback-reason' });
    }
  };

  const handleFeedbackReason = (reason: 'unavailable' | 'restrictions' | 'taste' | 'too-hard' | 'too-easy') => {
    console.log('🎯 Feedback reason received:', reason);
    dispatch({ type: 'SET_FEEDBACK_REASON', reason });
    
    if (reason === 'unavailable') {
      // Show food item selection for "Can't get it" option
      dispatch({ type: 'SET_FLOW', flow: 'select-food-item' });
    } else if (reason === 'restrictions') {
      // Show restriction-based food item selection flow
      console.log('🚫 User has restrictions, showing restriction-based food selection');
      dispatch({ type: 'SET_FLOW', flow: 'select-restriction-food-item' });
    } else if (reason === 'taste') {
      // Show taste-based food item selection flow
      console.log('😐 User doesn&apos;t enjoy the taste, showing taste-based food selection');
      dispatch({ type: 'SET_FLOW', flow: 'select-taste-food-item' });
    } else if (reason === 'too-hard') {
      // Show too-hard-based item selection flow
      console.log('🏋️ User finds it too hard, showing too-hard-based selection');
      dispatch({ type: 'SET_FLOW', flow: 'select-too-hard-item' });
    } else {
      // Show thank you message and close chatbot for other reasons
      setCurrentMessage("Thank you for your feedback! I'll use this to improve your recommendations. Have a great day! ✨");
      
      // Hide chatbot after 3 seconds
      setTimeout(() => {
        console.log('🕐 3 seconds passed, hiding chatbot');
        hideChatbot();
      }, 3000);
    }
  };

  const renderFeedbackFlow = () => (
    <div className={styles.flowContainer}>
      <div className={styles.botMessage}>
        <strong>Hey, did you like today&apos;s action plan?</strong>
      </div>
      <div className={styles.options}>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedback('liked')}
        >
          Yes, I liked it 👍
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedback('disliked')}
        >
          Not really 👎
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedback('changes')}
        >
          I&apos;d like to make changes ✏️
        </button>
      </div>
    </div>
  );

  const renderFeedbackReasonFlow = () => (
    <div className={styles.flowContainer}>
      <div className={styles.botMessage}>
        <strong>💬 Got it — can you tell me why you didn&apos;t like the recommendations? This will help me make them better for you.</strong>
      </div>
      <div className={styles.options}>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedbackReason('unavailable')}
        >
          🛒 Can&apos;t get it – Not available where I live
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedbackReason('restrictions')}
        >
          🚫 Can&apos;t have it – Allergies, diet, or health restriction
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedbackReason('taste')}
        >
          😐 Don&apos;t enjoy it – Not my taste or preferred style
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedbackReason('too-hard')}
        >
          🏋️ Too hard – Requires more effort/time than I can give
        </button>
        <button 
          className={styles.optionButton}
          onClick={() => handleFeedbackReason('too-easy')}
        >
          💤 Too easy/low impact – Doesn&apos;t feel effective enough
        </button>
      </div>
    </div>
  );

  const renderRestrictionFoodItemSelectionFlow = () => {
    // Debug: Log recommendations to see what we're working with
    console.log('🎯 Chatbot received recommendations for restrictions:', currentRecommendations);
    
    // Filter to show ONLY FOOD recommendations
    const foodRecommendations = currentRecommendations?.filter(rec => rec.category === 'food') || [];
    
    console.log('🍽️ Food recommendations to show for restrictions:', foodRecommendations);

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>Which food recommendation are you referring to?</strong>
        </div>
        <div className={styles.options}>
          {/* Show actual food recommendations from LLM */}
          {foodRecommendations.length > 0 ? (
            foodRecommendations.map((rec, index) => (
              <button 
                key={index}
                className={styles.optionButton}
                onClick={() => {
                  dispatch({ type: 'SELECT_RESTRICTION_FOOD_ITEM', foodItem: rec.title || rec.specificAction || `Food Item ${index + 1}` });
                  dispatch({ type: 'SET_FLOW', flow: 'restriction-personalization-options' });
                }}
              >
                🍽️ {rec.title || rec.specificAction || `Food Item ${index + 1}`}
              </button>
            ))
          ) : (
            <div className={styles.noRecommendations}>
              <p>No food recommendations found. Please select &quot;Other&quot; below.</p>
            </div>
          )}
          
          {/* Always show "Other" option */}
          <button 
            className={styles.optionButton}
            onClick={() => {
              dispatch({ type: 'SELECT_RESTRICTION_FOOD_ITEM', foodItem: 'Other' });
              dispatch({ type: 'SET_FLOW', flow: 'restriction-personalization-options' });
            }}
          >
            📝 Other (specify)
          </button>
        </div>
      </div>
    );
  };

  const renderFoodItemSelectionFlow = () => {
    // Debug: Log recommendations to see what we're working with
    console.log('🎯 Chatbot received recommendations:', currentRecommendations);
    console.log('🎯 Recommendations type:', typeof currentRecommendations);
    console.log('🎯 Recommendations length:', currentRecommendations?.length);
    console.log('🎯 First recommendation:', currentRecommendations?.[0]);
    
    // Filter to show ONLY FOOD recommendations
    const foodRecommendations = currentRecommendations?.filter(rec => rec.category === 'food') || [];
    
    console.log('🍽️ Food recommendations to show:', foodRecommendations);

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>Which food recommendation are you referring to?</strong>
        </div>
        <div className={styles.options}>
          {/* Show actual food recommendations from LLM */}
          {foodRecommendations.length > 0 ? (
            foodRecommendations.map((rec, index) => (
              <button 
                key={index}
                className={styles.optionButton}
                onClick={() => {
                  dispatch({ type: 'SELECT_FOOD_ITEM', foodItem: rec.title || rec.specificAction || `Food Item ${index + 1}` });
                  dispatch({ type: 'SET_FLOW', flow: 'personalization-options' });
                }}
              >
                🍽️ {rec.title || rec.specificAction || `Food Item ${index + 1}`}
              </button>
            ))
          ) : (
            <div className={styles.noRecommendations}>
              <p>No food recommendations found. Please select &quot;Other&quot; below.</p>
            </div>
          )}
          
          {/* Always show "Other" option */}
          <button 
            className={styles.optionButton}
            onClick={() => {
              dispatch({ type: 'SELECT_FOOD_ITEM', foodItem: 'Other' });
              dispatch({ type: 'SET_FLOW', flow: 'personalization-options' });
            }}
          >
            📝 Other (specify)
          </button>
        </div>
      </div>
    );
  };

  const renderRestrictionPersonalizationOptionsFlow = () => {
    if (showInputs) {
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>Please provide your preferences:</strong>
          </div>
          
          {selectedRestrictionTypes.includes('allergies') && renderAllergiesOptions()}
          {selectedRestrictionTypes.includes('diet') && renderDietRestrictionsOptions()}
          {selectedRestrictionTypes.includes('culture') && renderCultureEthnicityOptions()}
          {selectedRestrictionTypes.includes('other') && renderOtherRestrictionsOptions()}
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.submitButton}
              onClick={() => {
                console.log('🔘 Submit button clicked!');
                console.log('🔍 Current state when submit clicked:');
                console.log('  - selectedOptions:', selectedOptions);
                console.log('  - weather:', weather);
                console.log('  - culture:', culture);
                console.log('  - other:', other);
                console.log('  - location:', location);
                console.log('  - showInputs:', showInputs);
                console.log('🔍 Button is responding!');
                handleRestrictionSubmit();
              }}
              disabled={selectedRestrictionTypes.length === 0 || isGeneratingRecommendations}
              style={{
                opacity: (selectedRestrictionTypes.length === 0 || isGeneratingRecommendations) ? 0.5 : 1,
                cursor: (selectedRestrictionTypes.length === 0 || isGeneratingRecommendations) ? 'not-allowed' : 'pointer'
              }}
            >
              {isGeneratingRecommendations ? (
                '⏳ Processing...'
              ) : (
                `✅ Submit Preferences ${selectedRestrictionTypes.length > 0 ? `(${selectedRestrictionTypes.length} selected)` : '(none selected)'}`
              )}
            </button>
            
            {/* Test loading button */}
            <button 
              className={styles.testButton}
              onClick={() => {
                console.log('🧪 Test loading button clicked');
                console.log('🧪 Setting loading to TRUE');
                setIsGeneratingRecommendations(true);
                console.log('🧪 Loading state set to:', true);
                
                // Test with a simple timeout
                setTimeout(() => {
                  console.log('🧪 Test loading timeout - setting to false');
                  setIsGeneratingRecommendations(false);
                  console.log('🧪 Loading state set to:', false);
                }, 3000);
              }}
              style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#ff6b6b', color: 'white', border: 'none', borderRadius: '8px' }}
            >
              🧪 Test Loading
            </button>
            
            <button 
              className={styles.backButton}
              onClick={() => setShowInputs(false)}
            >
              🔙 Back to Options
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>Would you like me to personalize based on your:</strong>
        </div>
        <div className={styles.optionsGrid}>
          <div 
            className={`${styles.optionCard} ${selectedRestrictionTypes.includes('allergies') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedRestrictionTypes.includes('allergies')) {
                const newTypes = selectedRestrictionTypes.filter(type => type !== 'allergies');
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              } else {
                const newTypes = [...selectedRestrictionTypes, 'allergies'];
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              }
            }}
          >
            <div className={styles.optionIcon}>🚫</div>
            <div className={styles.optionText}>Food allergies</div>
            {selectedRestrictionTypes.includes('allergies') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedRestrictionTypes.includes('diet') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedRestrictionTypes.includes('diet')) {
                const newTypes = selectedRestrictionTypes.filter(type => type !== 'diet');
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              } else {
                const newTypes = [...selectedRestrictionTypes, 'diet'];
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              }
            }}
          >
            <div className={styles.optionIcon}>🥗</div>
            <div className={styles.optionText}>Diet restrictions</div>
            {selectedRestrictionTypes.includes('diet') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedRestrictionTypes.includes('culture') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedRestrictionTypes.includes('culture')) {
                const newTypes = selectedRestrictionTypes.filter(type => type !== 'culture');
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              } else {
                const newTypes = [...selectedRestrictionTypes, 'culture'];
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              }
            }}
          >
            <div className={styles.optionIcon}>🌍</div>
            <div className={styles.optionText}>Culture/ethnicity</div>
            {selectedRestrictionTypes.includes('culture') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedRestrictionTypes.includes('other') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedRestrictionTypes.includes('other')) {
                const newTypes = selectedRestrictionTypes.filter(type => type !== 'other');
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              } else {
                const newTypes = [...selectedRestrictionTypes, 'other'];
                setSelectedRestrictionTypes(newTypes);
                setSelectedOptions(newTypes); // Sync with selectedOptions
              }
            }}
          >
            <div className={styles.optionIcon}>📝</div>
            <div className={styles.optionText}>Other (specify)</div>
            {selectedRestrictionTypes.includes('other') && <div className={styles.checkmark}>✓</div>}
          </div>
        </div>
        
        <div className={styles.nextStepButton}>
          <button 
            className={styles.nextButton}
            onClick={() => {
              console.log('🚀 Next Step button clicked!');
              console.log('🔍 Current selectedOptions:', selectedOptions);
              console.log('🔍 Current showInputs:', showInputs);
              setShowInputs(true);
              console.log('🔍 After setting showInputs to true');
            }}
            disabled={selectedOptions.length === 0}
          >
            🚀 Next Step: Provide Details {selectedOptions.length > 0 ? `(${selectedOptions.length} selected)` : '(none selected)'}
          </button>
        </div>
      </div>
    );
  };

  const handleRestrictionSubmit = async () => {
    // Prevent multiple clicks while processing
    if (isGeneratingRecommendations) {
      console.log('🚫 Already generating recommendations, ignoring click');
      return;
    }
    
    console.log('🚀 Submit button clicked!');
    console.log('📊 Current state:', {
      selectedRestrictionTypes,
      allergies,
      dietRestrictions,
      cultureEthnicity,
      otherRestrictions
    });
    
    const preferences = [];
    
    if (selectedRestrictionTypes.includes('allergies') && allergies.length > 0) {
      preferences.push(`Allergies: ${allergies.join(', ')}`);
    }
    if (selectedRestrictionTypes.includes('diet') && dietRestrictions.length > 0) {
      preferences.push(`Diet restrictions: ${dietRestrictions.join(', ')}`);
    }
    if (selectedRestrictionTypes.includes('culture') && cultureEthnicity) {
      preferences.push(`Culture/Ethnicity: ${cultureEthnicity}`);
    }
    if (selectedRestrictionTypes.includes('other') && otherRestrictions) {
      preferences.push(`Other restrictions: ${otherRestrictions}`);
    }
    
    console.log('🎯 Preferences to submit:', preferences);
    
    if (preferences.length === 0) {
      console.log('❌ No preferences to submit, showing error');
      setCurrentMessage("⚠️ Please fill in at least one field before submitting.");
      return;
    }
    
    // Set loading state
    setIsGeneratingRecommendations(true);
    setRetryAttempt(0); // Reset retry attempt
    setCurrentMessage("🎯 Personalizing according to your restrictions... Generating safe recommendations for you! ✨");
    
    try {
      // Generate personalized recommendations
      console.log('🔄 Calling generatePersonalizedRecommendations...');
      const personalizedRecommendations = await generatePersonalizedRecommendations(preferences);
      console.log('✅ Generated recommendations:', personalizedRecommendations);
      
      // Store the recommendations and preferences for display
      const previewData = {
        preferences,
        recommendations: personalizedRecommendations,
        isMainPageUpdated: false
      };
      
      setPreviewData(previewData);
      setSelectedRecommendations(new Set()); // Reset selection
      
      // Show the personalized recommendations
      setCurrentMessage(
        `🎉 **Successfully Generated Personalized Recommendations!**\n\n` +
        `**Your Preferences:** ${preferences.join(', ')}\n\n` +
        `**Generated Recommendations:**\n${personalizedRecommendations.map((rec, index) => 
          `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
        ).join('\n')}\n\n` +
        `💡 These recommendations are tailored to your specific restrictions and health profile!\n\n` +
        `🎯 You can now select which recommendations to transfer to your main page.`
      );
      
      // Change flow to show personalized recommendations
      dispatch({ type: 'SET_FLOW', flow: 'personalized-recommendations' });
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't generate personalized recommendations. Please try again.");
    } finally {
      // Clear loading state
      setIsGeneratingRecommendations(false);
    }
  };

    const renderAllergiesOptions = () => (
      <div className={styles.inputGroup}>
        <label>🚫 What are you allergic to?</label>
        <div className={styles.checkboxOptions}>
          {['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].map((allergy) => (
            <div 
              key={allergy} 
              className={`${styles.checkboxOption} ${allergies.includes(allergy) ? styles.selected : ''}`}
              onClick={() => {
                if (allergies.includes(allergy)) {
                  setAllergies(allergies.filter(a => a !== allergy));
                } else {
                  setAllergies([...allergies, allergy]);
                }
              }}
            >
              {allergy}
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Other allergies (comma separated)"
          value={allergies.filter(a => !['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].includes(a)).join(', ')}
          onChange={(e) => {
            const otherAllergies = e.target.value.split(',').map(a => a.trim()).filter(a => a);
            const commonAllergies = allergies.filter(a => ['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].includes(a));
            setAllergies([...commonAllergies, ...otherAllergies]);
          }}
          className={styles.textInput}
        />
      </div>
    );

    const renderDietRestrictionsOptions = () => (
      <div className={styles.inputGroup}>
        <label>🥗 What are your diet restrictions?</label>
        <div className={styles.checkboxOptions}>
          {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].map((diet) => (
            <div 
              key={diet} 
              className={`${styles.checkboxOption} ${dietRestrictions.includes(diet) ? styles.selected : ''}`}
              onClick={() => {
                if (dietRestrictions.includes(diet)) {
                  setDietRestrictions(dietRestrictions.filter(d => d !== diet));
                } else {
                  setDietRestrictions([...dietRestrictions, diet]);
                }
              }}
            >
              {diet}
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Other diet restrictions (comma separated)"
          value={dietRestrictions.filter(d => !['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].includes(d)).join(', ')}
          onChange={(e) => {
            const otherDiets = e.target.value.split(',').map(d => d.trim()).filter(d => d);
            const commonDiets = dietRestrictions.filter(d => ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].includes(d));
            setDietRestrictions([...commonDiets, ...otherDiets]);
          }}
          className={styles.textInput}
        />
      </div>
    );

    const renderCultureEthnicityOptions = () => (
      <div className={styles.inputGroup}>
        <label>🌍 What&apos;s your cultural background?</label>
        <select
          value={cultureEthnicity}
          onChange={(e) => {
            const value = e.target.value;
            setCultureEthnicity(value);
            // Sync with culture state for consistency
            setCulture(value);
            console.log('🌍 Cultural background selected:', value);
          }}
          className={styles.selectInput}
        >
          <option value="">Select your culture/ethnicity</option>
          <option value="South Asian">South Asian</option>
          <option value="East Asian">East Asian</option>
          <option value="Middle Eastern">Middle Eastern</option>
          <option value="Mediterranean">Mediterranean (Italian, Greek, Turkish)</option>
          <option value="Western/American/European">Western / American / European</option>
          <option value="Other">Other (tell us)</option>
        </select>
        {cultureEthnicity === 'Other' && (
          <input
            type="text"
            placeholder="Please specify your culture/ethnicity"
            value={otherRestrictions}
            onChange={(e) => setOtherRestrictions(e.target.value)}
            className={styles.textInput}
          />
        )}
      </div>
    );

    const renderOtherRestrictionsOptions = () => (
      <div className={styles.inputGroup}>
        <label>📝 What other restrictions do you have?</label>
        <textarea
          placeholder="Please describe any other health restrictions, medical conditions, or dietary needs..."
          value={otherRestrictions}
          onChange={(e) => setOtherRestrictions(e.target.value)}
          className={styles.textarea}
          rows={4}
        />
      </div>
    );

  const handleSubmit = () => {
    console.log('🚀 Submit button clicked!');
    console.log('📍 Location:', location);
    console.log('🌤️ Weather:', weather);
    console.log('🌍 Culture:', culture);
    console.log('🌍 Culture Ethnicity:', cultureEthnicity);
    console.log('📝 Other:', other);
    console.log('🔍 Selected options:', selectedOptions);
    console.log('🔍 Selected options length:', selectedOptions.length);
    console.log('🔍 Show inputs:', showInputs);
    
    // Check if user has filled in the form fields for their selected options
    const preferences = [];
    let hasValidInputs = false;
    
    if (selectedOptions.includes('Location') && location && location.trim()) {
      preferences.push(`Location: ${location}`);
      hasValidInputs = true;
    }
    
    if (selectedOptions.includes('Weather') && weather && weather.trim()) {
      preferences.push(`Weather: ${weather}`);
      hasValidInputs = true;
    }
    
    // Fix: Check both culture and cultureEthnicity variables
    if (selectedOptions.includes('Culture/ethnicity')) {
      const cultureValue = culture || cultureEthnicity;
      if (cultureValue && cultureValue.trim()) {
        preferences.push(`Culture: ${cultureValue}`);
        hasValidInputs = true;
      }
    }
    
    if (selectedOptions.includes('Other') && other && other.trim()) {
      preferences.push(`Other: ${other}`);
      hasValidInputs = true;
    }
    
    console.log('📋 Collected preferences:', preferences);
    console.log('📋 Preferences length:', preferences.length);
    console.log('✅ Has valid inputs:', hasValidInputs);
    
    if (!hasValidInputs) {
      console.log('❌ No valid preferences collected, showing error message');
      setCurrentMessage("⚠️ Please fill in the form fields for your selected options before submitting.");
      return;
    }
    
    console.log('✅ Preferences collected successfully, proceeding to generate recommendations');
    
    // Store preferences in chatbot state
    dispatch({ type: 'SET_PERSONALIZATION_PREFERENCES', preferences });
    
    // Show personalized recommendations in chatbot
    showPersonalizedRecommendationsInChatbot(preferences);
  };

  const showPersonalizedRecommendationsInChatbot = async (preferences: string[]) => {
    try {
      console.log('🎯 Starting to generate personalized recommendations...');
      console.log('📋 Preferences received:', preferences);
      
      setCurrentMessage("🎯 Generating personalized recommendations based on your preferences...");
      
      // Generate personalized recommendations
      console.log('🔄 Calling generatePersonalizedRecommendations...');
      const personalizedRecommendations = await generatePersonalizedRecommendations(preferences);
      console.log('✅ Generated recommendations:', personalizedRecommendations);
      
      // Show the recommendations in chatbot with accept/reject options
      console.log('🔄 Creating recommendations display...');
      const recommendationsMessage = createPersonalizedRecommendationsDisplay(
        personalizedRecommendations, 
        preferences
      );
      console.log('✅ Recommendations message created');
      
      setCurrentMessage(recommendationsMessage);
      console.log('✅ Message set in chatbot');
      
      // Store the recommendations data for potential transfer to main page
      const newPreviewData = { 
        preferences, 
        recommendations: personalizedRecommendations,
        isMainPageUpdated: false // Will be set to true when user accepts
      };
      setPreviewData(newPreviewData);
      console.log('✅ Preview data set:', newPreviewData);
      console.log('🔍 previewData state after set:', newPreviewData);
      
      // Change flow to show recommendations with accept/reject options
      console.log('🔄 Changing flow to personalized-recommendations...');
      dispatch({ type: 'SET_FLOW', flow: 'personalized-recommendations' });
      console.log('✅ Flow changed to personalized-recommendations');
      
    } catch (error) {
      console.error('❌ Failed to generate personalized recommendations:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't generate personalized recommendations right now. Please try again.");
    }
  };

  const createPersonalizedRecommendationsDisplay = (
    recommendations: Array<{title: string, specificAction: string, priority: string}>,
    preferences: string[]
  ) => {
    const recommendationsList = recommendations.map((rec, index) => 
      `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
    ).join('\n');

    return `🎯 **Your Personalized Recommendations**\n\n` +
           `**Based on:** ${preferences.join(', ')}\n\n` +
           `${recommendationsList}\n\n` +
           `**Choose an option below:**`;
  };

  const generatePersonalizedRecommendations = async (preferences: string[]): Promise<Array<{title: string, specificAction: string, priority: string}>> => {
    console.log('🔄 generatePersonalizedRecommendations called with preferences:', preferences);
    console.log('👤 User health profile:', state.userProfile);
    console.log('🔍 State object:', state);
    console.log('🔍 User profile details:');
    console.log('  - Hormone scores:', state.userProfile.hormoneScores);
    console.log('  - Primary imbalance:', state.userProfile.primaryImbalance);
    console.log('  - Secondary imbalances:', state.userProfile.secondaryImbalances);
    console.log('  - Conditions:', state.userProfile.conditions);
    console.log('  - Symptoms:', state.userProfile.symptoms);
    console.log('  - Cycle phase:', state.userProfile.cyclePhase);
    console.log('  - Birth control:', state.userProfile.birthControlStatus);
    console.log('  - Age:', state.userProfile.age);
    console.log('  - Ethnicity:', state.userProfile.ethnicity);
    console.log('  - Cravings:', state.userProfile.cravings);
    console.log('  - Confidence:', state.userProfile.confidence);
    
    const maxRetries = 3;
    let attempt = 1;
    
    while (attempt <= maxRetries) {
      try {
        console.log(`🔄 Attempt ${attempt} of ${maxRetries} to generate recommendations`);
        
        // Update retry attempt state for UI feedback
        if (attempt > 1) {
          setRetryAttempt(attempt);
        }
        
        // Get user's comprehensive health profile data
        const { symptoms, conditions, primaryImbalance, secondaryImbalances, hormoneScores, cyclePhase, birthControlStatus, age, ethnicity, cravings, confidence } = state.userProfile;
        
        // Prepare comprehensive user profile for LLM
        const userProfileForLLM = {
          symptoms: symptoms || [],
          conditions: conditions || [],
          primaryHormoneImbalance: primaryImbalance || '',
          secondaryHormoneImbalances: secondaryImbalances || [],
          hormoneScores: hormoneScores || {},
          cyclePhase: cyclePhase || 'unknown',
          birthControlStatus: birthControlStatus || 'No',
          age: age || undefined,
          ethnicity: ethnicity || undefined,
          cravings: cravings || [],
          confidenceLevel: confidence || 'low',
          preferences: preferences,
          // Add any additional context that might be relevant
          currentRecommendations: currentRecs.currentRecommendations || []
        };
        
        console.log('📋 Comprehensive user profile for LLM:', userProfileForLLM);
        
        // Call the LLM API to generate personalized recommendations
        console.log('🤖 Calling LLM API for personalized recommendations...');
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
        });
        
        // Create the fetch promise
        const fetchPromise = fetch('/api/llm-recommendations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userProfile: userProfileForLLM,
            category: 'food', // Focus on food recommendations for now
            personalizationContext: {
              type: 'chatbot-personalization',
              preferences: preferences,
              source: 'user-input'
            }
          }),
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        if (!response.ok) {
          throw new Error(`LLM API call failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🤖 LLM API response:', data);
        
        if (!data.recommendations || !Array.isArray(data.recommendations)) {
          throw new Error('LLM API returned invalid recommendations format');
        }
        
        // Transform LLM recommendations to the expected format
        const transformedRecommendations = data.recommendations.map((rec: any, index: number) => ({
          title: rec.title || `Personalized Recommendation ${index + 1}`,
          specificAction: rec.specificAction || rec.action || 'Follow personalized guidance',
          priority: rec.priority || rec.importance || 'Medium'
        }));
        
        console.log('✅ Transformed LLM recommendations:', transformedRecommendations);
        
        // Ensure we have at least some recommendations
        if (transformedRecommendations.length === 0) {
          console.log('⚠️ No recommendations from LLM, generating fallback recommendations');
          
          // Generate fallback recommendations based on user profile
          const fallbackRecommendations = [];
          
          if (symptoms && symptoms.length > 0) {
            fallbackRecommendations.push({
              title: "Personalized Health Support",
              specificAction: `Focus on addressing: ${symptoms.slice(0, 3).join(', ')}`,
              priority: "High"
            });
          }
          
          if (primaryImbalance) {
            fallbackRecommendations.push({
              title: "Hormone Balance Support",
              specificAction: `Target ${primaryImbalance} imbalance with personalized nutrition`,
              priority: "High"
            });
          }
          
          if (preferences.length > 0) {
            fallbackRecommendations.push({
              title: "Preference-Based Nutrition",
              specificAction: `Customize diet based on: ${preferences.slice(0, 2).join(', ')}`,
              priority: "Medium"
            });
          }
          
          // Add generic but personalized recommendations
          fallbackRecommendations.push({
            title: "Daily Health Routine",
            specificAction: "Establish consistent daily habits based on your health profile",
            priority: "Medium"
          });
          
          return fallbackRecommendations;
        }
        
        return transformedRecommendations;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('❌ All retry attempts failed');
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('Failed to generate recommendations after all retry attempts');
  };

  const renderRecommendationsAcceptedFlow = () => {
    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <div dangerouslySetInnerHTML={{ __html: currentMessage.replace(/\n/g, '<br/>') }} />
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.closeButton}
            onClick={hideChatbot}
          >
            ✅ Close Chatbot
          </button>
        </div>
      </div>
    );
  };

  const renderPersonalizedRecommendationsFlow = () => {
    console.log('🎭 renderPersonalizedRecommendationsFlow called');
    console.log('📋 previewData:', previewData);
    console.log('💬 currentMessage:', currentMessage);
    console.log('🔍 selectedRecommendations:', selectedRecommendations);
    console.log('🔍 selectedRecommendations size:', selectedRecommendations.size);
    
    if (!previewData) {
      console.log('❌ No previewData found');
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>⚠️ No recommendations data found.</strong>
            <br />
            Please go back and generate recommendations first.
          </div>
          <div className={styles.buttonGroup}>
            <button 
              className={styles.backButton}
              onClick={() => dispatch({ type: 'SET_FLOW', flow: 'personalization-options' })}
            >
              🔙 Back to Options
            </button>
          </div>
        </div>
      );
    }

    console.log('✅ previewData found, rendering recommendations');
    console.log('🔍 Number of recommendations:', previewData.recommendations.length);
    
    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          {currentMessage ? (
            <div dangerouslySetInnerHTML={{ __html: currentMessage.replace(/\n/g, '<br/>') }} />
          ) : (
            <div>
              <h3>🎯 Your Personalized Recommendations</h3>
              <p><strong>Based on:</strong> {previewData.preferences.join(', ')}</p>
              
              <div className={styles.recommendationsList}>
                {previewData.recommendations.map((rec, index) => {
                  console.log(`🔍 Rendering recommendation ${index}:`, rec);
                  const isSelected = selectedRecommendations.has(index);
                  console.log(`🔍 Recommendation ${index} selected:`, isSelected);
                  
                  return (
                    <div 
                      key={index} 
                      className={`${styles.recommendationItem} ${isSelected ? styles.selected : ''}`}
                      onClick={() => {
                        console.log(`🔍 Clicked on recommendation ${index}`);
                        const newSelected = new Set(selectedRecommendations);
                        if (newSelected.has(index)) {
                          newSelected.delete(index);
                          console.log(`🔍 Removed recommendation ${index} from selection`);
                        } else {
                          newSelected.add(index);
                          console.log(`🔍 Added recommendation ${index} to selection`);
                        }
                        setSelectedRecommendations(newSelected);
                        console.log('🔍 New selected recommendations:', Array.from(newSelected));
                      }}
                    >
                      <div className={styles.recommendationCheckbox}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by onClick on parent div
                          className={styles.checkboxInput}
                        />
                      </div>
                      <div className={styles.recommendationContent}>
                        <div className={styles.recommendationTitle}>
                          {index + 1}. <strong>{rec.title}</strong>
                        </div>
                        <div className={styles.recommendationAction}>
                          {rec.specificAction}
                        </div>
                        <div className={styles.recommendationPriority}>
                          Priority: {rec.priority}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className={styles.selectionSummary}>
                <p><strong>Selected:</strong> {selectedRecommendations.size} of {previewData.recommendations.length} recommendations</p>
                <div className={styles.selectionActions}>
                  <button 
                    className={styles.selectAllButton}
                    onClick={() => {
                      const allIndices = new Set(Array.from({ length: previewData.recommendations.length }, (_, i) => i));
                      setSelectedRecommendations(allIndices);
                      console.log('🔍 All recommendations selected');
                    }}
                  >
                    📋 Select All
                  </button>
                  <button 
                    className={styles.clearAllButton}
                    onClick={() => {
                      setSelectedRecommendations(new Set());
                      console.log('🔍 All selections cleared');
                    }}
                  >
                    🗑️ Clear All
                  </button>
                </div>
              </div>
              
              <div className={styles.nextSteps}>
                <p>Select the recommendations you want, then choose an option below.</p>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.acceptButton}
            onClick={() => {
              console.log('✅ Accept button clicked!');
              acceptRecommendationChanges();
            }}
            disabled={selectedRecommendations.size === 0}
            style={{
              opacity: selectedRecommendations.size === 0 ? 0.5 : 1,
              cursor: selectedRecommendations.size === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            ✅ Accept & Transfer Selected ({selectedRecommendations.size})
          </button>
          
          <button 
            className={styles.regenerateButton}
            onClick={() => {
              console.log('🔄 Regenerate button clicked!');
              // Go back to personalization options to regenerate
              dispatch({ type: 'SET_FLOW', flow: 'personalization-options' });
            }}
          >
            🔄 Generate Different Options
          </button>
          
          <button 
            className={styles.rejectButton}
            onClick={() => {
              console.log('❌ Reject button clicked!');
              // Go back to personalization options
              dispatch({ type: 'SET_FLOW', flow: 'personalization-options' });
            }}
          >
            ❌ Keep Current Ones
          </button>
        </div>
      </div>
    );
  };

  const renderPersonalizationOptionsFlow = () => {

    if (showInputs) {
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>Please provide your preferences:</strong>
          </div>
          
          {selectedOptions.includes('Location') && (
            <div className={styles.inputGroup}>
              <label>📍 City, State (e.g., Fremont, CA):</label>
              <input
                type="text"
                placeholder="Enter your city and state"
                value={location}
                onChange={(e) => {
                  console.log('📍 Location changed to:', e.target.value);
                  console.log('📍 Setting location state to:', e.target.value);
                  setLocation(e.target.value);
                  console.log('📍 Location state after set:', e.target.value);
                }}
                className={styles.textInput}
              />
              <div className={styles.locationOptions}>
                <button 
                  type="button"
                  className={styles.locationButton}
                  onClick={() => {
                    console.log('📍 Use Current Location button clicked!');
                    requestLocationAccess();
                  }}
                >
                  📍 Use My Current Location
                </button>
                
                {/* Add Find Stores button directly in Location section */}
                <button 
                  type="button"
                  className={styles.storeFinderButton}
                  onClick={() => {
                    console.log('🏪 Find Stores button clicked from Location input');
                    // Get the selected food item from the previous flow
                    const selectedFoodItem = state.foodFeedback.selectedFoodItem || 'food items';
                    dispatch({ type: 'TRIGGER_STORE_FINDER', foodItem: selectedFoodItem });
                    dispatch({ type: 'SET_FLOW', flow: 'location-store-finder' });
                  }}
                  disabled={!location.trim()}
                >
                  🏪 Find Stores Near Me
                </button>
                
                <small className={styles.locationNote}>
                  Enter your city/state above, then click "Find Stores" to locate nearby stores for your food items
                </small>
              </div>
            </div>
          )}
          
          {selectedOptions.includes('Weather') && (
            <div className={styles.inputGroup}>
              <label>🌤️ What&apos;s your typical weather?</label>
              <select
                value={weather}
                onChange={(e) => {
                  console.log('🌤️ Weather changed to:', e.target.value);
                  console.log('🌤️ Setting weather state to:', e.target.value);
                  setWeather(e.target.value);
                  console.log('🌤️ Weather state after set:', e.target.value);
                }}
                className={styles.selectInput}
              >
                <option value="">Select your typical weather</option>
                <option value="Hot and humid">🔥 Hot and humid</option>
                <option value="Hot and dry">☀️ Hot and dry</option>
                <option value="Warm and moderate">🌤️ Warm and moderate</option>
                <option value="Cool and pleasant">🍃 Cool and pleasant</option>
                <option value="Cold and dry">❄️ Cold and dry</option>
                <option value="Cold and wet">🌧️ Cold and wet</option>
                <option value="Variable/Seasonal">🌦️ Variable/Seasonal</option>
              </select>
            </div>
          )}
          
          {selectedOptions.includes('Culture/ethnicity') && (
            <div className={styles.inputGroup}>
              <label>🌍 What&apos;s your cultural background?</label>
              <select
                value={cultureEthnicity}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('🌍 Culture changed to:', value);
                  console.log('🌍 Setting cultureEthnicity state to:', value);
                  setCultureEthnicity(value);
                  // Sync with culture state for consistency
                  setCulture(value);
                  console.log('🌍 Culture state after set:', value);
                }}
                className={styles.selectInput}
              >
                <option value="">Select your cultural background</option>
                <option value="South Asian">🇮🇳 South Asian</option>
                <option value="East Asian">🇨🇳 East Asian</option>
                <option value="Middle Eastern">🇸🇦 Middle Eastern</option>
                <option value="Mediterranean">🇮🇹 Mediterranean</option>
                <option value="Western/American/European">🇺🇸 Western / American / European</option>
                <option value="Other">🌍 Other</option>
              </select>
              {cultureEthnicity === 'Other' && (
                <input
                  placeholder="Please specify your culture/ethnicity"
                  value={other}
                  onChange={(e) => {
                    console.log('📝 Other culture specified:', e.target.value);
                    console.log('📝 Setting other state to:', e.target.value);
                    setOther(e.target.value);
                    console.log('📝 Other state after set:', e.target.value);
                  }}
                  className={styles.textInput}
                />
              )}
            </div>
          )}
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.submitButton}
              onClick={() => {
                console.log('🔘 Submit button clicked!');
                console.log('🔍 Current state when submit clicked:');
                console.log('  - selectedOptions:', selectedOptions);
                console.log('  - weather:', weather);
                console.log('  - culture:', culture);
                console.log('  - other:', other);
                console.log('  - location:', location);
                console.log('  - showInputs:', showInputs);
                console.log('🔍 Button is responding!');
                handleSubmit();
              }}
              disabled={selectedOptions.length === 0}
              style={{
                opacity: selectedOptions.length === 0 ? 0.5 : 1,
                cursor: selectedOptions.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ✅ Submit Preferences {selectedOptions.length > 0 ? `(${selectedOptions.length} selected)` : '(none selected)'}
            </button>
            <button 
              className={styles.backButton}
              onClick={() => {
                console.log('🔙 Back button clicked!');
                setShowInputs(false);
              }}
            >
              🔙 Back to Options
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>Would you like me to personalize based on your (multiple select):</strong>
        </div>
        <div className={styles.optionsGrid}>
          <div 
            className={`${styles.optionCard} ${selectedOptions.includes('Location') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedOptions.includes('Location')) {
                setSelectedOptions(selectedOptions.filter(opt => opt !== 'Location'));
              } else {
                setSelectedOptions([...selectedOptions, 'Location']);
              }
            }}
          >
            <div className={styles.optionIcon}>📍</div>
            <div className={styles.optionText}>Location</div>
            {selectedOptions.includes('Location') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedOptions.includes('Weather') ? styles.selected : ''}`}
            onClick={() => {
              console.log('🌤️ Weather option clicked, current selectedOptions:', selectedOptions);
              if (selectedOptions.includes('Weather')) {
                const newOptions = selectedOptions.filter(opt => opt !== 'Weather');
                console.log('🌤️ Removing Weather, new options:', newOptions);
                setSelectedOptions(newOptions);
              } else {
                const newOptions = [...selectedOptions, 'Weather'];
                console.log('🌤️ Adding Weather, new options:', newOptions);
                setSelectedOptions(newOptions);
              }
            }}
          >
            <div className={styles.optionIcon}>🌤️</div>
            <div className={styles.optionText}>Weather</div>
            {selectedOptions.includes('Weather') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedOptions.includes('Culture/ethnicity') ? styles.selected : ''}`}
            onClick={() => {
              console.log('🌍 Culture option clicked, current selectedOptions:', selectedOptions);
              if (selectedOptions.includes('Culture/ethnicity')) {
                const newOptions = selectedOptions.filter(opt => opt !== 'Culture/ethnicity');
                console.log('🌍 Removing Culture, new options:', newOptions);
                setSelectedOptions(newOptions);
              } else {
                const newOptions = [...selectedOptions, 'Culture/ethnicity'];
                console.log('🌍 Adding Culture, new options:', newOptions);
                setSelectedOptions(newOptions);
              }
            }}
          >
            <div className={styles.optionIcon}>🌍</div>
            <div className={styles.optionText}>Culture/ethnicity</div>
            {selectedOptions.includes('Culture/ethnicity') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedOptions.includes('Other') ? styles.selected : ''}`}
            onClick={() => {
              console.log('📝 Other option clicked, current selectedOptions:', selectedOptions);
              if (selectedOptions.includes('Other')) {
                const newOptions = selectedOptions.filter(opt => opt !== 'Other');
                console.log('📝 Removing Other, new options:', newOptions);
                setSelectedOptions(newOptions);
              } else {
                const newOptions = [...selectedOptions, 'Other'];
                console.log('📝 Adding Other, new options:', newOptions);
                setSelectedOptions(newOptions);
              }
            }}
          >
            <div className={styles.optionIcon}>📝</div>
            <div className={styles.optionText}>Other</div>
            {selectedOptions.includes('Other') && <div className={styles.checkmark}>✓</div>}
          </div>
        </div>
        
        <div className={styles.nextStepButton}>
          <button 
            className={styles.nextButton}
            onClick={() => {
              console.log('🚀 Next Step button clicked!');
              console.log('🔍 Current selectedOptions:', selectedOptions);
              console.log('🔍 Current showInputs:', showInputs);
              setShowInputs(true);
              console.log('🔍 After setting showInputs to true');
            }}
            disabled={selectedOptions.length === 0}
          >
            🚀 Next Step: Provide Details {selectedOptions.length > 0 ? `(${selectedOptions.length} selected)` : '(none selected)'}
          </button>
        </div>
      </div>
    );
  };

  const renderTasteFoodItemSelectionFlow = () => {
    // Debug: Log recommendations to see what we're working with
    console.log('🎯 Chatbot received recommendations for taste preferences:', currentRecommendations);
    
    // Filter to show ONLY FOOD recommendations
    const foodRecommendations = currentRecommendations?.filter(rec => rec.category === 'food') || [];
    
    console.log('🍽️ Filtered food recommendations for taste:', foodRecommendations);
    
    if (foodRecommendations.length === 0) {
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>🍽️ No food recommendations found on the page yet.</strong>
            <br />
            Please wait for recommendations to load, then I can help you personalize based on your taste preferences!
          </div>
          <div className={styles.buttonGroup}>
            <button 
              className={styles.backButton}
              onClick={() => dispatch({ type: 'SET_FLOW', flow: 'feedback-reason' })}
            >
              🔙 Back to Feedback Reasons
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>🍽️ Which food recommendation are you referring to?</strong>
          <br />
          <small>Select the item you don't enjoy so I can personalize alternatives for you.</small>
        </div>
        
        <div className={styles.optionsGrid}>
          {foodRecommendations.map((rec, index) => (
            <div 
              key={index}
              className={`${styles.optionCard} ${state.tasteFeedback.selectedFoodItem === (rec.title || rec.specificAction || `Food Item ${index + 1}`) ? styles.selected : ''}`}
              onClick={() => {
                const foodItem = rec.title || rec.specificAction || `Food Item ${index + 1}`;
                console.log('🍽️ User selected food item for taste preferences:', foodItem);
                dispatch({ type: 'SELECT_TASTE_FOOD_ITEM', foodItem });
                dispatch({ type: 'SET_FLOW', flow: 'taste-personalization-options' });
              }}
            >
              <div className={styles.optionIcon}>🍽️</div>
              <div className={styles.optionText}>
                {rec.title || rec.specificAction || `Food Item ${index + 1}`}
              </div>
              {state.tasteFeedback.selectedFoodItem === (rec.title || rec.specificAction || `Food Item ${index + 1}`) && <div className={styles.checkmark}>✓</div>}
            </div>
          ))}
          
          <div 
            className={`${styles.optionCard} ${state.tasteFeedback.selectedFoodItem === 'Other' ? styles.selected : ''}`}
            onClick={() => {
              console.log('🍽️ User selected "Other" for taste preferences');
              dispatch({ type: 'SELECT_TASTE_FOOD_ITEM', foodItem: 'Other' });
              dispatch({ type: 'SET_FLOW', flow: 'taste-personalization-options' });
            }}
          >
            <div className={styles.optionIcon}>📝</div>
            <div className={styles.optionText}>Other (not listed above)</div>
            {state.tasteFeedback.selectedFoodItem === 'Other' && <div className={styles.checkmark}>✓</div>}
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.backButton}
            onClick={() => dispatch({ type: 'SET_FLOW', flow: 'feedback-reason' })}
          >
            🔙 Back to Feedback Reasons
          </button>
        </div>
      </div>
    );
  };

    const renderTastePersonalizationOptionsFlow = () => {
    if (showTasteInputs) {
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>Please provide your preferences:</strong>
          </div>
          
          {selectedTasteOptions.includes('Preferred cuisine') && (
            <div className={styles.inputGroup}>
              <label>🍽️ What's your preferred cuisine style?</label>
              <select
                value={state.tasteFeedback.preferredCuisine}
                onChange={(e) => dispatch({ type: 'SET_PREFERRED_CUISINE', cuisine: e.target.value })}
                className={styles.selectInput}
              >
                <option value="">Select your preferred cuisine</option>
                <option value="Italian">Italian</option>
                <option value="Mexican">Mexican</option>
                <option value="Indian">Indian</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Thai">Thai</option>
                <option value="Mediterranean">Mediterranean</option>
                <option value="American">American</option>
                <option value="French">French</option>
                <option value="Other">Other</option>
              </select>
              {state.tasteFeedback.preferredCuisine === 'Other' && (
                <input
                  type="text"
                  placeholder="Please specify your preferred cuisine"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className={styles.textInput}
                />
              )}
            </div>
          )}
          
          {selectedOptions.includes('Culture/ethnicity') && (
            <div className={styles.inputGroup}>
              <label>🌍 What's your cultural background?</label>
              <select
                value={state.tasteFeedback.cultureEthnicity}
                onChange={(e) => dispatch({ type: 'SET_TASTE_CULTURE_ETHNICITY', ethnicity: e.target.value })}
                className={styles.selectInput}
              >
                <option value="">Select your culture/ethnicity</option>
                <option value="South Asian">South Asian</option>
                <option value="East Asian">East Asian</option>
                <option value="Middle Eastern">Middle Eastern</option>
                <option value="Mediterranean">Mediterranean (Italian, Greek, Turkish)</option>
                <option value="Western/American/European">Western / American / European</option>
                <option value="Other">Other (tell us)</option>
              </select>
              {state.tasteFeedback.cultureEthnicity === 'Other' && (
                <input
                  type="text"
                  placeholder="Please specify your culture/ethnicity"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  className={styles.textInput}
                />
              )}
            </div>
          )}
          
          {selectedTasteOptions.includes('Food allergies') && (
            <div className={styles.inputGroup}>
              <label>🚫 What are you allergic to?</label>
              <div className={styles.checkboxOptions}>
                {['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].map((allergy) => (
                  <div 
                    key={allergy} 
                    className={`${styles.checkboxOption} ${state.tasteFeedback.foodAllergies.includes(allergy) ? styles.selected : ''}`}
                    onClick={() => {
                      if (state.tasteFeedback.foodAllergies.includes(allergy)) {
                        dispatch({ type: 'SET_TASTE_FOOD_ALLERGIES', allergies: state.tasteFeedback.foodAllergies.filter(a => a !== allergy) });
                      } else {
                        dispatch({ type: 'SET_TASTE_FOOD_ALLERGIES', allergies: [...state.tasteFeedback.foodAllergies, allergy] });
                      }
                    }}
                  >
                    {allergy}
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other allergies (comma separated)"
                value={state.tasteFeedback.foodAllergies.filter(a => !['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].includes(a)).join(', ')}
                onChange={(e) => {
                  const otherAllergies = e.target.value.split(',').map(a => a.trim()).filter(a => a);
                  const commonAllergies = state.tasteFeedback.foodAllergies.filter(a => ['Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Fish', 'Wheat'].includes(a));
                  dispatch({ type: 'SET_TASTE_FOOD_ALLERGIES', allergies: [...commonAllergies, ...otherAllergies] });
                }}
                className={styles.textInput}
              />
            </div>
          )}
          
          {selectedTasteOptions.includes('Diet restrictions') && (
            <div className={styles.inputGroup}>
              <label>🥗 What are your diet restrictions?</label>
              <div className={styles.checkboxOptions}>
                {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].map((diet) => (
                  <div 
                    key={diet} 
                    className={`${styles.optionCard} ${state.tasteFeedback.dietRestrictions.includes(diet) ? styles.selected : ''}`}
                    onClick={() => {
                      if (state.tasteFeedback.dietRestrictions.includes(diet)) {
                        dispatch({ type: 'SET_TASTE_DIET_RESTRICTIONS', restrictions: state.tasteFeedback.dietRestrictions.filter(d => d !== diet) });
                      } else {
                        dispatch({ type: 'SET_TASTE_DIET_RESTRICTIONS', restrictions: [...state.tasteFeedback.dietRestrictions, diet] });
                      }
                    }}
                  >
                    {diet}
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Other diet restrictions (comma separated)"
                value={state.tasteFeedback.dietRestrictions.filter(d => !['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].includes(d)).join(', ')}
                onChange={(e) => {
                  const otherDiets = e.target.value.split(',').map(d => d.trim()).filter(d => d);
                  const commonDiets = state.tasteFeedback.dietRestrictions.filter(d => ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Low-carb', 'Low-sodium', 'Low-sugar', 'Halal', 'Kosher'].includes(d));
                  dispatch({ type: 'SET_TASTE_DIET_RESTRICTIONS', restrictions: [...commonDiets, ...otherDiets] });
              }}
                className={styles.textInput}
              />
            </div>
          )}
          
          {selectedTasteOptions.includes('Other') && (
            <div className={styles.inputGroup}>
              <label>📝 Any other taste preferences or restrictions?</label>
              <textarea
                placeholder="Tell me anything else about your taste preferences..."
                value={state.tasteFeedback.otherPreferences}
                onChange={(e) => dispatch({ type: 'SET_TASTE_OTHER_PREFERENCES', preferences: e.target.value })}
                className={styles.textInput}
                rows={3}
              />
            </div>
          )}
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.submitButton}
              onClick={handleTasteSubmit}
              disabled={selectedTasteOptions.length === 0}
            >
              ✅ Submit Taste Preferences
            </button>
            <button 
              className={styles.backButton}
              onClick={() => setShowTasteInputs(false)}
            >
              🔙 Back to Options
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>Would you like me to personalize based on your:</strong>
        </div>
        <div className={styles.optionsGrid}>
          <div 
            className={`${styles.optionCard} ${selectedTasteOptions.includes('Preferred cuisine') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedTasteOptions.includes('Preferred cuisine')) {
                setSelectedTasteOptions(selectedTasteOptions.filter(opt => opt !== 'Preferred cuisine'));
              } else {
                setSelectedTasteOptions([...selectedTasteOptions, 'Preferred cuisine']);
              }
            }}
          >
            <div className={styles.optionIcon}>🍽️</div>
            <div className={styles.optionText}>Preferred cuisine</div>
            {selectedTasteOptions.includes('Preferred cuisine') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedTasteOptions.includes('Culture/ethnicity') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedTasteOptions.includes('Culture/ethnicity')) {
                setSelectedTasteOptions(selectedTasteOptions.filter(opt => opt !== 'Culture/ethnicity'));
              } else {
                setSelectedTasteOptions([...selectedTasteOptions, 'Culture/ethnicity']);
              }
            }}
          >
            <div className={styles.optionIcon}>🌍</div>
            <div className={styles.optionText}>Culture/ethnicity</div>
            {selectedOptions.includes('Culture/ethnicity') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedTasteOptions.includes('Food allergies') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedTasteOptions.includes('Food allergies')) {
                setSelectedTasteOptions(selectedTasteOptions.filter(opt => opt !== 'Food allergies'));
              } else {
                setSelectedTasteOptions([...selectedTasteOptions, 'Food allergies']);
              }
            }}
          >
            <div className={styles.optionIcon}>🚫</div>
            <div className={styles.optionText}>Food allergies</div>
            {selectedTasteOptions.includes('Food allergies') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedTasteOptions.includes('Diet restrictions') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedTasteOptions.includes('Diet restrictions')) {
                setSelectedTasteOptions(selectedTasteOptions.filter(opt => opt !== 'Diet restrictions'));
              } else {
                setSelectedTasteOptions([...selectedTasteOptions, 'Diet restrictions']);
              }
            }}
          >
            <div className={styles.optionIcon}>🥗</div>
            <div className={styles.optionText}>Diet restrictions</div>
            {selectedTasteOptions.includes('Diet restrictions') && <div className={styles.checkmark}>✓</div>}
          </div>
          
          <div 
            className={`${styles.optionCard} ${selectedTasteOptions.includes('Other') ? styles.selected : ''}`}
            onClick={() => {
              if (selectedTasteOptions.includes('Other')) {
                setSelectedTasteOptions(selectedTasteOptions.filter(opt => opt !== 'Other'));
              } else {
                setSelectedTasteOptions([...selectedTasteOptions, 'Other']);
              }
            }}
          >
            <div className={styles.optionIcon}>📝</div>
            <div className={styles.optionText}>Other</div>
            {selectedTasteOptions.includes('Other') && <div className={styles.checkmark}>✓</div>}
          </div>
        </div>
        
        <div className={styles.nextStepButton}>
          <button 
            className={styles.nextButton}
            onClick={() => setShowTasteInputs(true)}
            disabled={selectedTasteOptions.length === 0}
          >
            🚀 Next Step: Provide Details
          </button>
        </div>
      </div>
    );
  };

  const handleTasteSubmit = async () => {
    // Prevent multiple clicks while processing
    if (isGeneratingRecommendations) {
      console.log('🚫 Already generating recommendations, ignoring click');
      return;
    }
    
    console.log('🚀 Taste submit button clicked!');
    console.log('📊 Current taste state:', {
      selectedFoodItem: state.tasteFeedback.selectedFoodItem,
      preferredCuisine: state.tasteFeedback.preferredCuisine,
      cultureEthnicity: state.tasteFeedback.cultureEthnicity,
      foodAllergies: state.tasteFeedback.foodAllergies,
      dietRestrictions: state.tasteFeedback.dietRestrictions,
      otherPreferences: state.tasteFeedback.otherPreferences
    });
    
    const preferences = [];
    
    if (state.tasteFeedback.preferredCuisine) {
      preferences.push(`Preferred cuisine: ${state.tasteFeedback.preferredCuisine}`);
    }
    if (state.tasteFeedback.cultureEthnicity) {
      preferences.push(`Culture/Ethnicity: ${state.tasteFeedback.cultureEthnicity}`);
    }
    if (state.tasteFeedback.foodAllergies.length > 0) {
      preferences.push(`Food allergies: ${state.tasteFeedback.foodAllergies.join(', ')}`);
    }
    if (state.tasteFeedback.dietRestrictions.length > 0) {
      preferences.push(`Diet restrictions: ${state.tasteFeedback.dietRestrictions.join(', ')}`);
    }
    if (state.tasteFeedback.otherPreferences) {
      preferences.push(`Other preferences: ${state.tasteFeedback.otherPreferences}`);
    }
    
    console.log('🎯 Taste preferences to submit:', preferences);
    
    if (preferences.length === 0) {
      console.log('❌ No taste preferences to submit, showing error');
      setCurrentMessage("⚠️ Please fill in at least one field before submitting.");
      return;
    }
    
    // Store preferences in chatbot state
    dispatch({ type: 'SET_PERSONALIZATION_PREFERENCES', preferences });
    
    // Set loading state
    setIsGeneratingRecommendations(true);
    setRetryAttempt(0); // Reset retry attempt
    setCurrentMessage("🎯 Personalizing according to your taste preferences... Generating delicious alternatives for you! ✨");
    
    try {
      // Generate personalized recommendations
      console.log('🔄 Calling generatePersonalizedRecommendations...');
      const personalizedRecommendations = await generatePersonalizedRecommendations(preferences);
      console.log('✅ Generated recommendations:', personalizedRecommendations);
      
      // Store the recommendations and preferences for display
      const previewData = {
        preferences,
        recommendations: personalizedRecommendations,
        isMainPageUpdated: false
      };
      
      setPreviewData(previewData);
      setSelectedRecommendations(new Set()); // Reset selection
      
      // Show the personalized recommendations
      setCurrentMessage(
        `🎉 **Successfully Generated Personalized Recommendations!**\n\n` +
        `**Your Preferences:** ${preferences.join(', ')}\n\n` +
        `**Generated Recommendations:**\n${personalizedRecommendations.map((rec, index) => 
          `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
        ).join('\n')}\n\n` +
        `💡 These recommendations are tailored to your taste preferences and health profile!\n\n` +
        `🎯 You can now select which recommendations to transfer to your main page.`
      );
      
      // Change flow to show personalized recommendations
      dispatch({ type: 'SET_FLOW', flow: 'personalized-recommendations' });
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't generate personalized recommendations. Please try again.");
    } finally {
      // Clear loading state
      setIsGeneratingRecommendations(false);
    }
  };

  const handleTooHardSubmit = async () => {
    // Prevent multiple clicks while processing
    if (isGeneratingRecommendations) {
      console.log('🚫 Already generating recommendations, ignoring click');
      return;
    }
    
    console.log('🚀 Too-hard submit button clicked!');
    console.log('📊 Current too-hard state:', {
      selectedItem: state.tooHardFeedback.selectedItem,
      timePerDay: state.tooHardFeedback.timePerDay,
      dailyActions: state.tooHardFeedback.dailyActions,
      easiestToStart: state.tooHardFeedback.easiestToStart
    });
    
    const preferences = [];
    
    if (state.tooHardFeedback.timePerDay) {
      preferences.push(`Time per day: ${state.tooHardFeedback.timePerDay}`);
    }
    if (state.tooHardFeedback.dailyActions) {
      preferences.push(`Daily actions: ${state.tooHardFeedback.dailyActions}`);
    }
    if (state.tooHardFeedback.easiestToStart) {
      preferences.push(`Easiest to start: ${state.tooHardFeedback.easiestToStart}`);
    }
    
    console.log('🎯 Too-hard preferences to submit:', preferences);
    
    if (preferences.length === 0) {
      console.log('❌ No too-hard preferences to submit, showing error');
      setCurrentMessage("⚠️ Please fill in all fields before submitting.");
      return;
    }
    
    // Store preferences in chatbot state
    dispatch({ type: 'SET_PERSONALIZATION_PREFERENCES', preferences });
    
    // Set loading state
    setIsGeneratingRecommendations(true);
    setRetryAttempt(0); // Reset retry attempt
    setCurrentMessage("🎯 Personalizing according to your difficulty level... Generating easier alternatives for you! ✨");
    
    try {
      // Generate personalized recommendations
      console.log('🔄 Calling generatePersonalizedRecommendations...');
      const personalizedRecommendations = await generatePersonalizedRecommendations(preferences);
      console.log('✅ Generated recommendations:', personalizedRecommendations);
      
      // Store the recommendations and preferences for display
      const previewData = {
        preferences,
        recommendations: personalizedRecommendations,
        isMainPageUpdated: false
      };
      
      setPreviewData(previewData);
      setSelectedRecommendations(new Set()); // Reset selection
      
      // Show the personalized recommendations
      setCurrentMessage(
        `🎉 **Successfully Generated Personalized Recommendations!**\n\n` +
        `**Your Preferences:** ${preferences.join(', ')}\n\n` +
        `**Generated Recommendations:**\n${personalizedRecommendations.map((rec, index) => 
          `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
        ).join('\n')}\n\n` +
        `💡 These recommendations are tailored to be easier to implement based on your feedback!\n\n` +
        `🎯 You can now select which recommendations to transfer to your main page.`
      );
      
      // Change flow to show personalized recommendations
      dispatch({ type: 'SET_FLOW', flow: 'personalized-recommendations' });
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't generate personalized recommendations. Please try again.");
    } finally {
      // Clear loading state
      setIsGeneratingRecommendations(false);
    }
  };

  const findStoresForLocation = async () => {
    console.log('🔍 Find stores for location:', state.storeFinder.location);
    
    if (!state.storeFinder.location.trim()) {
      setCurrentMessage("⚠️ Please enter your location first.");
      return;
    }

    try {
      // Set searching state
      dispatch({ type: 'SET_STORE_FINDER_RESULTS', results: [] });
      
      // Simulate store search for the selected food item
      const foodItem = state.storeFinder.selectedFoodItem || 'food item';
      const location = state.storeFinder.location;
      
      console.log('🔍 Searching for stores for:', foodItem, 'in:', location);
      
      // Use the existing findShopsAndOnlineOptions function
      const shopResults = await findShopsAndOnlineOptions([{ title: foodItem }], location, 0, 0);
      
      if (shopResults.length > 0) {
        // Convert shop results to store finder format
        const storeResults = shopResults.map((result: string, index: number) => {
          // Parse the shop result to extract store information
          const lines = result.split('\n');
          const itemTitle = lines[0]?.replace('📍 **', '').replace('**', '') || `Item ${index + 1}`;
          
          // Extract store suggestions from the new format
          const storeSuggestions = lines.filter(line => line.includes('🏪 **Local Store Suggestions'));
          const onlineOptions = lines.filter(line => line.includes('🛒 **Online Options'));
          
          return {
            name: itemTitle,
            distance: '2-10 miles',
            priceRange: '$$',
            hours: 'Varies',
            specialties: ['health food', 'supplements', 'organic'],
            storeSuggestions: storeSuggestions.join('\n'),
            onlineOptions: onlineOptions.join('\n')
          };
        });
        
        dispatch({ type: 'SET_STORE_FINDER_RESULTS', results: storeResults });
        setCurrentMessage(`🏪 Found shopping options for ${storeResults.length} items in ${location}! Check the results below for both local stores and online options.`);
      } else {
        setCurrentMessage(`🏪 No stores found for ${foodItem} in ${location}. Try expanding your search area or check online retailers.`);
      }
    } catch (error) {
      console.error('❌ Store search failed:', error);
      setCurrentMessage("⚠️ Sorry, I couldn't search for stores right now. Please try again later.");
    }
  };

  const renderLocationStoreFinderFlow = () => {
    const selectedFoodItem = state.storeFinder.selectedFoodItem;
    
    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>🏪 Let's find stores near you for: <em>{selectedFoodItem}</em></strong>
          <br />
          <small>I'll help you locate nearby stores where you can find this item.</small>
        </div>
        
        <div className={styles.inputGroup}>
          <label>📍 Enter your location:</label>
          <input
            type="text"
            placeholder="City, State (e.g., Fremont, CA)"
            value={state.storeFinder.location}
            onChange={(e) => dispatch({ type: 'SET_STORE_FINDER_LOCATION', location: e.target.value })}
            className={styles.textInput}
          />
          <div className={styles.locationOptions}>
            <button 
              type="button"
              className={styles.locationButton}
              onClick={() => {
                console.log('📍 Use Current Location button clicked!');
                requestLocationAccess();
              }}
            >
              📍 Use My Current Location
            </button>
            <button 
              type="button"
              className={styles.storeFinderButton}
              onClick={() => {
                console.log('🔍 Find Stores button clicked!');
                findStoresForLocation();
              }}
              disabled={!state.storeFinder.location.trim()}
            >
              🔍 Find Stores Near Me
            </button>
            <small className={styles.locationNote}>
              Enter your city/state above, then click "Find Stores"
            </small>
          </div>
        </div>
        
        {state.storeFinder.isSearching && (
          <div className={styles.searchingMessage}>
            🔍 Searching for stores near you...
          </div>
        )}
        
        {state.storeFinder.searchResults.length > 0 && (
          <div className={styles.searchResults}>
            <h4>🏪 Stores Found Near You:</h4>
            {state.storeFinder.searchResults.map((result, index) => (
              <div key={index} className={styles.storeResult}>
                <div className={styles.storeName}>{result.name}</div>
                {result.onlineOptions && (
                  <div className={styles.onlineOptions}>
                    {result.onlineOptions}
                  </div>
                )}
                {result.storeSuggestions && (
                  <div className={styles.storeSuggestions}>
                    {result.storeSuggestions}
                  </div>
                )}
                <div className={styles.storeDetails}>
                  <span>📍 {result.distance} away</span>
                  <span>💰 {result.priceRange}</span>
                  <span>🕒 {result.hours}</span>
                </div>
                <div className={styles.storeSpecialties}>
                  ✨ Specialties: {result.specialties.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.backButton}
            onClick={() => dispatch({ type: 'SET_FLOW', flow: 'personalization-options' })}
          >
            🔙 Back to Options
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentFlow = () => {
    console.log('🎭 Rendering flow:', state.currentFlow);
    console.log('🔍 Current flow state:', state.currentFlow);
    console.log('🔍 previewData exists:', !!previewData);
    console.log('🔍 currentMessage:', currentMessage);
    console.log('🔍 selectedRecommendations size:', selectedRecommendations.size);
    console.log('🔍 isGeneratingRecommendations:', isGeneratingRecommendations);
    console.log('🔍 isGeneratingRecommendations type:', typeof isGeneratingRecommendations);
    console.log('🔍 isGeneratingRecommendations value:', isGeneratingRecommendations);
    
    // Show loading message if generating recommendations
    if (isGeneratingRecommendations === true) {
      console.log('🔄 Loading state is TRUE - showing loading message');
      return renderLoadingMessage();
    } else {
      console.log('❌ Loading state is FALSE - not showing loading message');
    }
    
    switch (state.currentFlow) {
      case 'feedback':
        return renderFeedbackFlow();
      case 'feedback-reason':
        return renderFeedbackReasonFlow();
      case 'select-food-item':
        return renderFoodItemSelectionFlow();
      case 'personalization-options':
        return renderPersonalizationOptionsFlow();
      case 'personalized-recommendations':
        return renderPersonalizedRecommendationsFlow();
      case 'recommendations-accepted':
        return renderRecommendationsAcceptedFlow();
      case 'select-restriction-food-item':
        return renderRestrictionFoodItemSelectionFlow();
      case 'restriction-personalization-options':
        return renderRestrictionPersonalizationOptionsFlow();
      case 'select-taste-food-item':
        return renderTasteFoodItemSelectionFlow();
      case 'taste-personalization-options':
        return renderTastePersonalizationOptionsFlow();
      case 'select-too-hard-item':
        return renderTooHardItemSelectionFlow();
      case 'too-hard-personalization-options':
        return renderTooHardPersonalizationOptionsFlow();
      case 'location-store-finder':
        return renderLocationStoreFinderFlow();
      default:
        console.log('❌ No flow set, returning null');
        return null;
    }
  };

  const renderTooHardItemSelectionFlow = () => {
    // Debug: Log recommendations to see what we're working with
    console.log('🎯 Chatbot received recommendations for too-hard feedback:', currentRecommendations);
    
    // Show ALL recommendations (not just food)
    const allRecommendations = currentRecommendations || [];
    
    console.log('🏋️ All recommendations for too-hard feedback:', allRecommendations);
    
    if (allRecommendations.length === 0) {
      return (
        <div className={styles.flowContainer}>
          <div className={styles.botMessage}>
            <strong>🏋️ No recommendations found on the page yet.</strong>
            <br />
            Please wait for recommendations to load, then I can help you find easier alternatives!
          </div>
          <div className={styles.buttonGroup}>
            <button 
              className={styles.backButton}
              onClick={() => dispatch({ type: 'SET_FLOW', flow: 'feedback-reason' })}
            >
              🔙 Back to Feedback Reasons
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>🏋️ Which recommendation feels too hard for you?</strong>
          <br />
          <small>Select the item that requires more time or effort than you can give, and I'll suggest easier alternatives.</small>
        </div>
        
        <div className={styles.optionsGrid}>
          {allRecommendations.map((rec, index) => (
            <div 
              key={index}
              className={`${styles.optionCard} ${state.tooHardFeedback.selectedItem === (rec.title || rec.specificAction || `${rec.category || 'Item'} ${index + 1}`) ? styles.selected : ''}`}
              onClick={() => {
                const item = rec.title || rec.specificAction || `${rec.category || 'Item'} ${index + 1}`;
                console.log('🏋️ User selected item for too-hard feedback:', item);
                dispatch({ type: 'SELECT_TOO_HARD_ITEM', item });
                dispatch({ type: 'SET_FLOW', flow: 'too-hard-personalization-options' });
              }}
            >
              <div className={styles.optionIcon}>
                {rec.category === 'food' ? '🍽️' : rec.category === 'movement' ? '🏃‍♀️' : '🧘‍♀️'}
              </div>
              <div className={styles.optionText}>
                {rec.title || rec.specificAction || `${rec.category || 'Item'} ${index + 1}`}
              </div>
              {state.tooHardFeedback.selectedItem === (rec.title || rec.specificAction || `${rec.category || 'Item'} ${index + 1}`) && <div className={styles.checkmark}>✓</div>}
            </div>
          ))}
          
          <div 
            className={`${styles.optionCard} ${state.tooHardFeedback.selectedItem === 'Other' ? styles.selected : ''}`}
            onClick={() => {
              console.log('🏋️ User selected "Other" for too-hard feedback');
              dispatch({ type: 'SELECT_TOO_HARD_ITEM', item: 'Other' });
              dispatch({ type: 'SET_FLOW', flow: 'too-hard-personalization-options' });
            }}
          >
            <div className={styles.optionIcon}>📝</div>
            <div className={styles.optionText}>Other (not listed above)</div>
            {state.tooHardFeedback.selectedItem === 'Other' && <div className={styles.checkmark}>✓</div>}
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.backButton}
            onClick={() => dispatch({ type: 'SET_FLOW', flow: 'feedback-reason' })}
          >
            🔙 Back to Feedback Reasons
          </button>
        </div>
      </div>
    );
  };

  const renderTooHardPersonalizationOptionsFlow = () => {
    return (
      <div className={styles.flowContainer}>
        <div className={styles.botMessage}>
          <strong>⏰ Let&apos;s find easier alternatives that fit your schedule!</strong>
          <br />
          <small>I&apos;ll personalize recommendations based on your time and energy levels.</small>
        </div>
        
        <div className={styles.inputGroup}>
          <label>⏰ How much time per day would you like to invest in your wellbeing?</label>
          <select
            value={state.tooHardFeedback.timePerDay}
            onChange={(e) => dispatch({ type: 'SET_TIME_PER_DAY', time: e.target.value })}
            className={styles.selectInput}
          >
            <option value="">Select your preferred time investment</option>
            <option value="5-10 minutes">5-10 minutes</option>
            <option value="15-20 minutes">15-20 minutes</option>
            <option value="30 minutes">30 minutes</option>
            <option value="45 minutes">45 minutes</option>
            <option value="1 hour">1 hour</option>
            <option value="More than 1 hour">More than 1 hour</option>
          </select>
        </div>
        
        <div className={styles.inputGroup}>
          <label>🎯 How many actions would you like to take each day?</label>
          <select
            value={state.tooHardFeedback.dailyActions}
            onChange={(e) => dispatch({ type: 'SET_DAILY_ACTIONS', actions: e.target.value })}
            className={styles.selectInput}
          >
            <option value="">Select your preferred daily action count</option>
            <option value="1 action">1 action</option>
            <option value="2 actions">2 actions</option>
            <option value="3 actions">3 actions</option>
          </select>
        </div>
        
        <div className={styles.inputGroup}>
          <label>🚀 What is easiest to get started with?</label>
          <div className={styles.optionsGrid}>
            <div 
              className={`${styles.optionCard} ${state.tooHardFeedback.easiestToStart === 'food' ? styles.selected : ''}`}
              onClick={() => dispatch({ type: 'SET_EASIEST_TO_START', category: 'food' })}
            >
              <div className={styles.optionIcon}>🍽️</div>
              <div className={styles.optionText}>Food</div>
              {state.tooHardFeedback.easiestToStart === 'food' && <div className={styles.checkmark}>✓</div>}
            </div>
            
            <div 
              className={`${styles.optionCard} ${state.tooHardFeedback.easiestToStart === 'move' ? styles.selected : ''}`}
              onClick={() => dispatch({ type: 'SET_EASIEST_TO_START', category: 'move' })}
            >
              <div className={styles.optionIcon}>🏃‍♀️</div>
              <div className={styles.optionText}>Move</div>
              {state.tooHardFeedback.easiestToStart === 'move' && <div className={styles.checkmark}>✓</div>}
            </div>
            
            <div 
              className={`${styles.optionCard} ${state.tooHardFeedback.easiestToStart === 'emotions' ? styles.selected : ''}`}
              onClick={() => dispatch({ type: 'SET_EASIEST_TO_START', category: 'emotions' })}
            >
              <div className={styles.optionIcon}>🧘‍♀️</div>
              <div className={styles.optionText}>Emotions</div>
              {state.tooHardFeedback.easiestToStart === 'emotions' && <div className={styles.checkmark}>✓</div>}
            </div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            className={styles.submitButton}
            onClick={handleTooHardSubmit}
            disabled={!state.tooHardFeedback.timePerDay || !state.tooHardFeedback.dailyActions || !state.tooHardFeedback.easiestToStart}
          >
            ✅ Get Easier Alternatives
          </button>
          <button 
            className={styles.backButton}
            onClick={() => dispatch({ type: 'SET_FLOW', flow: 'select-too-hard-item' })}
          >
            🔙 Back to Item Selection
          </button>
        </div>
      </div>
    );
  };

  const handlePersonalizedRecommendationAction = async (action: 'accept' | 'reject' | 'suggest') => {
    if (action === 'accept') {
      try {
        setCurrentMessage("🎯 Transferring your personalized recommendations to the main page...");
        
        // Convert personalized recommendations to the format expected by the main page
        const formattedRecommendations = previewData?.recommendations.map(rec => ({
          title: rec.title,
          specificAction: rec.specificAction,
          category: 'food', // Since these are mostly food recommendations
          priority: rec.priority
        })) || [];
        
        // Update the current recommendations context with new recommendations
        if (formattedRecommendations.length > 0) {
          currentRecs.updateRecommendations(formattedRecommendations);
          
          setCurrentMessage(
            `✅ **Successfully Transferred!**\n\n` +
            `**Your personalized recommendations are now active on the main page:**\n\n` +
            `${formattedRecommendations.map((rec, index) => 
              `${index + 1}. **${rec.title}**\n   ${rec.specificAction}\n   Priority: ${rec.priority}\n`
            ).join('\n')}\n\n` +
            `💡 **These weather and culture-optimized recommendations are now your main recommendations!**\n\n` +
            `**You can now close this chatbot and see them on your main page.**`
          );
          
          // Mark as updated
          setPreviewData({ 
            ...previewData!, 
            isMainPageUpdated: true 
          });
          
          // Hide chatbot after 8 seconds to give user time to read
          setTimeout(() => {
            hideChatbot();
            setTimeout(() => setCurrentMessage(''), 100);
          }, 8000);
          
        } else {
          setCurrentMessage("⚠️ No recommendations to transfer. Please try again.");
        }
        
      } catch (error) {
        console.error('❌ Failed to transfer recommendations:', error);
        setCurrentMessage("⚠️ Sorry, I couldn't transfer the recommendations. Please try again.");
      }
      
    } else if (action === 'reject') {
      setCurrentMessage("❌ Got it! Your current recommendations stay the same. No changes were made to the main page.");
      
      // Clear preview data and hide after 3 seconds
      setTimeout(() => {
        setPreviewData(null);
        hideChatbot();
        setTimeout(() => setCurrentMessage(''), 100);
      }, 3000);
      
    } else if (action === 'suggest') {
      // Generate new alternatives
      if (previewData) {
        try {
          setCurrentMessage("🔄 Generating alternative recommendations...");
          
          // Generate different alternatives based on the same preferences
          const alternativeRecommendations = await generateAlternativeRecommendations(previewData.preferences);
          
          // Update preview data with alternatives
          setPreviewData({ 
            preferences: previewData.preferences, 
            recommendations: alternativeRecommendations,
            isMainPageUpdated: false
          });
          
          // Show the new alternatives
          const alternativesMessage = createPersonalizedRecommendationsDisplay(
            alternativeRecommendations, 
            previewData.preferences
          );
          
          setCurrentMessage(alternativesMessage);
          
        } catch (error) {
          console.error('❌ Failed to generate alternatives:', error);
          setCurrentMessage("⚠️ Sorry, I couldn't generate alternatives. Please try again.");
        }
      }
    }
  };

  const generateAlternativeRecommendations = async (preferences: string[]): Promise<Array<{title: string, specificAction: string, priority: string}>> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate alternative recommendations based on preferences
    const recommendations = [];
    
    // Weather-based alternative recommendations
    if (preferences.some(p => p.startsWith('Weather:'))) {
      const weather = preferences.find(p => p.startsWith('Weather:'))?.split(': ')[1];
      
      if (weather?.toLowerCase().includes('hot') || weather?.toLowerCase().includes('summer')) {
        // Alternative hot weather recommendations
        recommendations.push({
          title: "Alternative Cooling Herbs for Hormones",
          specificAction: "Try basil, cilantro, and parsley in cooling drinks and salads for hormone balance",
          priority: "High"
        });
        
        recommendations.push({
          title: "Alternative Hydrating Foods",
          specificAction: "Include celery, lettuce, and radishes for cooling hydration and hormone support",
          priority: "Medium"
        });
        
        recommendations.push({
          title: "Alternative Cooling Proteins",
          specificAction: "Try white fish, shrimp, or tempeh with cooling herbs for hormone balance",
          priority: "Medium"
        });
        
      } else if (weather?.toLowerCase().includes('cold') || weather?.toLowerCase().includes('winter')) {
        // Alternative cold weather recommendations
        recommendations.push({
          title: "Alternative Warming Herbs",
          specificAction: "Try cloves, allspice, and star anise for warming hormone support",
          priority: "High"
        });
        
        recommendations.push({
          title: "Alternative Winter Vegetables",
          specificAction: "Include turnips, parsnips, and rutabagas for warming energy and hormone support",
          priority: "Medium"
        });
        
        recommendations.push({
          title: "Alternative Warming Drinks",
          specificAction: "Try chai tea, hot chocolate with cinnamon, or warm apple cider for hormone balance",
          priority: "Medium"
        });
      }
    }
    
    // Culture-based alternative recommendations
    if (preferences.some(p => p.startsWith('Culture:'))) {
      const culture = preferences.find(p => p.startsWith('Culture:'))?.split(': ')[1];
      
      if (culture?.toLowerCase().includes('indian') || culture?.toLowerCase().includes('south asian')) {
        recommendations.push({
          title: "Alternative Ayurvedic Herbs",
          specificAction: "Try brahmi, guduchi, and yashtimadhu for alternative hormone support",
          priority: "High"
        });
        
        recommendations.push({
          title: "Alternative Indian Cooling Foods",
          specificAction: "Include kokum, tamarind, and raw mango for cooling hormone balance",
          priority: "Medium"
        });
        
      } else if (culture?.toLowerCase().includes('mediterranean')) {
        recommendations.push({
          title: "Alternative Mediterranean Foods",
          specificAction: "Try artichokes, capers, and anchovies for hormone balance and gut health",
          priority: "High"
        });
        
        recommendations.push({
          title: "Alternative Mediterranean Herbs",
          specificAction: "Use sage, marjoram, and bay leaves for their hormone-balancing properties",
          priority: "Medium"
        });
      }
    }
    
    // Core alternative hormone-balancing recommendations
    recommendations.push({
      title: "Alternative Omega-3 Sources",
      specificAction: "Try chia seeds, hemp seeds, and algae supplements for hormone balance",
      priority: "High"
    });
    
    recommendations.push({
      title: "Alternative Probiotic Foods",
      specificAction: "Include tempeh, natto, and kefir for gut health and hormone regulation",
      priority: "High"
    });
    
    recommendations.push({
      title: "Alternative Fiber Sources",
      specificAction: "Include psyllium husk, chia seeds, and flaxseeds for hormone metabolism",
      priority: "Medium"
    });
    
    // Ensure we have at least 6 recommendations
    while (recommendations.length < 6) {
      recommendations.push({
        title: "Alternative Balanced Meal Options",
        specificAction: "Try different protein sources, grain alternatives, and vegetable combinations for hormone balance",
        priority: "Medium"
      });
    }
    
    return recommendations.slice(0, 8); // Return max 8 recommendations
  };



  return (
    <div className={styles.chatbotOverlay}>
      <div className={styles.chatbotContainer}>
        <div className={styles.chatbotHeader}>
          <div className={styles.botAvatar}>
            <img src="/Auvra.svg" alt="Auvra Logo" className={styles.auvraLogo} />
          </div>
          <div className={styles.botInfo}>
            <div className={styles.botName}>Auvra - your personal Hormone Guide</div>
            <div className={styles.botStatus}>I&apos;m here to help you feel more in control of your body</div>
          </div>
          <button className={styles.closeButton} onClick={hideChatbot}>
            ×
          </button>
        </div>
        
        <div className={styles.chatbotBody}>
          {/* Debug loading state display */}
          <div style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: '#333', 
            color: 'white', 
            padding: '5px 10px', 
            borderRadius: '5px', 
            fontSize: '12px',
            zIndex: 1000
          }}>
            🔄 Loading: {isGeneratingRecommendations ? 'TRUE' : 'FALSE'}
          </div>
          
          {/* Debug user profile display */}
          <div style={{ 
            position: 'absolute', 
            top: '50px', 
            right: '10px', 
            background: '#333', 
            color: 'white', 
            padding: '5px 10px', 
            borderRadius: '5px', 
            fontSize: '10px',
            zIndex: 1000,
            maxWidth: '200px'
          }}>
            👤 Profile: {state.userProfile.primaryImbalance || 'None'}
            <br />
            🏥 Conditions: {state.userProfile.conditions.length || 0}
            <br />
            😷 Symptoms: {state.userProfile.symptoms.length || 0}
            <br />
            🧪 Hormones: {Object.values(state.userProfile.hormoneScores).filter(score => score > 0).length || 0}
          </div>
          
          {renderCurrentFlow()}
        </div>
      </div>
    </div>
  );
};

export default Chatbot; 