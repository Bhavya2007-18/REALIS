

#pragma once
#include "shape.hpp"
#include "../collision/contact.hpp" 
#include <vector>

namespace realis {
namespace geometry {

class Sphere;
class Box;


struct ContactPoint {
    Vec3 position;    
    float penetration; 
    Vec3 normal;      
    
};

struct ContactManifold {
    std::vector<ContactPoint> points;
    Vec3 normal; 
};

class ContactGenerator {
public:
    
    static ContactManifold generate(const Shape* a, const Vec3& posA, const Quat& rotA,
                                    const Shape* b, const Vec3& posB, const Quat& rotB);
                                    
private:
    
    static ContactManifold sphere_sphere(const Sphere* a, const Vec3& posA,
                                         const Sphere* b, const Vec3& posB);
                                         
    static ContactManifold sphere_box(const Sphere* a, const Vec3& posA,
                                      const Box* b, const Vec3& posB, const Quat& rotB);
                                      
    
    static ContactManifold convex_convex(const Shape* a, const Vec3& posA, const Quat& rotA,
                                         const Shape* b, const Vec3& posB, const Quat& rotB);
};

} 
} 