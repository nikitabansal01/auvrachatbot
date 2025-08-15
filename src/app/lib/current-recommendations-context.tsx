"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Recommendation {
  title?: string;
  specificAction?: string;
  category?: string;
  researchBacking?: {
    summary: string;
    studies: unknown[];
  };
  contraindications?: unknown[];
  frequency?: string;
  expectedTimeline?: string;
  priority?: string;
  // Personalization fields
  isPersonalized?: boolean;
  personalizationDate?: string;
  originalTitle?: string;
  originalAction?: string;
}

interface CurrentRecommendationsContextType {
  currentRecommendations: Recommendation[];
  setCurrentRecommendations: (recommendations: Recommendation[]) => void;
  updateRecommendations: (newRecommendations: Recommendation[]) => void;
  refreshMainPage: () => void;
  shouldRefresh: boolean;
}

const CurrentRecommendationsContext = createContext<CurrentRecommendationsContextType | null>(null);

export function CurrentRecommendationsProvider({ children, initialRecommendations }: { 
  children: ReactNode; 
  initialRecommendations: Recommendation[] 
}) {
  const [currentRecommendations, setCurrentRecommendations] = useState<Recommendation[]>(initialRecommendations);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const updateRecommendations = (newRecommendations: Recommendation[]) => {
    console.log('🔄 Updating current recommendations:', newRecommendations);
    setCurrentRecommendations(newRecommendations);
  };

  const refreshMainPage = () => {
    console.log('🔄 Triggering main page refresh');
    setShouldRefresh(true);
    // Reset the flag after a short delay
    setTimeout(() => setShouldRefresh(false), 100);
  };

  return (
    <CurrentRecommendationsContext.Provider value={{
      currentRecommendations,
      setCurrentRecommendations,
      updateRecommendations,
      refreshMainPage,
      shouldRefresh
    }}>
      {children}
    </CurrentRecommendationsContext.Provider>
  );
}

export function useCurrentRecommendations() {
  const context = useContext(CurrentRecommendationsContext);
  if (!context) {
    throw new Error('useCurrentRecommendations must be used within a CurrentRecommendationsProvider');
  }
  return context;
} 