// Abstract Finite Element Base Class
// Represents a volume of continuum discretized into nodes
#pragma once
#include <vector>
#include "../math/vec3.hpp"
#include "../math/mat3.hpp"
#include "../continuum/strain.hpp"
#include "../continuum/stress.hpp"
#include "../continuum/constitutive_law.hpp"

namespace realis {
namespace fem {

// A node in the FEM mesh
// In Phase 7, this is distinct from rigid bodies, 
// but will be coupled later.
struct Node {
    int id;
    Vec3 position;      // Current (Deformed) Position: x = X + u
    Vec3 rest_position; // Reference (Undeformed) Position: X
    Vec3 velocity;
    Vec3 force;
    float mass;
    bool is_fixed; // Boundary condition

    Node(int i, const Vec3& pos, float m) 
        : id(i), position(pos), rest_position(pos), velocity(0,0,0), force(0,0,0), mass(m), is_fixed(false) {}
};

class Element {
public:
    virtual ~Element() = default;

    // Connectivity
    virtual const std::vector<Node*>& get_nodes() const = 0;

    // Core FEM Operations
    
    // 1. Compute Internal Forces (f = -K * u_local)
    // For explicit solver: Accumulate nodal forces based on current stress
    virtual void compute_forces(const continuum::ConstitutiveLaw& material) = 0;

    // 2. Compute Volume/Mass
    virtual float compute_volume() const = 0;
};

} // namespace fem
} // namespace realis
