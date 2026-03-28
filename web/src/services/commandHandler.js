import engineModel from '../models/engineModel';
import pendulumModel from '../models/pendulumModel';
import projectileModel from '../models/projectileModel';
import thermalModel from '../models/thermalModel';


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

        if (lowerInput.includes('thermal stress') || lowerInput.includes('thermal prep')) {
            return {
                type: 'LOAD_MODEL',
                modelId: 'thermal',
                model: thermalModel,
                reply: "Heating up! 🌡️ Loading the Thermal Stress Test model. This demonstrates heat diffusion across a conductor."
            };
        }

        
        if (lowerInput.includes('run thermal') || (lowerInput.includes('run') && lowerInput.includes('simulation'))) {
            return {
                type: 'TRIGGER_SIMULATION',
                reply: "Initiating simulation... 🚀 I am monitoring the active simulation state."
            };
        }

        
        if (lowerInput.includes('increase efficiency') || lowerInput.includes('optimize')) {
            return {
                type: 'AI_INSIGHT',
                reply: "To increase efficiency, consider reducing friction on bearing surfaces, or changing the material of the heavy components to aluminum. Would you like me to highlight the components with the highest friction?"
            };
        }

        if (lowerInput.includes('reduce heat')) {
            return {
                type: 'AI_INSIGHT',
                reply: "I recommend increasing the ambient cooling rate or swapping the conductor material to something with higher thermal conductivity like Copper or Aluminum."
            };
        }

        
        const materials = [
            { key: 'steel', name: 'steel' },
            { key: 'aluminum', name: 'aluminum' },
            { key: 'titanium', name: 'titanium' },
            { key: 'plastic', name: 'plastic' },
            { key: 'cast iron', name: 'cast_iron' }
        ];

        for (const mat of materials) {
            if (lowerInput.includes(`apply ${mat.key}`) || lowerInput.includes(`make it ${mat.key}`)) {
                return {
                    type: 'SET_MATERIAL',
                    material: mat.name,
                    reply: `Got it! I'm applying **${mat.key}** to the selected component. Its physical properties have been updated.`
                };
            }
        }

        return null; 
    }
};

export default commandHandler;