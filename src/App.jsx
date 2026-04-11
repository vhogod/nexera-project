import { useState } from 'react'
import './App.css'
import SearchPanel from './components/SearchPanel'
import ModelViewer from './components/ModelViewer'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

const MODEL_LIBRARY = [
  {
    name: 'Hard Hat',
    keywords: ['hard hat', 'helmet', 'safety hat', 'construction helmet'],
    url: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    attribution: 'Google'
  },
  {
    name: 'Fire Extinguisher',
    keywords: ['fire extinguisher', 'extinguisher', 'fire safety'],
    url: 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb',
    attribution: 'Google'
  },
  {
    name: 'Hammer',
    keywords: ['hammer', 'tool', 'mallet', 'nail'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/ToyCar/glTF-Binary/ToyCar.glb',
    attribution: 'Khronos'
  },
  {
    name: 'Screwdriver',
    keywords: ['screwdriver', 'tool', 'screw'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb',
    attribution: 'Khronos'
  },
  {
    name: 'Wrench',
    keywords: ['wrench', 'spanner', 'tool', 'bolt'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb',
    attribution: 'Khronos'
  },
  {
    name: 'Laptop',
    keywords: ['laptop', 'computer', 'pc', 'notebook'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb',
    attribution: 'Khronos'
  },
  {
    name: 'Chair',
    keywords: ['chair', 'seat', 'furniture', 'office chair'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb',
    attribution: 'Khronos'
  },
  {
    name: 'Trash Can',
    keywords: ['bin', 'trash', 'garbage', 'waste', 'rubbish'],
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
    attribution: 'Khronos'
  },
]

async function askGemini(systemPrompt, userPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }]
      })
    }
  )
  const data = await res.json()
  console.log('Gemini response:', JSON.stringify(data))
  return data.candidates[0].content.parts[0].text
}

function findBestModel(keyword) {
  const kw = keyword.toLowerCase()
  for (const model of MODEL_LIBRARY) {
    if (model.keywords.some(k => kw.includes(k) || k.includes(kw))) {
      return model
    }
  }
  for (const model of MODEL_LIBRARY) {
    if (model.name.toLowerCase().includes(kw) || kw.includes(model.name.toLowerCase())) {
      return model
    }
  }
  return null
}

export default function App() {
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
      const matchResponse = await askGemini(
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

      const summaryText = await askGemini(
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
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

      const mediaType = file.type

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mediaType,
                    data: base64
                  }
                },
                {
                  text: `Identify the main object in this image. Respond with ONLY a JSON object (no markdown, no backticks):
{"keyword": "<single best keyword from: hard hat, fire extinguisher, hammer, screwdriver, wrench, laptop, chair, trash can>", "objectName": "<clean name>", "category": "<category>"}`
                }
              ]
            }]
          })
        }
      )

      const data = await res.json()
      console.log('Gemini image response:', JSON.stringify(data))

      let parsed
      try {
        const text = data.candidates[0].content.parts[0].text.trim()
        const clean = text.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        parsed = { keyword: 'hard hat', objectName: 'Object', category: 'equipment' }
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

      const summaryText = await askGemini(
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
        <h1>NexEra 3D Training Studio</h1>
        <span>— AI-Powered Asset Pipeline</span>
      </header>

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
    </div>
  )
}