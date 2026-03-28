

export default class SimulationEngine {
    constructor(settings = {}) {
        this.gravity = settings.gravity || { x: 0, y: 9.81 }; 
        this.timeStep = settings.timeStep || 0.016;
        this.bodies = [];
        this.constraints = [];
        this.history = []; 
    }

    addBody(body) {
        const defaults = {
            id: Math.random().toString(36).substring(2, 9),
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            mass: 1.0,
            isStatic: false,
            type: 'circle',
            radius: 10
        };
        this.bodies.push({ ...defaults, ...body });
        return this.bodies[this.bodies.length - 1];
    }

    addConstraint(constraint) {
        this.constraints.push(constraint);
    }

    update(dt) {
        const h = dt || this.timeStep;

        
        this.bodies.forEach(b => {
            if (b.isStatic) return;
            b.acceleration.x = this.gravity.x;
            b.acceleration.y = this.gravity.y;
        });

        
        for (let i = 0; i < 5; i++) { 
            this.constraints.forEach(c => {
                if (c.type === 'distance') {
                    const b1 = this.bodies.find(b => b.id === c.targetA);
                    const b2 = this.bodies.find(b => b.id === c.targetB);
                    if (!b1 || (!b2 && c.targetB !== null)) return;

                    const p1 = b1.position;
                    
                    const p2 = b2 ? b2.position : (c.anchorB || { x: p1.x, y: p1.y + c.distance });

                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const diff = (dist - c.distance) / dist;

                    const m1 = b1.isStatic ? 0 : 1 / b1.mass;
                    const m2 = (!b2 || b2.isStatic) ? 0 : 1 / b2.mass;
                    const invMassSum = m1 + m2;
                    if (invMassSum === 0) return;

                    const scalar1 = (m1 / invMassSum) * diff;
                    const scalar2 = (m2 / invMassSum) * diff;

                    if (!b1.isStatic) {
                        b1.position.x -= dx * scalar1;
                        b1.position.y -= dy * scalar1;
                    }
                    if (b2 && !b2.isStatic) {
                        b2.position.x += dx * scalar2;
                        b2.position.y += dy * scalar2;
                    }
                }
            });
        }

        
        this.bodies.forEach(b => {
            if (b.isStatic) return;

            
            b.velocity.x += b.acceleration.x * h;
            b.velocity.y += b.acceleration.y * h;

            
            b.position.x += b.velocity.x * h;
            b.position.y += b.velocity.y * h;

            
            b.velocity.x *= 0.999;
            b.velocity.y *= 0.999;
        });
    }

    calculateEnergy() {
        let kinetic = 0;
        let potential = 0;
        const groundY = 600; 

        this.bodies.forEach(b => {
            if (b.isStatic) return;
            const vSq = b.velocity.x ** 2 + b.velocity.y ** 2;
            kinetic += 0.5 * b.mass * vSq;
            
            const height = Math.max(0, groundY - b.position.y);
            potential += b.mass * Math.abs(this.gravity.y) * height;
        });

        return { kinetic, potential, total: kinetic + potential };
    }

    serialize() {
        return {
            bodies: JSON.parse(JSON.stringify(this.bodies)),
            constraints: JSON.parse(JSON.stringify(this.constraints))
        };
    }
}