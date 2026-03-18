import engineModel from '../models/engineModel';
import pendulumModel from '../models/pendulumModel';
import projectileModel from '../models/projectileModel';

/**
 * AI Command Handler (Simulated)
 * Processes natural language input and identifies model loading intent.
 */
const commandHandler = {
    handleCommand: (input) => {
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('engine')) {
            return {
                type: 'LOAD_MODEL',
                modelId: 'engine',
                model: engineModel,
                reply: "Vroom! 🏎️ Loading the Piston-Crank Engine model. This setup uses motorized revolute joints and distance constraints to simulate mechanical motion."
            };
        }

        if (lowerInput.includes('pendulum')) {
            return {
                type: 'LOAD_MODEL',
                modelId: 'pendulum',
                model: pendulumModel,
                reply: "Swinging in! 🕰️ Loading the Pendulum model. A classic demonstration of gravity-driven radial motion."
            };
        }

        if (lowerInput.includes('projectile')) {
            return {
                type: 'LOAD_MODEL',
                modelId: 'projectile',
                model: projectileModel,
                reply: "Incoming! 🚀 Loading the Projectile Motion model. Observe the parabolic trajectory based on the initial velocity vector."
            };
        }

        return null; // No match found
    }
};

export default commandHandler;
