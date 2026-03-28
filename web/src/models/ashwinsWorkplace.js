/**
 * Ashwins Workplace (Roblox Pirate Map Template)
 * A detailed reconstruction of the classic Roblox Pirate Island scene with an enhanced Pirate Ship.
 */

const ashwinsWorkplace = {
    name: "ashwins workplace",
    description: "Classic Roblox-style Pirate Island with an enhanced ship, sails, and palm trees.",
    category: "Environment",
    complexity: "High",
    shapes3D: [
        // --- THE OCEAN ---
        {
            id: "ocean",
            type: "plane",
            name: "Ocean",
            position: { x: 0, y: -0.1, z: 0 },
            rotation: { x: -Math.PI / 2, y: 0, z: 0 },
            params: { width: 400, depth: 400 },
            color: "#0077be",
            opacity: 0.6,
            isStatic: true
        },

        // --- THE ISLAND ---
        {
            id: "island_main",
            type: "sphere",
            name: "Main Island",
            position: { x: -20, y: -15, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { radius: 50, segments: 32, rings: 32 },
            color: "#f2d2a9", // Sand color
            isStatic: true
        },

        // --- ENHANCED PIRATE SHIP ---
        // Ship Hull - Bottom Section
        {
            id: "ship_hull_bottom",
            type: "cube",
            name: "Ship Hull Bottom",
            position: { x: 60, y: 2, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { width: 50, height: 6, depth: 18 },
            color: "#4d342c",
            isStatic: true
        },
        // Ship Hull - Bow (Front)
        {
            id: "ship_bow",
            type: "cube",
            name: "Ship Bow",
            position: { x: 88, y: 4, z: 0 },
            rotation: { x: 0, y: 0, z: 0.4 },
            params: { width: 12, height: 10, depth: 16 },
            color: "#4d342c",
            isStatic: true
        },
        // Ship Hull - Stern (Back)
        {
            id: "ship_stern",
            type: "cube",
            name: "Ship Stern",
            position: { x: 32, y: 6, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { width: 15, height: 14, depth: 18 },
            color: "#3e2723",
            isStatic: true
        },
        // Main Deck
        {
            id: "ship_deck_main",
            type: "cube",
            name: "Main Deck",
            position: { x: 60, y: 5.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { width: 48, height: 1, depth: 16 },
            color: "#795548",
            isStatic: true
        },
        // Main Mast (Front)
        {
            id: "ship_mast_front",
            type: "cylinder",
            name: "Fore Mast",
            position: { x: 75, y: 20, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { radiusTop: 0.8, radiusBottom: 0.8, height: 35, segments: 16 },
            color: "#2d1b15",
            isStatic: true
        },
        // Main Mast (Center)
        {
            id: "ship_mast_main",
            type: "cylinder",
            name: "Main Mast",
            position: { x: 55, y: 25, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { radiusTop: 1.0, radiusBottom: 1.0, height: 45, segments: 16 },
            color: "#2d1b15",
            isStatic: true
        },
        // Fore Sail
        {
            id: "ship_sail_fore",
            type: "cube",
            name: "Fore Sail",
            position: { x: 75, y: 22, z: 1 },
            rotation: { x: 0.1, y: 0, z: 0 },
            params: { width: 20, height: 15, depth: 0.3 },
            color: "#f5f5f5",
            isStatic: true
        },
        // Main Sail
        {
            id: "ship_sail_main",
            type: "cube",
            name: "Main Sail",
            position: { x: 55, y: 28, z: 1.2 },
            rotation: { x: 0.1, y: 0, z: 0 },
            params: { width: 28, height: 22, depth: 0.3 },
            color: "#ffffff",
            isStatic: true
        },
        // Ship Railing (Left)
        {
            id: "ship_rail_l",
            type: "cube",
            name: "Left Railing",
            position: { x: 60, y: 6.5, z: 8.5 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { width: 48, height: 2, depth: 0.5 },
            color: "#3e2723",
            isStatic: true
        },
        // Ship Railing (Right)
        {
            id: "ship_rail_r",
            type: "cube",
            name: "Right Railing",
            position: { x: 60, y: 6.5, z: -8.5 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { width: 48, height: 2, depth: 0.5 },
            color: "#3e2723",
            isStatic: true
        },

        // --- PALM TREES (Island Side) ---
        {
            id: "palm_1_trunk",
            type: "cylinder",
            name: "Palm Tree Trunk",
            position: { x: -25, y: 12, z: -15 },
            rotation: { x: 0, y: 0, z: 0.1 },
            params: { radiusTop: 1.0, radiusBottom: 1.5, height: 25, segments: 8 },
            color: "#795548",
            isStatic: true
        },
        {
            id: "palm_1_leaves_1",
            type: "cube",
            name: "Palm Leaf 1",
            position: { x: -25, y: 24, z: -15 },
            rotation: { x: 0.4, y: 0, z: 0 },
            params: { width: 15, height: 0.5, depth: 3 },
            color: "#2e7d32",
            isStatic: true
        },
        {
            id: "palm_1_leaves_2",
            type: "cube",
            name: "Palm Leaf 2",
            position: { x: -25, y: 24, z: -15 },
            rotation: { x: -0.4, y: Math.PI / 2, z: 0 },
            params: { width: 15, height: 0.5, depth: 3 },
            color: "#2e7d32",
            isStatic: true
        },

        // --- TREASURE & DECOR ---
        {
            id: "treasure_chest",
            type: "cube",
            name: "Treasure Chest",
            position: { x: -15, y: 1.5, z: 10 },
            rotation: { x: 0, y: 0.8, z: 0 },
            params: { width: 4, height: 3, depth: 3 },
            color: "#fbc02d",
            mass: 20,
            isStatic: false
        },
        {
            id: "barrel_1",
            type: "cylinder",
            name: "Barrel",
            position: { x: 65, y: 7, z: 4 },
            rotation: { x: 0, y: 0, z: 0 },
            params: { radiusTop: 1.5, radiusBottom: 1.5, height: 4, segments: 12 },
            color: "#4e342e",
            isStatic: false
        }
    ]
};

export default ashwinsWorkplace;
