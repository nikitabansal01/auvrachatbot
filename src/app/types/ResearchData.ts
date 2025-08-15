export interface ResearchStudy {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  journal: string;
  doi?: string;
  pubmedId?: string;
  citationCount: number;
  studyType: 'human' | 'animal' | 'review';
  participantCount: number;
  participantGender: 'female' | 'male' | 'mixed';
  ageRange?: {
    min: number;
    max: number;
  };
  riskBiasScore: number; // 1-10, lower is better
  interventionType: 'food' | 'movement' | 'mindfulness' | 'combined';
  specificIntervention: string;
  outcomes: string[];
  results: string;
  limitations?: string[];
  
  // Hormone-specific relevance
  hormoneRelevance: {
    androgens?: number; // 0-10 scale
    progesterone?: number;
    estrogen?: number;
    thyroid?: number;
    cortisol?: number;
    insulin?: number;
  };
  
  // Condition-specific relevance
  conditionRelevance: {
    pcos?: number; // 0-10 scale
    pmdd?: number;
    hypothyroidism?: number;
    hyperthyroidism?: number;
  };
  
  // Symptom-specific relevance
  symptomRelevance: {
    acne?: number;
    hairLoss?: number;
    bloating?: number;
    breastTenderness?: number;
    fatigue?: number;
    moodChanges?: number;
    weightGain?: number;
    irregularPeriods?: number;
  };
  
  // Cycle phase relevance
  cyclePhaseRelevance?: {
    follicular?: number;
    ovulatory?: number;
    luteal?: number;
    menstrual?: number;
  };
  
  // Birth control relevance
  birthControlRelevance?: {
    onOcp?: number;
    offOcp?: number;
    iud?: number;
    none?: number;
  };
  
  // Ethnicity relevance (if applicable)
  ethnicityRelevance?: {
    caucasian?: number;
    asian?: number;
    african?: number;
    hispanic?: number;
    other?: number;
  };
  
  // Cravings relevance
  cravingsRelevance?: {
    sugar?: number;
    salt?: number;
    chocolate?: number;
    none?: number;
  };
}

export interface Recommendation {
  id: string;
  category: 'food' | 'movement' | 'mindfulness';
  title: string;
  specificAction: string;
  researchBacking: {
    studies: ResearchStudy[];
    summary: string;
  };
  expectedTimeline: string;
  contraindications?: string[];
  frequency: string; // e.g., "daily", "3x per week"
  duration?: string; // e.g., "10 minutes", "30 minutes"
  // Personalization fields
  isPersonalized?: boolean;
  personalizationDate?: string;
  originalTitle?: string;
  originalAction?: string;
  intensity?: 'low' | 'moderate' | 'high';
  priority: 'high' | 'medium' | 'low';
  
  // User-specific relevance score
  relevanceScore: number; // 0-100, calculated based on user profile
}

export interface UserProfile {
  hormoneScores: {
    androgens: number;
    progesterone: number;
    estrogen: number;
    thyroid: number;
    cortisol: number;
    insulin: number;
  };
  primaryImbalance: string;
  secondaryImbalances: string[];
  conditions: string[];
  symptoms: string[];
  cyclePhase: string;
  birthControlStatus: string;
  age?: number;
  ethnicity?: string;
  cravings: string[];
  confidence: string;
}

export interface RecommendationResult {
  food: Recommendation[];
  movement: Recommendation[];
  mindfulness: Recommendation[];
  userProfile: UserProfile;
  generatedAt: string;
} 