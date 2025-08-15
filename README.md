# Auvra — Hormone Health Assessment App

Auvra is a mobile-friendly React web app designed to help women identify potential hormone imbalances based on a personalized survey, optional lab inputs, and menstrual cycle phase. Built with guidance from endocrinology, gynecology, and functional nutrition frameworks, Auvra empowers users with actionable insights and education about their hormone health.

---

## 🚀 Project Goal
To provide an accessible, user-friendly tool for women to:
- Assess hormone health using symptoms, cycle data, and lab results
- Understand possible hormone imbalances and their implications
- Receive personalized recommendations and educational resources

---

## 🛠️ Process & Architecture
- **User Flow:**
  1. Home page introduces Auvra and its purpose
  2. Users complete a 10-question hormone health survey (various input types)
  3. Optionally, users can enter lab values for deeper analysis
  4. Cycle phase is calculated based on user input
  5. Backend logic scores symptoms and integrates lab data for refined results
  6. Results page displays hormone assessment, explanations, confidence levels, conflicts, and recommendations
  7. Users can download their report as a PDF or send it to their email
  8. Option to retake the survey and start over

- **Tech Stack:**
  - React (functional components)
  - TypeScript
  - React Router
  - Plain CSS Modules for styling
  - `html2canvas` + `jsPDF` for PDF export
  - Vercel KV for data storage
  - Vercel serverless functions for API

- **Architecture:**
  - Logic is separated into `src/logic/hormones`
  - Types are centralized in `src/types`
  - Components are in `src/components`
  - Pages are in `src/pages`

---

## ✨ Features
- Mobile-first, accessible UI
- Personalized hormone health survey
- Optional lab data integration (testosterone, DHEA, LH/FSH, TSH, T3, insulin, HbA1c)
- Cycle phase calculation
- Detailed results with explanations, confidence, and conflict detection
- PDF export and email report (via mailto)
- Data persistence with Vercel KV storage
- API endpoints for saving responses and emails
- **Real-time store search** for finding local stores and online options
- **Location-based recommendations** with Google Places API integration
- Auvra branding and clear medical disclaimer

---

## 🖼️ Branding
- The app features the Auvra logo and footer branding
- All reports and PDFs are watermarked with Auvra and a medical disclaimer

---

## 🏁 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nikitabansal01/Rootcause.git
   cd Rootcause/hormone-health-app
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npm start
   ```
4. **Open in your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

For production deployment with data storage, see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Vercel with Upstash Redis database.

## 🏪 Store Search Setup

For real-time store search functionality, see [STORE_SEARCH_SETUP.md](./STORE_SEARCH_SETUP.md) for detailed instructions on configuring Google Places API and enabling location-based store recommendations.

<!-- Updated deployment info -->

---

## 🤝 Contributing
We welcome feedback, suggestions, and contributions! Please open an issue or submit a pull request.

---

## ⚠️ Disclaimer
This app is for informational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a licensed healthcare provider.

---

**Auvra by Hormone Insight Inc**
