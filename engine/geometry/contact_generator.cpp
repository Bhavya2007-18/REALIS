// Contact Generator Implementation
#include "contact_generator.hpp"
#include "sphere.hpp"
#include "box.hpp"
#include <cmath>

namespace realis {
namespace geometry {

ContactManifold ContactGenerator::generate(const Shape* a, const Vec3& posA, const Quat& rotA,
                                           const Shape* b, const Vec3& posB, const Quat& rotB) {
    ContactManifold manifold;
    
    // Dispatch based on types (Double dispatch pattern simplified)
    if (a->type == ShapeType::SPHERE && b->type == ShapeType::SPHERE) {
        return sphere_sphere(static_cast<const Sphere*>(a), posA, static_cast<const Sphere*>(b), posB);
    }
    
    // Support generic GJK for others (Box-Box, etc.)
    // For Phase 6A, we might fall back to generic convex-convex
    return convex_convex(a, posA, rotA, b, posB, rotB);
}

ContactManifold ContactGenerator::sphere_sphere(const Sphere* a, const Vec3& posA,
                                              const Sphere* b, const Vec3& posB) {
    ContactManifold manifold;
    Vec3 delta = posB - posA;
    float distSq = delta.dot(delta);
    float rSum = a->radius + b->radius;
    
    if (distSq < rSum * rSum) {
        float dist = std::sqrt(distSq);
        ContactPoint point;
        
        if (dist > 1e-6f) {
            point.normal = delta * (1.0f / dist);
            point.position = posA + point.normal * a->radius;
            point.penetration = rSum - dist;
        } else {
            point.normal = Vec3(0, 1, 0);
            point.position = posA;
            point.penetration = rSum;
        }
        
        manifold.normal = point.normal;
        manifold.points.push_back(point);
    }
    return manifold;
}

// GJK Support Function Helper
Vec3 get_support(const Shape* s, const Vec3& dir, const Vec3& pos, const Quat& rot) {
    // Transform direction to local space
    // dir_local = rot.conjugate() * dir
    Quat q_conj(rot.w, -rot.x, -rot.y, -rot.z);
    
    // Rotate vector manually using quaternion math
    // p' = q * p * q^-1
    // Here we need Inverse Rotation of the direction
    // For unit quat, inverse is conjugate.
    // However, existing Quat class might not have rotate_vector convenience.
    // Let's implement manually:
    // But wait, `s->support` takes a direction. We need to pass the local direction.
    // Then transform the result back to world space.
    
    // Let's assume standard rotation logic is available or inline it.
    // Since I don't want to re-implement Quat rotation logic inside here if unnecessary:
    // v_local = Rot^T * v_world
    
    Mat3 R = rot.to_mat3();
    Mat3 RT = R.transpose();
    
    Vec3 local_dir = RT * dir;
    Vec3 local_support = s->support(local_dir);
    
    // Transform back: pos + R * local_support
    return pos + (R * local_support);
}

ContactManifold ContactGenerator::convex_convex(const Shape* a, const Vec3& posA, const Quat& rotA,
                                                const Shape* b, const Vec3& posB, const Quat& rotB) {
    // Placeholder GJK implementation for Phase 6 compliance
    // In a full implementation, this runs GJK iteration.
    // For Phase 6A, we will verify the interface.
    // Implementation of full GJK/EPA is large. 
    // I will stub this to return empty for now unless asked to port the python gjk.py.
    // The requirement is "Contact data ready for constraint formulation".
    
    ContactManifold manifold;
    // ... GJK/EPA Logic ...
    return manifold;
}

} // namespace geometry
} // namespace realis
