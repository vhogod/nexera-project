import { useState } from 'react'
import './App.css'
import SearchPanel from './components/SearchPanel'
import ModelViewer from './components/ModelViewer'
import AvatarStudio from './components/AvatarStudio'

const AI_KEY = import.meta.env.VITE_OPENROUTER_KEY

const MODEL_LIBRARY = [
  { name: 'Hard Hat', keywords: ['hard hat', 'helmet', 'safety hat', 'construction helmet'], url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', attribution: 'Google' },
  { name: 'Fire Extinguisher', keywords: ['fire extinguisher', 'extinguisher', 'fire safety'], url: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb', attribution: 'Google' },
  { name: 'Hammer', keywords: ['hammer', 'tool', 'mallet', 'nail'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ToyCar/glTF-Binary/ToyCar.glb', attribution: 'Khronos' },
  { name: 'Screwdriver', keywords: ['screwdriver', 'tool', 'screw'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb', attribution: 'Khronos' },
  { name: 'Wrench', keywords: ['wrench', 'spanner', 'tool', 'bolt'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb', attribution: 'Khronos' },
  { name: 'Laptop', keywords: ['laptop', 'computer', 'pc', 'notebook'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb', attribution: 'Khronos' },
  { name: 'Chair', keywords: ['chair', 'seat', 'furniture', 'office chair'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb', attribution: 'Khronos' },
  { name: 'Trash Can', keywords: ['bin', 'trash', 'garbage', 'waste', 'rubbish'], url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/WaterBottle/glTF-Binary/WaterBottle.glb', attribution: 'Khronos' },
]

async function askAI(systemPrompt, userPrompt, imageBase64 = null) {
  try {
    const messages = [{ role: 'system', content: systemPrompt }]

    if (imageBase64) {
      // Vision model for image upload
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      })
    } else {
      messages.push({ role: 'user', content: userPrompt })
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: imageBase64 
          ? 'google/gemini-2.0-flash-exp:free' 
          : 'openrouter/free',
        messages
      })
    })

    const data = await res.json()

    if (data.error) {
      console.error('OpenRouter API error:', data.error)
      if (data.error.code === 429) {
        throw new Error('⏳ Rate limit reached. Please wait 30–60 seconds and try again.')
      }
      throw new Error(data.error.message || 'AI request failed')
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from AI')
    }

    console.log('AI response:', data.choices[0].message.content)
    return data.choices[0].message.content
  } catch (err) {
    console.error('askAI error:', err)
    throw err
  }
}

function findBestModel(keyword) {
  const kw = keyword.toLowerCase()
  for (const model of MODEL_LIBRARY) {
    if (model.keywords.some(k => kw.includes(k) || k.includes(kw))) return model
  }
  for (const model of MODEL_LIBRARY) {
    if (model.name.toLowerCase().includes(kw) || kw.includes(model.name.toLowerCase())) return model
  }
  return null
}

export default function App() {
  const [activePage, setActivePage] = useState('test1')
  const [status, setStatus] = useState('')
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [summary, setSummary] = useState('')
  const [modelUrl, setModelUrl] = useState(null)

  const handleSearch = async (query) => {
    setStatus('loading')
    setSummary('')
    setModels([])

    try {
      const matchResponse = await askAI(
        `You are a 3D asset selection assistant for a workplace safety training platform.
Given a user's description, respond with ONLY a JSON object (no markdown, no backticks, no explanation):
{
  "keyword": "<single best keyword matching one of: hard hat, fire extinguisher, hammer, screwdriver, wrench, laptop, chair, trash can>",
  "objectName": "<clean display name>",
  "category": "<safety equipment | tools | furniture | electronics>"
}`,
        `User described: "${query}"`
      )

      let parsed
      try {
        const clean = matchResponse.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        parsed = { keyword: query, objectName: query, category: 'tools' }
      }

      const matched = findBestModel(parsed.keyword)
      const modelList = matched
        ? [matched, ...MODEL_LIBRARY.filter(m => m !== matched).slice(0, 3)]
        : MODEL_LIBRARY.slice(0, 4)

      setModels(modelList)

      if (matched) {
        setSelectedModel(matched)
        setModelUrl(matched.url)
      }

      const summaryText = await askAI(
        `You are an educational AI for workplace safety training. Write concise, useful summaries.`,
        `Write a 2-3 sentence educational summary about "${parsed.objectName}" for a workplace safety training module.
Include: what it is, its primary use, and one key safety fact. Be clear and professional.`
      )

      setSummary(summaryText)
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const handleImageUpload = async (file) => {
    setStatus('loading')
    setSummary('')
    setModels([])

    try {
      // Convert image to base64 for vision model
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const identifyText = await askAI(
        'You are an object identification AI for workplace safety training. Respond only with JSON.',
        `Identify this workplace safety object from the image and respond with ONLY a JSON object (no markdown, no backticks):
{"keyword": "<one of: hard hat, fire extinguisher, hammer, screwdriver, wrench, laptop, chair, trash can>", "objectName": "<clean name>", "category": "<category>"}`,
        base64
      )

      let parsed
      try {
        const clean = identifyText.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        parsed = { keyword: 'hard hat', objectName: 'Safety Equipment', category: 'equipment' }
      }

      const matched = findBestModel(parsed.keyword)
      const modelList = matched
        ? [matched, ...MODEL_LIBRARY.filter(m => m !== matched).slice(0, 3)]
        : MODEL_LIBRARY.slice(0, 4)

      setModels(modelList)

      if (matched) {
        setSelectedModel(matched)
        setModelUrl(matched.url)
      }

      const summaryText = await askAI(
        `You are an educational AI for workplace safety training.`,
        `Write a 2-3 sentence educational summary about "${parsed.objectName}" for a training module. Include what it is, its use, and a safety tip.`
      )

      setSummary(summaryText)
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const handleSelectModel = (model) => {
    setSelectedModel(model)
    setModelUrl(model.url)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">N</div>
        <h1>NexEra AI Training Studio</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActivePage('test1')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: activePage === 'test1' ? '#4f46e5' : '#2a2a4a',
              background: activePage === 'test1' ? '#1a1a3a' : 'transparent',
              color: activePage === 'test1' ? '#a78bfa' : '#6b6b99',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            📦 3D Asset Pipeline
          </button>
          <button
            onClick={() => setActivePage('test2')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: activePage === 'test2' ? '#4f46e5' : '#2a2a4a',
              background: activePage === 'test2' ? '#1a1a3a' : 'transparent',
              color: activePage === 'test2' ? '#a78bfa' : '#6b6b99',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            🤖 Avatar Studio
          </button>
        </div>
      </header>

      {activePage === 'test1' && (
        <div className="main">
          <aside className="sidebar">
            <SearchPanel
              onSearch={handleSearch}
              onImageUpload={handleImageUpload}
              status={status}
              models={models}
              onSelectModel={handleSelectModel}
              selectedModel={selectedModel}
            />
          </aside>
          <div className="viewer-area">
            <div className="canvas-wrap">
              {!modelUrl && (
                <div className="placeholder-msg">
                  <div className="icon">📦</div>
                  <p>Search or upload to load a 3D model</p>
                </div>
              )}
              {modelUrl && <ModelViewer modelUrl={modelUrl} key={modelUrl} />}
            </div>
            <div className="summary-box">
              <h3>AI Educational Summary</h3>
              <p>{summary || 'Your AI-generated training summary will appear here after loading a model.'}</p>
            </div>
          </div>
        </div>
      )}

      {activePage === 'test2' && (
        <div className="main">
          <AvatarStudio />
        </div>
      )}
    </div>
  )
}