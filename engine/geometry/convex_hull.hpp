// Convex Hull
// Generic physics shape form for arbitrary meshes
#pragma once
#include "shape.hpp"
#include <vector>
#include <limits>

namespace realis {
namespace geometry {

class ConvexHull : public Shape {
public:
    std::vector<Vec3> vertices;
    // Potentially store planes/edges for optimizations, but vertices suffice for GJK support

    ConvexHull(const std::vector<Vec3>& verts) : Shape(ShapeType::CONVEX_HULL), vertices(verts) {
        // Compute AABB
        aabb_min = Vec3(std::numeric_limits<float>::max(), std::numeric_limits<float>::max(), std::numeric_limits<float>::max());
        aabb_max = Vec3(std::numeric_limits<float>::lowest(), std::numeric_limits<float>::lowest(), std::numeric_limits<float>::lowest());
        
        for (const auto& v : vertices) {
            if (v.x < aabb_min.x) aabb_min.x = v.x;
            if (v.y < aabb_min.y) aabb_min.y = v.y;
            if (v.z < aabb_min.z) aabb_min.z = v.z;
            
            if (v.x > aabb_max.x) aabb_max.x = v.x;
            if (v.y > aabb_max.y) aabb_max.y = v.y;
            if (v.z > aabb_max.z) aabb_max.z = v.z;
        }
    }

    Vec3 support(const Vec3& direction) const override {
        float max_dot = -std::numeric_limits<float>::max();
        Vec3 distinct_point = Vec3(0,0,0);
        
        for (const auto& v : vertices) {
            float dot = v.dot(direction);
            if (dot > max_dot) {
                max_dot = dot;
                distinct_point = v;
            }
        }
        return distinct_point;
    }

    Mat3 compute_inertia_tensor(float /*mass*/) const override {
        // Placeholder: For Phase 6A, we assume box approximation for generic hulls
        // In a real implementation, we would integrate over the simplexes.
        // Returning identity * 0.1 for safety to avoid singular matrices
        Mat3 identity;
        identity.data[0] = 1.0f; identity.data[4] = 1.0f; identity.data[8] = 1.0f;
        // Scale simplified (assuming standard size)
        return identity; 
    }
};

} // namespace geometry
} // namespace realis
