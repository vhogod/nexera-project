# NexEra AI Training Studio

**AI-powered 3D learning tools + Natural Language Avatar Controller**  
A complete two-prototype solution built for the **AI Engineering Challenge** by NexEra.

---

## 🎯 What I Built

### Test 1 — AI-Generated 3D Asset Pipeline
- Users can **type a description** (e.g. "yellow hard hat") or **upload an image**
- AI (OpenRouter) identifies the object and selects the best matching 3D model
- Model is automatically loaded, scaled, and centered in an interactive Three.js viewer
- AI generates a professional **educational safety summary**

### Test 2 — Natural Language → Avatar Animation
- Users type natural commands (e.g. "Walk to the table", "Wave hello to the learner")
- AI interprets the command and maps it to the correct animation
- 3D avatar performs the action in real-time
- AI provides a short explanation of why the action matters for workplace safety training

Both prototypes run in a single polished React + Three.js application with tab switching.

---

## ✨ Live Demo

[→ Open Live Demo](https://nexera-project.vercel.app/)  


---

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone https://github.com/vhogod/nexera-project.git
cd nexera-project

# Install dependencies
npm install

# Create .env file
echo "VITE_GEMINI_API_KEY=your-key-here" > .env
# or
echo "VITE_OPENROUTER_KEY=your-key-here" > .env
```

### Get API Key
- **Gemini (free):** https://aistudio.google.com → Get API Key
- **OpenRouter:** https://openrouter.ai → Create Key

### Run locally

```bash
npm run dev
```

Open http://localhost:5173

### Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "deploy"
git push

# Vercel auto-deploys on push
# Add VITE_GEMINI_API_KEY in Vercel environment variables
```

---

## APIs & Libraries Used

- **Three.js** — 3D rendering, GLB loading, animation mixer
- **Google Gemini API** — object identification, summary generation, command interpretation
- **OpenRouter API** — fallback AI inference
- **Mixamo** — free character and animation library (Adobe)
- **Khronos glTF Sample Models** — free GLB models for Test 1
- **React + Vite** — frontend framework

---

## Limitations & Known Issues

- 3D model library is curated (8 objects) — not dynamically generated
- Free AI API tiers have rate limits; a paid key is needed but didnt have cash
- Mixamo animation bone mapping warnings appear in console as cosmetic only
- Image upload uses text-based fallback on free AI tiers, no vision
- Avatar animations require GLB files with skin baked in from Mixamo

---

## Next Steps & Scaling Inside NexEra

- **Dynamic 3D generation** — integrate Meshy.ai or Shap-E for true text-to-3D
- **Larger animation library** — add more Mixamo animations mapped to safety scenarios
- **Voice commands** — add Web Speech API for hands-free avatar control
- **Multi-avatar scenes** — simulate team safety drills with multiple characters
- **LMS integration** — connect to NexEra's training module system
- **Analytics** — track which objects/commands learners interact with most
- **Mobile support** — optimize Three.js renderer for tablets used on job sites

---

## Author

Built by **DAKALO** for the NexEra AI Engineer Assessment  
GitHub: https://github.com/vhogod/nexera-project
