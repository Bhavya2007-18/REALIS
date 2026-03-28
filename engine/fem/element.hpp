

#pragma once
#include <vector>
#include "../math/vec3.hpp"
#include "../math/mat3.hpp"
#include "../continuum/strain.hpp"
#include "../continuum/stress.hpp"
#include "../continuum/constitutive_law.hpp"

namespace realis {
namespace fem {




struct Node {
    int id;
    Vec3 position;      
    Vec3 rest_position; 
    Vec3 velocity;
    Vec3 force;
    float mass;
    bool is_fixed; 

    Node(int i, const Vec3& pos, float m) 
        : id(i), position(pos), rest_position(pos), velocity(0,0,0), force(0,0,0), mass(m), is_fixed(false) {}
};

class Element {
public:
    virtual ~Element() = default;

    
    virtual const std::vector<Node*>& get_nodes() const = 0;

    
    
    
    
    virtual void compute_forces(const continuum::ConstitutiveLaw& material) = 0;

    
    virtual float compute_volume() const = 0;
};

} 
} 