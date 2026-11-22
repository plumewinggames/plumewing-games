/**
 * AnimalRegistry - Isolated configuration registry for all 6 prehistoric playable animals.
 */
export const ANIMAL_CONFIGS = {
  dodo: {
    id: 'dodo',
    name: 'Timid Dodo',
    color: '#38bdf8',
    bellyColor: '#e0f2fe',
    beakColor: '#f59e0b',
    abilityName: 'Flutter-Glide',
    description: 'Hold jump in mid-air to flap wings and slow falling descent.',
    speed: 5.5,
    jumpForce: -13,
    gravity: 0.55,
    glideFactor: 0.28,
    hearts: 3,
    unlockedByDefault: true,
    berryCost: 0
  },

  mammoth: {
    id: 'mammoth',
    name: 'Baby Woolly Mammoth',
    color: '#92400e',
    bellyColor: '#b45309',
    beakColor: '#fef3c7',
    abilityName: 'Heavy Dash',
    description: 'Smash through debris and small boulders without losing momentum.',
    speed: 5.0,
    jumpForce: -11.5,
    gravity: 0.62,
    smashObstacles: true,
    hearts: 4,
    unlockedByDefault: false,
    berryCost: 100
  },

  turtle: {
    id: 'turtle',
    name: 'Shy Turtle',
    color: '#15803d',
    bellyColor: '#86efac',
    beakColor: '#166534',
    abilityName: 'Shell-Tuck',
    description: 'Duck into shell to completely nullify incoming shockwaves.',
    speed: 4.8,
    jumpForce: -11,
    gravity: 0.6,
    shockwaveImmunityInDuck: true,
    hearts: 3,
    unlockedByDefault: false,
    berryCost: 150
  },

  bunny: {
    id: 'bunny',
    name: 'Nervous Bunny',
    color: '#f472b6',
    bellyColor: '#fdf2f8',
    beakColor: '#fb7185',
    abilityName: 'High Leap',
    description: 'Supercharged vertical spring to clear high obstacles.',
    speed: 5.8,
    jumpForce: -15.5,
    gravity: 0.52,
    hearts: 2,
    unlockedByDefault: false,
    berryCost: 200
  },

  triceratops: {
    id: 'triceratops',
    name: 'Baby Triceratops',
    color: '#0284c7',
    bellyColor: '#7dd3fc',
    beakColor: '#0369a1',
    abilityName: 'Steady Gallop',
    description: 'Unaffected by mud patches and sticky tar basins.',
    speed: 5.4,
    jumpForce: -12,
    gravity: 0.58,
    mudImmunity: true,
    hearts: 3,
    unlockedByDefault: false,
    berryCost: 250
  },

  sabreCub: {
    id: 'sabreCub',
    name: 'Sabre-Tooth Cub',
    color: '#ea580c',
    bellyColor: '#ffedd5',
    beakColor: '#ffffff',
    abilityName: 'Burst Sprint',
    description: 'Rapid burst speed to quickly escape the mallet danger zone.',
    speed: 6.4,
    jumpForce: -13.5,
    gravity: 0.55,
    hearts: 2,
    unlockedByDefault: false,
    berryCost: 350
  }
};
