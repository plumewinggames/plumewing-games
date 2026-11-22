# PlumeWing Games & Amazonia Growth Studio

Official modular multi-game portfolio and brand growth engine deployed on Netlify.

---

## 🌐 Live Production URL (Play Anywhere on Mobile)

* **Portfolio Hub:** [https://plumewing-games.netlify.app](https://plumewing-games.netlify.app)
* **Track A (3D Flight — 10 Worlds):** [https://plumewing-games.netlify.app/track-a-flight/](https://plumewing-games.netlify.app/track-a-flight/)
* **Track B (2.5D Caveman Chase):** [https://plumewing-games.netlify.app/track-b-chase/](https://plumewing-games.netlify.app/track-b-chase/)

---

## 🎮 Game Studio Architecture

* **Track A: 3D Forward Flight (Three.js WebGL)**
  * Procedural forward flight, bloom post-processing, frame-crossing linear interpolation collision.
  * 10 Swappable Arenas: Manta Ray (Flagship), Nano Drift, Dust Mote, Market Glider, Gorge Rush, Micro Flight, Zone Survey, Tide Bloom, Seahorse, The Void.
* **Track B: 2.5D Slapstick Action-Chase (HTML5 Canvas 60 FPS)**
  * 6-layer parallax depth stack across 3 depth lanes.
  * Relentless Caveman AI with 1.4s–2.0s stone mallet rhythm, camera trauma shake, and expanding 2.5D shockwaves.
  * 6 Prehistoric Animals across 4 unlockable stages × 3 levels (12 levels total).
* **Universal $0 Services (`core/`):**
  * `SynthAudio.js`: Zero-dependency procedural Web Audio API sound synthesizer.
  * `EconomyManager.js`: LocalStorage progression and currency management.
  * `AdManager.js`: Unified ad provider abstraction (Mock, Poki, CrazyGames, AdMob).
  * `CrossPromoModal.js`: Zero-CAC portfolio traffic recycling.

---

## 🌿 Amazonia Digital Marketing Agency (`amazonia-agency/`)

Dedicated 4-agent marketing and content generation agency for **Amazonia** and its hero Brazilian hair protein treatment: **Prohall Select One**.

* **Operations Guide:** `amazonia-agency/AGENTS.md`
* **Brand & Product Dossier:** `amazonia-agency/brand_brief.md`
* **Wave 1 Launch Campaign:** `amazonia-agency/campaigns/wave1_launch.md`
  * 5 High-converting viral TikTok & Reels scripts with 3-second visual hooks.
  * 3 Authority educational Instagram carousels.
  * 10 Photorealistic generative AI visual prompts (Midjourney / Imagen 3 / Flux).
