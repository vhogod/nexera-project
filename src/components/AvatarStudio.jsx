import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const AI_KEY = import.meta.env.VITE_OPENROUTER_KEY

const ANIMATIONS = {
  idle:   { file: '/animations/tpose.glb',     label: 'T-Pose / Idle' },
  wave:   { file: '/animations/wave.glb',      label: 'Wave' },
  walk:   { file: '/animations/walking.glb',   label: 'Walk' },
  point:  { file: '/animations/pointing.glb',  label: 'Point' },
  safety: { file: '/animations/tpose.glb',     label: 'Safety Posture' },
}

async function askAI(systemPrompt, userPrompt) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
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

export default function AvatarStudio() {
  const mountRef = useRef()
  const sceneRef = useRef({})
  const mixerRef = useRef(null)
  const avatarRef = useRef(null)

  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('')
  const [explanation, setExplanation] = useState('')
  const [currentAnim, setCurrentAnim] = useState('idle')
  const [loading, setLoading] = useState(false)

  // Hide bone mismatch warnings permanently
  useEffect(() => {
    const originalWarn = console.warn
    console.warn = (msg, ...args) => {
      if (typeof msg === 'string' && msg.includes('No target node found for track')) return
      originalWarn(msg, ...args)
    }
    return () => { console.warn = originalWarn }
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
    camera.position.set(0, 1.5, 4)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const dir = new THREE.DirectionalLight(0xffffff, 1.2)
    dir.position.set(5, 10, 7)
    dir.castShadow = true
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x8080ff, 0.3)
    fill.position.set(-5, 0, -5)
    scene.add(fill)

    scene.add(new THREE.GridHelper(10, 20, 0x1e1e3a, 0x1e1e3a))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1, 0)
    controls.update()

    sceneRef.current = { renderer, scene, camera, controls }

    const timer = new THREE.Timer()

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      timer.update()
      const delta = timer.getDelta()
      if (mixerRef.current) mixerRef.current.update(delta)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Load base avatar model once
    loadBaseAvatar()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  const loadBaseAvatar = () => {
    const loader = new GLTFLoader()
    loader.load('/animations/tpose.glb', (gltf) => {
      const model = gltf.scene
      avatarRef.current = model

      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const scale = 2 / size.y
      model.scale.setScalar(scale)
      model.position.y -= box.min.y * scale

      sceneRef.current.scene.add(model)

      const mixer = new THREE.AnimationMixer(model)
      mixerRef.current = mixer

      // Play initial idle
      if (gltf.animations?.length > 0) {
        const action = mixer.clipAction(gltf.animations[0])
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play()
      }
    })
  }

  const playAnimation = (animKey) => {
    const anim = ANIMATIONS[animKey]
    if (!anim || !avatarRef.current) return

    const loader = new GLTFLoader()
    loader.load(anim.file, (gltf) => {
      if (!gltf.animations || gltf.animations.length === 0) return

      const mixer = mixerRef.current
      mixer.stopAllAction()

      const clip = gltf.animations[0]
      const action = mixer.clipAction(clip)
      action.reset()
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.play()

      setCurrentAnim(animKey)
    })
  }

  const handleCommand = async () => {
    if (!command.trim() || loading) return
    setLoading(true)
    setStatus('loading')
    setExplanation('')

    try {
      const response = await askAI(
        `You are an AI avatar controller for a workplace safety training platform.
Map user commands to animations. Respond with ONLY a JSON object (no markdown, no backticks):
{
  "animation": "<one of: idle, wave, walk, point, safety>",
  "explanation": "<1-2 sentence explanation of what the avatar is doing and why it matters for workplace safety training>"
}`,
        `User command: "${command}"

Animation options:
- idle: standing still, resting, waiting, default pose
- wave: waving hello, greeting, saying hi, welcoming
- walk: walking, moving, going somewhere, approaching
- point: pointing at something, indicating, directing attention
- safety: showing safety posture, correct stance, safety demonstration`
      )

      let parsed
      try {
        const clean = response.replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        parsed = { animation: 'idle', explanation: 'Playing default idle animation.' }
      }

      playAnimation(parsed.animation)
      setExplanation(parsed.explanation)
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }

    setLoading(false)
  }

  const quickCommands = [
    { label: '👋 Wave hello', cmd: 'Wave hello to the learner' },
    { label: '🚶 Walk forward', cmd: 'Walk to the table' },
    { label: '☝️ Point at hazard', cmd: 'Point at the fire extinguisher' },
    { label: '🦺 Safety posture', cmd: 'Show the correct safety posture' },
    { label: '💤 Stand idle', cmd: 'Stand still and wait' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', flex: 1 }}>
      <aside className="sidebar">
        <div>
          <div className="label">Give avatar a command</div>
          <input
            className="search-input"
            placeholder='e.g. "Wave hello to the learner"'
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCommand()}
          />
        </div>

        <button
          className="search-btn"
          onClick={handleCommand}
          disabled={!command.trim() || loading}
        >
          {loading ? 'Processing...' : '🤖 Send Command'}
        </button>

        {status && (
          <div className={`status ${status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'success'}`}>
            {status === 'loading' && '⏳ Interpreting command...'}
            {status === 'error' && '❌ Something went wrong. Wait 30s and try again.'}
            {status === 'success' && `✅ Playing: ${ANIMATIONS[currentAnim]?.label}`}
          </div>
        )}

        <div>
          <div className="label">Quick commands</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quickCommands.map((q, i) => (
              <div key={i} className="model-card" onClick={() => setCommand(q.cmd)}>
                {q.label}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Current animation</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(ANIMATIONS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => playAnimation(key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid',
                  borderColor: currentAnim === key ? '#4f46e5' : '#2a2a4a',
                  background: currentAnim === key ? '#1a1a3a' : '#13132a',
                  color: currentAnim === key ? '#a78bfa' : '#6b6b99',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hint">Drag to rotate · Scroll to zoom</div>
      </aside>

      <div className="viewer-area">
        <div className="canvas-wrap">
          <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="summary-box">
          <h3>AI Explanation</h3>
          <p>{explanation || 'Send a command to see what the avatar does and why it matters for safety training.'}</p>
        </div>
      </div>
    </div>
  )
}