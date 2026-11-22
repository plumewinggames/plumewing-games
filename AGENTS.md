# AI Multi-Agent Studio Operations Guide

Welcome to the **Modular Multi-Game Portfolio** workspace. This repository is architected for zero-CAC, zero-upfront-burn game development powered by specialized AI agent roles.

---

## 1. Multi-Agent Development Pipeline

| Role | Antigravity Subagent Model | Swarm / Chat Selector Model | Focus & Ownership | Primary Files |
| :--- | :--- | :--- | :--- | :--- |
| **1. The Architect** | `Model: "pro"` | Gemini 3.8 Flash (High) / Claude Sonnet 4.6 | Core engine blueprints, immutable physics, rendering pipelines, $0 procedural geometry, camera trauma math. | `track-a-flight/src/FlightEngine.js`<br>`track-b-chase/src/ChaseEngine.js` |
| **2. The World-Builder** | `Model: "pro"` | Gemini 3.8 Flash (High) | Rapidly authoring swap-in JSON/JS arena and stage configs without touching core loops. | `track-a-flight/src/arenas/ArenaRegistry.js`<br>`track-b-chase/src/stages/StageRegistry.js` |
| **3. The QA Critic** | `Model: "pro"` | Gemini 3.8 Flash (High) | Auditing hitboxes, frame-crossing linear interpolation, WebGL memory leaks (`clearWorld`), mobile touch listeners, delta-time clamping. | `tests/`, Performance profiler, GPU disposal checks |
| **4. The Monetization Specialist** | `Model: "pro"` | Gemini 3.8 Flash (High) | Standardized ad callbacks, rewarded revives, currency persistence, and zero-CAC cross-promotional linking. | `core/ads/AdManager.js`<br>`core/economy/EconomyManager.js`<br>`core/crossPromo/CrossPromoModal.js` |

---

## 2. Directory Structure

```
Antigravity project - 1/
├── index.html                   # Global Portfolio Hub & Cross-Promo Showcase
├── vite.config.js               # Multi-page Vite configuration (Track A & Track B)
├── package.json                 # Three.js & Vite build scripts
├── AGENTS.md                    # This operational guide
│
├── core/                        # Universal Zero-Cost Services
│   ├── audio/
│   │   └── SynthAudio.js        # Procedural Web Audio API synthesizer (0 MP3/WAV assets)
│   ├── economy/
│   │   └── EconomyManager.js    # LocalStorage persistence (Pearls, Berries, Unlocks)
│   ├── ads/
│   │   └── AdManager.js         # Unified Ad abstraction (Web Mock, Poki, CrazyGames, AdMob)
│   └── crossPromo/
│       └── CrossPromoModal.js   # Zero-CAC traffic recycling modal and banners
│
├── track-a-flight/              # Track A: Unified 3D Flight Portfolio (Three.js WebGL)
│   ├── index.html               # 3D Flight launcher & HUD
│   └── src/
│       ├── FlightEngine.js      # Immutable 3D forward-flight loop with bloom & interpolation
│       └── arenas/
│           └── ArenaRegistry.js # 10 Swappable Arenas (Manta Ray Flagship, Nano Drift, etc.)
│
└── track-b-chase/               # Track B: 2.5D Slapstick Action-Chase (HTML5 Canvas 60 FPS)
    ├── index.html               # 2.5D Chase launcher, lane controls & HUD
    └── src/
        ├── ChaseEngine.js       # 60 FPS Canvas loop, 6-layer parallax, 3 lanes, Caveman AI
        ├── animals/
        │   └── AnimalRegistry.js# 6 Playable Prehistoric Animals (Dodo, Mammoth, etc.)
        └── stages/
            └── StageRegistry.js # 4 Unlockable Stages × 3 Levels (12 Levels total)
```

---

## 3. Mandatory Engineering Guardrails

1. **Frame-Interpolated Gate Crossing:**
   Never use static 3D sphere distance checks for high-speed flight. Always compute linear intersection parameter $t = \frac{z_{gate} - z_{prev}}{z_{curr} - z_{prev}}$ when $z_{prev} < z_{gate} \le z_{curr}$.
2. **InstancedMesh Transformation Safety:**
   Always update `instancedMesh.instanceMatrix.needsUpdate = true` after batching transformations into `dummy.matrix`.
3. **Strict GPU Memory Teardown:**
   Every arena switch must invoke `clearWorld()` to traverse and explicitly `.dispose()` of geometries, materials, and textures before removing objects from the scene.
4. **Mobile Touch & Delta Clamping:**
   Enforce `touch-action: none;` and `{ passive: false }` event listeners. Clamp all frame delta times to $\Delta t \le 0.05\text{s}$ to avoid physics tunneling after app pause.
5. **No Pay-Per-Session Map APIs:**
   Google Maps 3D Tiles are strictly banned due to the \$6.00/1,000 session trap. Use procedural Three.js math, OSM Buildings, or pre-baked .glb heightmaps.

---

## 4. Local Testing & Mobile Follow-Up

Run the dev server:
```bash
npm run dev
```
* **Desktop Browser:** `http://localhost:5173/`
* **Mobile Playtesting:** Connect phone to same Wi-Fi and open `http://<YOUR_LAN_IP>:5173/`
