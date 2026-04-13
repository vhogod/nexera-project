# NexEra AI Engineering Assessment — Technical Explanation

**Live Demo:** https://nexera-project.vercel.app  
**GitHub:** https://github.com/vhogod/nexera-project

---

## What I Built

I built two interactive AI-powered prototypes inside a single React application,
deployed to Vercel and accessible via a live URL.

**Prototype 1 — AI 3D Asset Pipeline**
A system where a user types a description like "hard hat" or uploads an image,
and the app uses AI to identify the object, retrieve a matching 3D GLB model,
load it in a Three.js viewer, and generate an educational safety summary.

**Prototype 2 — Natural Language Avatar Animation**
A system where a user types commands like "wave hello to the learner" or
"show the correct safety posture", and the app uses AI to interpret the command,
map it to a Mixamo animation, and play it on a 3D Y Bot avatar in real time.

---

## Why I Chose This Approach

**React + Vite** was chosen for fast development, hot module reload, and
seamless Vercel deployment with zero configuration.

**Three.js** was chosen over Unity WebGL or Babylon.js because it runs
natively in the browser with no plugins, loads GLB files directly, and
has excellent animation mixer support for Mixamo rigs. It also keeps
the bundle lightweight and fast to load.

**OpenRouter API** was chosen as the AI layer because it provides access
to multiple AI models through a single unified API endpoint. This means
the app is not locked to one provider — if one model hits a rate limit,
the router can fall back to another. The free tier supports prototyping
without requiring a credit card, making it ideal for rapid development.

**Mixamo** was chosen for avatars and animations because it provides
professional-quality rigged characters and hundreds of animations for
free, all exportable as FBX/GLB — the exact format Three.js requires.

---

## Architecture & AI Logic

### Test 1 — AI Logic
The pipeline makes two sequential AI calls per search:

1. **Object identification call** — the user's text or image is sent to
the AI with a strict JSON response prompt. The model returns a keyword
like "hard hat" and a category like "safety equipment".

2. **Summary generation call** — the AI writes a 2-3 sentence educational
summary about the object including its use and a key safety fact.

Between the two calls, a local MODEL_LIBRARY array maps keywords to
curated GLB URLs. The GLTFLoader fetches the model, auto-scales it using
a bounding box calculation, and centers it on the grid.

### Test 2 — AI Logic
The avatar system makes one AI call per command:

1. **Command interpretation call** — the user's natural language command
is sent to OpenRouter with a system prompt that defines 5 animation
categories (idle, wave, walk, point, safety). The model returns a JSON
object with the animation key and a safety training explanation.

2. **Animation playback** — the returned key maps to a Mixamo GLB file.
The GLTFLoader loads the file, THREE.AnimationMixer binds to the model,
and the first animation clip plays in a loop.

---

## What Was Challenging & How I Solved It

**Challenge 1 — Mixamo bone mapping errors**
When loading animations separately from the character, Three.js threw
PropertyBinding errors because bone names didn't match. I solved this
by downloading each animation "With Skin" from Mixamo, which bakes the
character into each animation file so the skeleton always matches.

**Challenge 2 — AI API rate limits**
Free tier APIs hit rate limits quickly during development. I solved this
by using OpenRouter's free model router which automatically switches
between available free models, and by implementing clean JSON parsing
with fallbacks so the app degrades gracefully when the AI is unavailable.

**Challenge 3 — GLB model sources**
Finding reliable, freely hosted GLB models was difficult. I solved this
by using the official Khronos glTF Sample Models repository on GitHub
and Google's ModelViewer sample assets, both of which are stable and
CDN-hosted.



---

## How I Would Scale This Inside NexEra

**True text-to-3D generation** — replace the curated model library with
Meshy.ai or Shap-E API calls that generate actual 3D models from text,
giving educators the ability to create any training object on demand.

**Expanded animation library** — map 50+ Mixamo animations to a semantic
taxonomy of workplace actions (safety demonstrations, equipment usage,
emergency procedures) so the avatar can simulate full training scenarios.

**Voice command input** — add Web Speech API so learners on job sites
can control the avatar hands-free using voice, making the tool accessible
in environments where typing is impractical.

**Multi-avatar scenes** — render multiple avatars simultaneously to
simulate team dynamics, supervisor-trainee interactions, and group
safety drills.

**NexEra LMS integration** — expose the pipeline as a REST API so
NexEra's existing training module system can call it to auto-generate
3D content for any new training module created by an educator.

**Analytics layer** — track which objects and commands learners interact
with most to give educators data on which training content is most
engaging and effective.