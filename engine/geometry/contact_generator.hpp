// Contact Feature Generator
// Extracts manifolds from shape interactions
#pragma once
#include "shape.hpp"
#include "../collision/contact.hpp" // Use existing Contact struct or extend it
#include <vector>

namespace realis {
namespace geometry {

class Sphere;
class Box;

// Extended Contact structure for Manifolds
struct ContactPoint {
    Vec3 position;    // World space
    float penetration; 
    Vec3 normal;      // From A to B
    // Feature ID for warm starting (optional for Phase 6)
};

struct ContactManifold {
    std::vector<ContactPoint> points;
    Vec3 normal; // Average normal
};

class ContactGenerator {
public:
    // Main entry point
    static ContactManifold generate(const Shape* a, const Vec3& posA, const Quat& rotA,
                                    const Shape* b, const Vec3& posB, const Quat& rotB);
                                    
private:
    // Algorithms
    static ContactManifold sphere_sphere(const Sphere* a, const Vec3& posA,
                                         const Sphere* b, const Vec3& posB);
                                         
    static ContactManifold sphere_box(const Sphere* a, const Vec3& posA,
                                      const Box* b, const Vec3& posB, const Quat& rotB);
                                      
    // General GJK/EPA for convex shapes
    static ContactManifold convex_convex(const Shape* a, const Vec3& posA, const Quat& rotA,
                                         const Shape* b, const Vec3& posB, const Quat& rotB);
};

} // namespace geometry
} // namespace realis
