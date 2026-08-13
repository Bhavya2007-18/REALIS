/**
 * Converts a SceneGraph from the Sketch AI pipeline (PipelineResponse)
 * into 3D shapes and physics constraints compatible with the REALIS Zustand store (useStore.js).
 */

export function sceneGraphToShapes(sceneGraph) {
  if (!sceneGraph || !sceneGraph.nodes) return [];

  return sceneGraph.nodes.map((node) => {
    // Map IRNode shapes to R3F 3D geometry types
    let type = 'cube';
    const shapeLower = (node.shape || node.type || '').toLowerCase();
    
    if (shapeLower.includes('sphere') || shapeLower.includes('circle') || shapeLower.includes('bob') || shapeLower.includes('wheel')) {
      type = 'sphere';
    } else if (shapeLower.includes('cylinder') || shapeLower.includes('rod') || shapeLower.includes('shaft')) {
      type = 'cylinder';
    } else if (shapeLower.includes('plane') || shapeLower.includes('ground') || shapeLower.includes('floor')) {
      type = 'plane';
    } else {
      type = 'cube';
    }

    const pos = node.position || [0, 2, 0];
    const dim = node.dimensions || [1, 1, 1];
    const isStatic = (node.type || '').toLowerCase().includes('anchor') || 
                    (node.type || '').toLowerCase().includes('ground') || 
                    node.mass === 0 || 
                    (node.type || '').toLowerCase().includes('support');

    return {
      id: node.id || `sketch_${Math.random().toString(36).substr(2, 9)}`,
      name: `${node.type || 'Object'} (${node.id})`,
      type: type,
      position: [pos[0] ?? 0, pos[1] ?? 2, pos[2] ?? 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: [dim[0] ?? 1, dim[1] ?? 1, dim[2] ?? 1],
      color: isStatic ? '#64748b' : '#3b82f6',
      wireframe: false,
      physics: {
        mass: isStatic ? 0 : (node.mass || 1.0),
        restitution: node.properties?.restitution ?? 0.5,
        friction: node.properties?.friction ?? 0.3,
        isStatic: isStatic,
        initialVelocity: [0, 0, 0],
        initialAngularVelocity: [0, 0, 0]
      }
    };
  });
}

export function sceneGraphToConstraints(sceneGraph) {
  if (!sceneGraph || !sceneGraph.edges) return [];

  return sceneGraph.edges.map((edge) => {
    let constraintType = 'distance';
    const edgeTypeLower = (edge.type || '').toLowerCase();

    if (edgeTypeLower.includes('hinge') || edgeTypeLower.includes('pivot') || edgeTypeLower.includes('revolute')) {
      constraintType = 'hinge';
    } else if (edgeTypeLower.includes('fixed') || edgeTypeLower.includes('weld')) {
      constraintType = 'fixed';
    } else if (edgeTypeLower.includes('slider') || edgeTypeLower.includes('prismatic')) {
      constraintType = 'slider';
    }

    const anchor = edge.anchor || [0, 0, 0];

    return {
      id: edge.id || `con_${Math.random().toString(36).substr(2, 9)}`,
      name: `${constraintType.toUpperCase()} (${edge.a} -> ${edge.b || 'anchor'})`,
      type: constraintType,
      targetA: edge.a,
      targetB: edge.b || null,
      distance: 2.0,
      pivotA: { x: anchor[0] ?? 0, y: anchor[1] ?? 0, z: anchor[2] ?? 0 },
      pivotB: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      motorEnabled: false,
      targetVelocity: 0,
      maxForce: 100
    };
  });
}
