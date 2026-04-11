import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

export default function ModelViewer({ modelUrl }) {
  const mountRef = useRef()
  const sceneRef = useRef({})

  useEffect(() => {
    const mount = mountRef.current
    const w = mount.clientWidth
    const h = mount.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000)
    camera.position.set(0, 1.5, 4)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 10, 7)
    dirLight.castShadow = true
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.4)
    fillLight.position.set(-5, 0, -5)
    scene.add(fillLight)

    // Grid
    const grid = new THREE.GridHelper(10, 20, 0x1e1e3a, 0x1e1e3a)
    scene.add(grid)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 0.5
    controls.maxDistance = 20

    sceneRef.current = { renderer, scene, camera, controls }

    // Animation loop
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  // Load model when URL changes
  useEffect(() => {
    if (!modelUrl) return
    const { scene, camera, controls } = sceneRef.current

    // Remove old models
    const toRemove = []
    scene.traverse(obj => {
      if (obj.userData.isModel) toRemove.push(obj)
    })
    toRemove.forEach(obj => scene.remove(obj))

    const loader = new GLTFLoader()
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    loader.setDRACOLoader(dracoLoader)

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene
        model.userData.isModel = true

        // Auto-center and scale
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        model.scale.setScalar(scale)
        model.position.sub(center.multiplyScalar(scale))

        // Lift to sit on grid
        const box2 = new THREE.Box3().setFromObject(model)
        model.position.y -= box2.min.y

        scene.add(model)

        // Focus camera
        const newBox = new THREE.Box3().setFromObject(model)
        const newCenter = newBox.getCenter(new THREE.Vector3())
        controls.target.copy(newCenter)
        camera.position.set(newCenter.x, newCenter.y + 1.5, newCenter.z + 4)
        controls.update()
      },
      undefined,
      (err) => console.error('Model load error:', err)
    )
  }, [modelUrl])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}