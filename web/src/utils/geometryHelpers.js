import * as THREE from 'three';

export function createThreeShapeFrom2D(obj) {
    if (!obj) return null;
    
    const shape = new THREE.Shape();
    
    if (obj.type === 'rect') {
        shape.moveTo(-obj.width/2, -obj.height/2);
        shape.lineTo(obj.width/2, -obj.height/2);
        shape.lineTo(obj.width/2, obj.height/2);
        shape.lineTo(-obj.width/2, obj.height/2);
        shape.closePath();
        return shape;
    }
    
    if (obj.type === 'circle') {
        shape.absarc(0, 0, obj.r, 0, Math.PI * 2, false);
        return shape;
    }

    if (obj.type === 'polygon' && obj.sides) {
        const angleStep = (Math.PI * 2) / obj.sides;
        for (let i = 0; i < obj.sides; i++) {
            const px = Math.cos(i * angleStep) * obj.r;
            const py = Math.sin(i * angleStep) * obj.r;
            if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
        }
        shape.closePath();
        return shape;
    }
    
    if (obj.type === 'arc' && obj.radius) {
        shape.absarc(0, 0, obj.radius, (obj.startAngle || 0) * Math.PI / 180, (obj.endAngle || 90) * Math.PI / 180, false);
        shape.lineTo(0, 0); 
        shape.closePath();
        return shape;
    }
    
    if ((obj.type === 'path' || obj.type === 'pencil') && obj.points && obj.points.length > 1) {
        // Points are in absolute canvas coordinates. 
        // The mesh position will be [0, y, 0], so these absolute coords work perfectly.
        shape.moveTo(obj.points[0].x, obj.points[0].y);
        for (let i = 1; i < obj.points.length; i++) {
            shape.lineTo(obj.points[i].x, obj.points[i].y);
        }
        if (obj.closed) shape.closePath();
        return shape;
    }
    
    return null;
}
