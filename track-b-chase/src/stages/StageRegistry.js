/**
 * StageRegistry - 4 Unlockable Stages × 3 Long Levels (12 Levels total).
 */
export const STAGE_CONFIGS = [
  {
    stageNumber: 1,
    name: 'Sunlit Fern Valley',
    theme: 'ferns',
    skyColors: ['#38bdf8', '#bae6fd'],
    distantMountains: '#93c5fd',
    groundColor: '#15803d',
    obstacleTypes: ['boulder', 'fallenLog'],
    malletIntervalRange: [1.8, 2.2],
    levels: [
      { id: '1-1', name: 'Valley Run', length: 3000, targetBerries: 25 },
      { id: '1-2', name: 'Fern Canopy', length: 4200, targetBerries: 35 },
      { id: '1-3', name: 'Raptor Ridge', length: 5500, targetBerries: 50 }
    ]
  },
  {
    stageNumber: 2,
    name: 'Geyser & Mud Basin',
    theme: 'mud',
    skyColors: ['#fbbf24', '#fef3c7'],
    distantMountains: '#d97706',
    groundColor: '#78350f',
    obstacleTypes: ['geyserSpout', 'mudPit'],
    malletIntervalRange: [1.6, 2.0],
    unlockBerries: 150,
    levels: [
      { id: '2-1', name: 'Bubbling Flats', length: 3500, targetBerries: 30 },
      { id: '2-2', name: 'Steam Vents', length: 4800, targetBerries: 45 },
      { id: '2-3', name: 'Quicksand Marsh', length: 6000, targetBerries: 60 }
    ]
  },
  {
    stageNumber: 3,
    name: 'Ember Volcano Canyon',
    theme: 'volcano',
    skyColors: ['#f97316', '#ffedd5'],
    distantMountains: '#7f1d1d',
    groundColor: '#450a0a',
    obstacleTypes: ['lavaFissure', 'fallingCinder'],
    malletIntervalRange: [1.4, 1.8],
    unlockBerries: 300,
    levels: [
      { id: '3-1', name: 'Basalt Ridge', length: 4000, targetBerries: 40 },
      { id: '3-2', name: 'Cinder Pass', length: 5200, targetBerries: 55 },
      { id: '3-3', name: 'Lava Gorge', length: 6800, targetBerries: 75 }
    ]
  },
  {
    stageNumber: 4,
    name: 'Prehistoric Caldera Gauntlet',
    theme: 'caldera',
    skyColors: ['#881337', '#4c0519'],
    distantMountains: '#292524',
    groundColor: '#1c1917',
    obstacleTypes: ['magmaPillar', 'shockSpike'],
    malletIntervalRange: [1.2, 1.5],
    unlockBerries: 500,
    levels: [
      { id: '4-1', name: 'Obsidian Run', length: 4500, targetBerries: 50 },
      { id: '4-2', name: 'Ash Storm', length: 6000, targetBerries: 70 },
      { id: '4-3', name: 'The Final Escape', length: 8000, targetBerries: 100 }
    ]
  }
];
