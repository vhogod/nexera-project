import { useState, useRef } from 'react'

const POLY_PIZZA_MODELS = {
  'hard hat': { name: 'Hard Hat', url: 'https://poly.pizza/m/bX9DFHLp8P' },
  'fire extinguisher': { name: 'Fire Extinguisher', url: 'https://poly.pizza/m/2VWNDe6Fxv' },
  'wrench': { name: 'Wrench', url: null },
  'hammer': { name: 'Hammer', url: null },
  'default': { name: 'Hard Hat', url: null }
}

export default function SearchPanel({ onSearch, onImageUpload, status, models, onSelectModel, selectedModel }) {
  const [query, setQuery] = useState('')
  const fileRef = useRef()

  const handleSearch = () => {
    if (query.trim()) onSearch(query.trim())
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (file) onImageUpload(file)
  }

  return (
    <>
      <div>
        <div className="label">Describe an object</div>
        <input
          className="search-input"
          placeholder='e.g. "yellow hard hat"'
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
      </div>

      <button
        className="search-btn"
        onClick={handleSearch}
        disabled={!query.trim() || status === 'loading'}
      >
        {status === 'loading' ? 'Generating...' : '⚡ Generate 3D Model'}
      </button>

      <div className="divider">or</div>

      <div>
        <div className="label">Upload an image</div>
        <div className="upload-zone" onClick={() => fileRef.current.click()}>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📷</div>
          Click to upload image
          <div style={{ marginTop: 4, fontSize: '0.75rem' }}>PNG, JPG, WEBP</div>
        </div>
      </div>

      {status && (
        <div className={`status ${status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}`}>
          {status === 'loading' && '⏳ Finding best 3D model...'}
          {status === 'error' && '❌ Something went wrong. Try again.'}
          {status === 'success' && '✅ Model loaded!'}
        </div>
      )}

      {models.length > 0 && (
        <div>
          <div className="label">Available models</div>
          <div className="model-results">
            {models.map((m, i) => (
              <div
                key={i}
                className={`model-card ${selectedModel?.name === m.name ? 'active' : ''}`}
                onClick={() => onSelectModel(m)}
              >
                📦 {m.name}
                {m.attribution && <span style={{ color: '#4a4a6a', marginLeft: 8, fontSize: '0.75rem' }}>by {m.attribution}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hint">Drag to rotate · Scroll to zoom · Right-click to pan</div>
    </>
  )
}