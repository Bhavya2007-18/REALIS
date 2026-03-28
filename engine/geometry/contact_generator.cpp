
#include "contact_generator.hpp"
#include "sphere.hpp"
#include "box.hpp"
#include <cmath>

namespace realis {
namespace geometry {

ContactManifold ContactGenerator::generate(const Shape* a, const Vec3& posA, const Quat& rotA,
                                           const Shape* b, const Vec3& posB, const Quat& rotB) {
    ContactManifold manifold;
    
    
    if (a->type == ShapeType::SPHERE && b->type == ShapeType::SPHERE) {
        return sphere_sphere(static_cast<const Sphere*>(a), posA, static_cast<const Sphere*>(b), posB);
    }
    
    
    
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


Vec3 get_support(const Shape* s, const Vec3& dir, const Vec3& pos, const Quat& rot) {
    
    
    Quat q_conj(rot.w, -rot.x, -rot.y, -rot.z);
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    Mat3 R = rot.to_mat3();
    Mat3 RT = R.transpose();
    
    Vec3 local_dir = RT * dir;
    Vec3 local_support = s->support(local_dir);
    
    
    return pos + (R * local_support);
}

ContactManifold ContactGenerator::convex_convex(const Shape* a, const Vec3& posA, const Quat& rotA,
                                                const Shape* b, const Vec3& posB, const Quat& rotB) {
    
    
    
    
    
    
    
    ContactManifold manifold;
    
    return manifold;
}

} 
} 