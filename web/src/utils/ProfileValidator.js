export function isClosedProfile(obj) {
    if (!obj) return false;
    
    // Primitive shapes are inherently closed
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'polygon') {
        return true;
    }
    
    if (obj.type === 'arc') {
        // An arc is only closed if it forms a full circle (360 degrees)
        if (Math.abs(obj.endAngle - obj.startAngle) >= 360) return true;
        return false;
    }
    
    if (obj.type === 'path' || obj.type === 'pencil') { // pencil outputs paths
        if (obj.closed) return true;
        
        // If not explicitly marked closed, check start/end vertex distance
        if (obj.points && obj.points.length > 2) {
            const first = obj.points[0];
            const last = obj.points[obj.points.length - 1];
            const dx = first.x - last.x;
            const dy = first.y - last.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            return dist < 1.0; // 1 pixel tolerance for closing
        }
    }
    
    return false;
}
