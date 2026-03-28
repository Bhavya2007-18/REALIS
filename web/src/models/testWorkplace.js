/**
 * Test Workplace (Physics Sandbox Preset)
 * A modular lab-like scene with multiple objects to start experimenting immediately.
 */

const testWorkplace = {
  id: 'test_workplace',
  name: 'test workplace',
  description: 'Modular physics lab preset with mixed objects for quick tests.',
  category: 'Sandbox',
  complexity: 'Medium',
  shapes3D: [
    // Ground / Lab Floor
    {
      id: 'lab_floor',
      type: 'plane',
      name: 'Lab Floor',
      position: [0, 0, 0],
      rotation: [-Math.PI / 2, 0, 0],
      scale: [1, 1, 1],
      params: { width: 200, depth: 200 },
      color: '#0f172a',
      roughness: 0.9,
      metalness: 0.0,
      isStatic: true
    },

    // Particle Lab cluster
    {
      id: 'particle_sphere_small_1',
      type: 'sphere',
      position: [-15, 6, -10],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radius: 1.5, segments: 16 },
      color: '#22c55e',
      mass: 1,
      restitution: 0.8,
      friction: 0.2,
      isStatic: false
    },
    {
      id: 'particle_sphere_small_2',
      type: 'sphere',
      position: [-12, 9, -12],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radius: 1.2, segments: 16 },
      color: '#3b82f6',
      mass: 0.8,
      restitution: 0.7,
      friction: 0.2,
      isStatic: false
    },
    {
      id: 'particle_cube',
      type: 'cube',
      position: [-18, 8, -8],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { width: 2.5, height: 2.5, depth: 2.5 },
      color: '#eab308',
      mass: 1.1,
      restitution: 0.6,
      friction: 0.25,
      isStatic: false
    },

    // Mechanics Arena cluster
    {
      id: 'mech_ball_heavy',
      type: 'sphere',
      position: [15, 12, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radius: 3, segments: 24 },
      color: '#ef4444',
      mass: 3.5,
      restitution: 0.5,
      friction: 0.3,
      isStatic: false
    },
    {
      id: 'mech_block',
      type: 'cube',
      position: [20, 6, 4],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { width: 5, height: 5, depth: 5 },
      color: '#64748b',
      mass: 2.0,
      restitution: 0.4,
      friction: 0.5,
      isStatic: false
    },
    {
      id: 'mech_cylinder',
      type: 'cylinder',
      position: [22, 8, -6],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radiusTop: 2, radiusBottom: 2, height: 6, segments: 20 },
      color: '#8b5cf6',
      mass: 1.6,
      restitution: 0.6,
      friction: 0.35,
      isStatic: false
    },

    // Motion Lab anchors (light drones)
    {
      id: 'motion_drone_1',
      type: 'sphere',
      position: [0, 10, 15],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radius: 1.3 },
      color: '#f472b6',
      mass: 1.0,
      restitution: 0.4,
      friction: 0.1,
      isStatic: false
    },
    {
      id: 'motion_drone_2',
      type: 'sphere',
      position: [3, 12, 18],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      params: { radius: 1.1 },
      color: '#22d3ee',
      mass: 0.9,
      restitution: 0.4,
      friction: 0.1,
      isStatic: false
    }
  ],
  constraints: []
}

export default testWorkplace
