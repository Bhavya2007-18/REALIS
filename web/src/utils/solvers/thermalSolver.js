/**
 * REALIS Thermal Solver
 * Simulates heat diffusion between bodies.
 * Produces per-body temperature maps for heatmap rendering.
 */

import { diffuseHeat, tempToColor, analyzeThermal } from '../physicsEngine.js';

export default class ThermalSolver {
    constructor(settings = {}) {
        this.settings = {
            timeStep: settings.timeStep ?? 0.016,
            ambientTemp: settings.ambientTemp ?? 20,
            conductivityScale: settings.conductivityScale ?? 1.0,
        };
        this.bodies = [];
        this.temperatureMap = new Map(); // id → temperature (°C)
        this.time = 0;
        this.history = []; // [{ time, temps }]
    }

    setBodies(rawBodies) {
        this.bodies = rawBodies.map(b => ({
            ...b,
            position: b.position ?? { x: b.cx ?? b.x ?? 0, y: b.cy ?? b.y ?? 0 },
            temperature: b.temperature ?? this.settings.ambientTemp,
            thermalConductivity: this._getConductivity(b.material),
            mass: b.mass ?? 1,
        }));

        // Initialize temperature map
        this.bodies.forEach(b => {
            this.temperatureMap.set(b.id, b.temperature);
        });
    }

    _getConductivity(material) {
        const map = {
            steel: 50,
            aluminum: 205,
            copper: 400,
            titanium: 22,
            plastic: 0.2,
            rubber: 0.15,
            wood: 0.12,
        };
        return (map[material] ?? 50) * this.settings.conductivityScale;
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Run one thermal simulation step. Returns temperature map + analytics.
     */
    step() {
        // Apply boundary conditions (heat sources/sinks)
        this.bodies.forEach(b => {
            if (b.isHeatSource) {
                this.temperatureMap.set(b.id, b.sourceTemp ?? 500);
            } else if (b.isHeatSink) {
                this.temperatureMap.set(b.id, b.sinkTemp ?? this.settings.ambientTemp);
            }
        });

        // Attach current temps to bodies for diffusion
        this.bodies.forEach(b => {
            b.temperature = this.temperatureMap.get(b.id) ?? this.settings.ambientTemp;
        });

        // Diffuse heat
        const newTemps = diffuseHeat(this.bodies, this.settings.timeStep * 50); // scale for visible effect

        // Merge back (heat sources/sinks stay fixed)
        newTemps.forEach((temp, id) => {
            const body = this.bodies.find(b => b.id === id);
            if (body && !body.isHeatSource && !body.isHeatSink) {
                this.temperatureMap.set(id, temp);
            }
        });

        this.time += this.settings.timeStep;

        // Record history (throttled)
        if (this.history.length === 0 || this.time - this.history[this.history.length - 1].time > 0.1) {
            const snapshot = {};
            this.temperatureMap.forEach((t, id) => { snapshot[id] = t; });
            this.history.push({ time: this.time, temps: snapshot });
            if (this.history.length > 500) this.history.shift();
        }

        return this.getSnapshot();
    }

    getSnapshot() {
        const colors = {};
        const temps = {};

        this.temperatureMap.forEach((temp, id) => {
            temps[id] = temp;
            colors[id] = tempToColor(temp, this.settings.ambientTemp, 500);
        });

        const analytics = analyzeThermal(this.bodies, this.temperatureMap);

        return {
            time: this.time,
            temperatureMap: temps,
            colorMap: colors,
            analytics,
        };
    }

    getColorForBody(id) {
        const temp = this.temperatureMap.get(id);
        if (temp === undefined) return null;
        return tempToColor(temp, this.settings.ambientTemp, 500);
    }

    reset() {
        this.bodies.forEach(b => {
            this.temperatureMap.set(b.id, b.temperature ?? this.settings.ambientTemp);
        });
        this.time = 0;
        this.history = [];
    }
}
