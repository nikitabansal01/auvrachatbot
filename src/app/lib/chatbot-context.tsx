"use client";
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types/ResearchData';

// Chatbot flow types
export type ChatbotFlow = 
  | 'feedback'
  | 'feedback-reason'
  | 'select-food-item'
  | 'personalization-options'
  | 'personalized-recommendations'
  | 'recommendations-accepted'
  | 'select-restriction-food-item'
  | 'restriction-personalization-options'
  | 'select-taste-food-item'
  | 'taste-personalization-options'
  | 'select-too-hard-item'
  | 'too-hard-personalization-options'
  | 'location-store-finder'
  | null;

export type ChatbotState = {
  isActive: boolean;
  currentFlow: ChatbotFlow;
  isVisible: boolean;
  userProfile: UserProfile;
  dailyFeedback: {
    hasRatedToday: boolean;
    lastRatingDate: string | null;
    rating: 'liked' | 'disliked' | 'changes' | null;
    feedbackReason: 'unavailable' | 'restrictions' | 'taste' | 'too-hard' | 'too-easy' | null;
  };
  taskModifications: {
    modifiedTasks: string[];
    skippedTasks: string[];
    modifiedDates: string[];
  };
  personalization: {
    allergies: string[];
    dietaryPreference: 'veg' | 'non-veg' | 'mix' | 'vegan';
    movementPreference: string[];
    otherMovement: string;
    foodStyle: string;
    mindfulnessPreference: string[];
    otherPreferences: string;
    isComplete: boolean;
  };
  refreshCount: number;
  maxRefreshes: number;
  // New state for recommendation changes
  recommendationChanges: {
    shouldRefresh: boolean;
    refreshReason: string;
    alternativePreferences: string[];
  };
  // New state for category selection
  categorySelection: {
    selectedCategory: 'food' | 'movement' | 'mindfulness' | null;
  };
  // New state for food item selection and personalization
  foodFeedback: {
    selectedFoodItem: string | null;
    personalizationPreferences: string[];
  };
  // New state for restriction-based personalization
  restrictionFeedback: {
    selectedFoodItem: string | null;
    restrictionType: 'allergies' | 'diet' | 'culture' | 'other' | null;
    allergies: string[];
    dietRestrictions: string[];
    cultureEthnicity: string;
    otherRestrictions: string;
  };
  // New state for taste-based personalization
  tasteFeedback: {
    selectedFoodItem: string | null;
    tastePreferences: string[];
    preferredCuisine: string;
    cultureEthnicity: string;
    foodAllergies: string[];
    dietRestrictions: string[];
    otherPreferences: string;
  };
  // New state for too-hard-based personalization
  tooHardFeedback: {
    selectedItem: string | null;
    timePerDay: string;
    dailyActions: string;
    easiestToStart: 'food' | 'move' | 'emotions' | null;
  };
  // New state for store finder functionality
  storeFinder: {
    selectedFoodItem: string | null;
    location: string;
    searchResults: any[];
    isSearching: boolean;
  };
};

export type ChatbotAction = 
  | { type: 'SHOW_CHATBOT'; flow: ChatbotFlow }
  | { type: 'HIDE_CHATBOT' }
  | { type: 'SET_FLOW'; flow: ChatbotFlow }
  | { type: 'SET_FEEDBACK'; rating: 'liked' | 'disliked' | 'changes' }
  | { type: 'SET_FEEDBACK_REASON'; reason: 'unavailable' | 'restrictions' | 'taste' | 'too-hard' | 'too-easy' }
  | { type: 'SELECT_FOOD_ITEM'; foodItem: string }
  | { type: 'SET_PERSONALIZATION_PREFERENCES'; preferences: string[] }
  | { type: 'SELECT_RESTRICTION_FOOD_ITEM'; foodItem: string }
  | { type: 'SET_RESTRICTION_TYPE'; restrictionType: 'allergies' | 'diet' | 'culture' | 'other' }
  | { type: 'SET_ALLERGIES'; allergies: string[] }
  | { type: 'SET_DIET_RESTRICTIONS'; restrictions: string[] }
  | { type: 'SET_CULTURE_ETHNICITY'; ethnicity: string }
  | { type: 'SET_OTHER_RESTRICTIONS'; restrictions: string }
  | { type: 'SELECT_TASTE_FOOD_ITEM'; foodItem: string }
  | { type: 'SET_TASTE_PREFERENCES'; preferences: string[] }
  | { type: 'SET_PREFERRED_CUISINE'; cuisine: string }
  | { type: 'SET_TASTE_CULTURE_ETHNICITY'; ethnicity: string }
  | { type: 'SET_TASTE_FOOD_ALLERGIES'; allergies: string[] }
  | { type: 'SET_TASTE_DIET_RESTRICTIONS'; restrictions: string[] }
  | { type: 'SET_TASTE_OTHER_PREFERENCES'; preferences: string }
  | { type: 'SELECT_TOO_HARD_ITEM'; item: string }
  | { type: 'SET_TIME_PER_DAY'; time: string }
  | { type: 'SET_DAILY_ACTIONS'; actions: string }
  | { type: 'SET_EASIEST_TO_START'; category: 'food' | 'move' | 'emotions' }
  | { type: 'TRIGGER_RECOMMENDATION_REFRESH'; reason: string; preferences: string[] }
  | { type: 'RESET_RECOMMENDATION_REFRESH' }
  | { type: 'RESET_DAILY' }
  | { type: 'RESET_CHATBOT_STATE' }
  | { type: 'TRIGGER_STORE_FINDER'; foodItem: string }
  | { type: 'SET_STORE_FINDER_LOCATION'; location: string }
  | { type: 'SET_STORE_FINDER_RESULTS'; results: any[] };

// Initial state
const initialState: ChatbotState = {
  isActive: false,
  currentFlow: null,
  isVisible: false,
  userProfile: {
    hormoneScores: { androgens: 0, progesterone: 0, estrogen: 0, thyroid: 0, cortisol: 0, insulin: 0 },
    primaryImbalance: '',
    secondaryImbalances: [],
    conditions: [],
    symptoms: [],
    cyclePhase: 'unknown',
    birthControlStatus: 'No',
    age: undefined,
    ethnicity: undefined,
    cravings: [],
    confidence: 'low'
  },
  dailyFeedback: {
    hasRatedToday: false,
    lastRatingDate: null,
    rating: null,
    feedbackReason: null
  },
  taskModifications: {
    modifiedTasks: [],
    skippedTasks: [],
    modifiedDates: []
  },
  personalization: {
    allergies: [],
    dietaryPreference: 'mix',
    movementPreference: [],
    otherMovement: '',
    foodStyle: '',
    mindfulnessPreference: [],
    otherPreferences: '',
    isComplete: false
  },
  refreshCount: 0,
  maxRefreshes: 3,
  recommendationChanges: {
    shouldRefresh: false,
    refreshReason: '',
    alternativePreferences: []
  },
  categorySelection: {
    selectedCategory: null
  },
  foodFeedback: {
    selectedFoodItem: null,
    personalizationPreferences: []
  },
  restrictionFeedback: {
    selectedFoodItem: null,
    restrictionType: null,
    allergies: [],
    dietRestrictions: [],
    cultureEthnicity: '',
    otherRestrictions: ''
  },
  tasteFeedback: {
    selectedFoodItem: null,
    tastePreferences: [],
    preferredCuisine: '',
    cultureEthnicity: '',
    foodAllergies: [],
    dietRestrictions: [],
    otherPreferences: ''
  },
  tooHardFeedback: {
    selectedItem: null,
    timePerDay: '',
    dailyActions: '',
    easiestToStart: null
  },
  storeFinder: {
    selectedFoodItem: null,
    location: '',
    searchResults: [],
    isSearching: false
  }
};

// Reducer
function chatbotReducer(state: ChatbotState, action: ChatbotAction): ChatbotState {
  switch (action.type) {
    case 'SHOW_CHATBOT':
      return {
        ...state,
        isVisible: true,
        currentFlow: action.flow,
        isActive: true
      };
    
    case 'HIDE_CHATBOT':
      return {
        ...state,
        isVisible: false,
        currentFlow: null,
        isActive: false,
        // Keep hasRatedToday as true if user already gave feedback
        // This prevents the chatbot from showing again on the same day
        dailyFeedback: {
          ...state.dailyFeedback,
          // Only reset if no feedback was given
          hasRatedToday: state.dailyFeedback.hasRatedToday,
          rating: state.dailyFeedback.rating
        }
      };
    
    case 'SET_FLOW':
      return {
        ...state,
        currentFlow: action.flow
      };
    
    case 'SET_FEEDBACK':
      return {
        ...state,
        dailyFeedback: {
          ...state.dailyFeedback,
          hasRatedToday: true,
          lastRatingDate: new Date().toISOString(),
          rating: action.rating
        }
      };
    
    case 'SET_FEEDBACK_REASON':
      return {
        ...state,
        dailyFeedback: {
          ...state.dailyFeedback,
          feedbackReason: action.reason
        }
      };
    
    case 'SELECT_FOOD_ITEM':
      return {
        ...state,
        foodFeedback: {
          ...state.foodFeedback,
          selectedFoodItem: action.foodItem
        }
      };
    
    case 'SET_PERSONALIZATION_PREFERENCES':
      return {
        ...state,
        foodFeedback: {
          ...state.foodFeedback,
          personalizationPreferences: action.preferences
        }
      };

    case 'SELECT_RESTRICTION_FOOD_ITEM':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          selectedFoodItem: action.foodItem
        }
      };

    case 'SET_RESTRICTION_TYPE':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          restrictionType: action.restrictionType
        }
      };

    case 'SET_ALLERGIES':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          allergies: action.allergies
        }
      };

    case 'SET_DIET_RESTRICTIONS':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          dietRestrictions: action.restrictions
        }
      };

    case 'SET_CULTURE_ETHNICITY':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          cultureEthnicity: action.ethnicity
        }
      };

    case 'SET_OTHER_RESTRICTIONS':
      return {
        ...state,
        restrictionFeedback: {
          ...state.restrictionFeedback,
          otherRestrictions: action.restrictions
        }
      };

    case 'SELECT_TASTE_FOOD_ITEM':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          selectedFoodItem: action.foodItem
        }
      };

    case 'SET_TASTE_PREFERENCES':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          tastePreferences: action.preferences
        }
      };

    case 'SET_PREFERRED_CUISINE':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          preferredCuisine: action.cuisine
        }
      };

    case 'SET_TASTE_CULTURE_ETHNICITY':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          cultureEthnicity: action.ethnicity
        }
      };

    case 'SET_TASTE_FOOD_ALLERGIES':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          foodAllergies: action.allergies
        }
      };

    case 'SET_TASTE_DIET_RESTRICTIONS':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          dietRestrictions: action.restrictions
        }
      };

    case 'SET_TASTE_OTHER_PREFERENCES':
      return {
        ...state,
        tasteFeedback: {
          ...state.tasteFeedback,
          otherPreferences: action.preferences
        }
      };

    case 'SELECT_TOO_HARD_ITEM':
      return {
        ...state,
        tooHardFeedback: {
          ...state.tooHardFeedback,
          selectedItem: action.item
        }
      };

    case 'SET_TIME_PER_DAY':
      return {
        ...state,
        tooHardFeedback: {
          ...state.tooHardFeedback,
          timePerDay: action.time
        }
      };

    case 'SET_DAILY_ACTIONS':
      return {
        ...state,
        tooHardFeedback: {
          ...state.tooHardFeedback,
          dailyActions: action.actions
        }
      };

    case 'SET_EASIEST_TO_START':
      return {
        ...state,
        tooHardFeedback: {
          ...state.tooHardFeedback,
          easiestToStart: action.category
        }
      };

    case 'RESET_DAILY':
      const todayDate = new Date().toISOString().split('T')[0];
      const lastRatingDate = state.dailyFeedback.lastRatingDate;
      const shouldReset = lastRatingDate && lastRatingDate.split('T')[0] !== todayDate;
      
      if (shouldReset) {
        return {
          ...state,
                  dailyFeedback: {
          ...state.dailyFeedback,
          hasRatedToday: false,
          rating: null,
          feedbackReason: null
        },
          refreshCount: 0
        };
      }
      return state;

    case 'TRIGGER_RECOMMENDATION_REFRESH':
      return {
        ...state,
        recommendationChanges: {
          shouldRefresh: true,
          refreshReason: action.reason,
          alternativePreferences: action.preferences
        }
      };

    case 'RESET_RECOMMENDATION_REFRESH':
      return {
        ...state,
        recommendationChanges: {
          shouldRefresh: false,
          refreshReason: '',
          alternativePreferences: []
        }
      };

    // Removed SELECT_CATEGORY case - no longer needed

    case 'RESET_CHATBOT_STATE':
      return {
        ...initialState,
        userProfile: state.userProfile // Keep user profile
      };

    case 'TRIGGER_STORE_FINDER':
      return {
        ...state,
        storeFinder: {
          ...state.storeFinder,
          selectedFoodItem: action.foodItem
        }
      };

    case 'SET_STORE_FINDER_LOCATION':
      return {
        ...state,
        storeFinder: {
          ...state.storeFinder,
          location: action.location
        }
      };

    case 'SET_STORE_FINDER_RESULTS':
      return {
        ...state,
        storeFinder: {
          ...state.storeFinder,
          searchResults: action.results,
          isSearching: false
        }
      };
    
    default:
      return state;
  }
}

// Context
const ChatbotContext = createContext<{
  state: ChatbotState;
  dispatch: React.Dispatch<ChatbotAction>;
  showChatbot: (flow: ChatbotFlow) => void;
  hideChatbot: () => void;
  shouldShowFeedback: () => boolean;
  shouldShowPersonalization: () => boolean;
  resetChatbotState: () => void;
} | null>(null);

// Provider component
export function ChatbotProvider({ children, userProfile }: { children: ReactNode; userProfile: UserProfile }) {
  const [state, dispatch] = useReducer(chatbotReducer, {
    ...initialState,
    userProfile
  });

  // Check if it's a new day and reset daily limits
  useEffect(() => {
    const checkDailyReset = () => {
      dispatch({ type: 'RESET_DAILY' });
    };
    
    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  // Removed automatic timer - chatbot now opens manually via floating button

  const showChatbot = (flow: ChatbotFlow) => {
    console.log('🚀 showChatbot called with flow:', flow);
    dispatch({ type: 'SHOW_CHATBOT', flow });
  };

  const hideChatbot = () => {
    dispatch({ type: 'HIDE_CHATBOT' });
  };

  const shouldShowFeedback = () => {
    return !state.dailyFeedback.hasRatedToday;
  };

  const shouldShowPersonalization = () => {
    const hasModifiedTasks = state.taskModifications.modifiedTasks.length >= 3;
    const hasModifiedMultipleDays = state.taskModifications.modifiedDates.length >= 3;
    return (hasModifiedTasks || hasModifiedMultipleDays) && !state.personalization.isComplete;
  };

  const resetChatbotState = () => {
    dispatch({ type: 'RESET_CHATBOT_STATE' });
  };

  return (
    <ChatbotContext.Provider value={{
      state,
      dispatch,
      showChatbot,
      hideChatbot,
      shouldShowFeedback,
      shouldShowPersonalization,
      resetChatbotState
    }}>
      {children}
    </ChatbotContext.Provider>
  );
}

// Hook
export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
} 