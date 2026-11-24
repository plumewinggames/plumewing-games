/**
 * ReefRegistry - 5 Unlockable Reef Environments & Difficulty Configurations.
 */
export const DIFFICULTY_CONFIGS = {
  casual: {
    id: 'casual',
    name: 'Reef Explorer (Casual)',
    heartBonus: 1,
    airDrainMult: 0.7,
    predatorSpeedMult: 0.75,
    prizeMult: 1.0,
    badgeColor: '#22c55e'
  },
  standard: {
    id: 'standard',
    name: 'Ocean Warden (Standard)',
    heartBonus: 0,
    airDrainMult: 1.0,
    predatorSpeedMult: 1.0,
    prizeMult: 1.5,
    badgeColor: '#38bdf8'
  },
  hardcore: {
    id: 'hardcore',
    name: 'Abyssal Veteran (Hardcore)',
    heartBonus: -1,
    airDrainMult: 1.35,
    predatorSpeedMult: 1.3,
    prizeMult: 2.5,
    badgeColor: '#ef4444'
  }
};

export const REEF_CONFIGS = [
  {
    reefNumber: 1,
    name: 'Sunlit Coral Shallows',
    depth: '10m',
    targetScore: 2500,
    targetPearls: 15,
    targetShells: 25,
    ambientLight: 'rgba(6, 182, 212, 0.25)',
    waterTop: '#0891b2',
    waterBottom: '#0e7490',
    causticColor: 'rgba(165, 243, 252, 0.35)',
    corals: ['#f43f5e', '#fb923c', '#e879f9', '#22c55e'],
    predators: ['puffer', 'barracuda'],
    fishTypes: ['clownfish', 'tang'],
    predatorSpawnInterval: 3.2, // seconds
    hasGodRays: true,
    godRayOpacity: 0.4
  },
  {
    reefNumber: 2,
    name: 'Kelp Forest Canopy',
    depth: '35m',
    targetScore: 4000,
    targetPearls: 25,
    targetShells: 40,
    ambientLight: 'rgba(5, 150, 105, 0.25)',
    waterTop: '#047857',
    waterBottom: '#064e3b',
    causticColor: 'rgba(110, 231, 183, 0.3)',
    corals: ['#10b981', '#34d399', '#fde047', '#059669'],
    predators: ['eel', 'puffer'],
    fishTypes: ['tang', 'angelfish'],
    predatorSpawnInterval: 2.8,
    hasGodRays: true,
    godRayOpacity: 0.25
  },
  {
    reefNumber: 3,
    name: 'Sunken Galleon Trench',
    depth: '75m',
    targetScore: 6000,
    targetPearls: 40,
    targetShells: 60,
    ambientLight: 'rgba(30, 58, 138, 0.35)',
    waterTop: '#1e3a8a',
    waterBottom: '#172554',
    causticColor: 'rgba(147, 197, 253, 0.2)',
    corals: ['#60a5fa', '#3b82f6', '#93c5fd', '#1d4ed8'],
    predators: ['barracuda', 'eel', 'shark'],
    fishTypes: ['angelfish', 'ghostGlow'],
    predatorSpawnInterval: 2.3,
    hasShipwreckDebris: true,
    hasGodRays: false
  },
  {
    reefNumber: 4,
    name: 'Volcanic Hydrothermal Vents',
    depth: '130m',
    targetScore: 8500,
    targetPearls: 60,
    targetShells: 85,
    ambientLight: 'rgba(127, 29, 29, 0.35)',
    waterTop: '#7f1d1d',
    waterBottom: '#450a0a',
    causticColor: 'rgba(251, 146, 60, 0.25)',
    corals: ['#f97316', '#ef4444', '#dc2626', '#b91c1c'],
    predators: ['eel', 'shark', 'spinyLionfish'],
    fishTypes: ['ghostGlow', 'lavaCrab'],
    predatorSpawnInterval: 1.9,
    hasHeatVents: true,
    hasGodRays: false
  },
  {
    reefNumber: 5,
    name: 'The Abyssal Mariana Trench',
    depth: '250m',
    targetScore: 12000,
    targetPearls: 100,
    targetShells: 150,
    ambientLight: 'rgba(10, 5, 20, 0.65)',
    waterTop: '#0f172a',
    waterBottom: '#020617',
    causticColor: 'rgba(192, 132, 252, 0.15)',
    corals: ['#a855f7', '#c084fc', '#e879f9', '#7e22ce'],
    predators: ['shark', 'anglerBoss', 'giantPuffer'],
    fishTypes: ['biolumSquid', 'anglerMinion'],
    predatorSpawnInterval: 1.5,
    isApexEncounter: true,
    hasGodRays: false
  }
];
