/**
 * DiverRegistry - 3 Asymmetric Playable Divers with Unique Tricks and Natural Enemies.
 */
export const DIVER_CONFIGS = {
  maya: {
    id: 'maya',
    name: 'Coral Scout Maya',
    title: 'Speed & Agility',
    color: '#06b6d4',
    suitAccent: '#38bdf8',
    visorColor: '#67e8f9',
    abilityName: 'Hydro-Dash',
    abilityDescription: 'Burst dash forward at 2.5x speed, evading attacks and leaving a wake of bubbles.',
    cooldown: 3.5, // seconds
    maxHearts: 3,
    baseSpeed: 5.5,
    airCapacity: 100,
    airDrainRate: 2.2,
    naturalEnemy: 'barracuda',
    naturalEnemyName: 'Swift Barracudas',
    naturalEnemyWarning: 'Barracudas strike with sudden linear bursts—time your Hydro-Dash to dodge!',
    unlockedByDefault: true,
    prizeMultiplier: 1.0
  },

  jax: {
    id: 'jax',
    name: 'Deep Aegis Jax',
    title: 'Heavy Defense & Shielding',
    color: '#3b82f6',
    suitAccent: '#1d4ed8',
    visorColor: '#93c5fd',
    abilityName: 'Kinetic Bubble-Shield',
    abilityDescription: 'Deploy a protective kinetic energy bubble that repels enemies and absorbs damage.',
    cooldown: 5.0,
    maxHearts: 4,
    baseSpeed: 4.4,
    airCapacity: 120,
    airDrainRate: 2.6,
    naturalEnemy: 'puffer',
    naturalEnemyName: 'Spiny Pufferfish',
    naturalEnemyWarning: 'Pufferfish inflate with toxic spines—activate Bubble-Shield to bounce them off!',
    unlockedByDefault: true,
    prizeMultiplier: 1.25
  },

  soren: {
    id: 'soren',
    name: 'Dr. Soren (Bio-Acoustic)',
    title: 'Sonic Stun & Crowd Control',
    color: '#10b981',
    suitAccent: '#047857',
    visorColor: '#6ee7b7',
    abilityName: 'Sonic Pulse Ring',
    abilityDescription: 'Emit a 360-degree acoustic shockwave that stuns predators and reveals hidden prize oysters.',
    cooldown: 4.5,
    maxHearts: 3,
    baseSpeed: 4.8,
    airCapacity: 110,
    airDrainRate: 2.4,
    naturalEnemy: 'eel',
    naturalEnemyName: 'Electric Moray Eels',
    naturalEnemyWarning: 'Electric Eels unleash shocking arcs—use Sonic Pulse to interrupt their charge!',
    unlockedByDefault: true,
    prizeMultiplier: 1.5
  }
};
