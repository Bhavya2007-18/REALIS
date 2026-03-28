


#pragma once
#include "element.hpp"
#include "../math/mat3.hpp"
#include <array>

namespace realis {
namespace fem {

class TetraElement : public Element {
public:
    std::array<Node*, 4> nodes; 
    float volume;               
    
    
    
    
    
    
    std::array<Vec3, 4> shape_derivs; 

    
    continuum::StrainTensor current_strain;
    continuum::StressTensor current_stress;

    TetraElement(Node* n0, Node* n1, Node* n2, Node* n3) {
        nodes = {n0, n1, n2, n3};
        precompute_shape_functions();
    }

    const std::vector<Node*>& get_nodes() const override {
        
        
        
        static std::vector<Node*> temp_nodes;
        temp_nodes = {nodes[0], nodes[1], nodes[2], nodes[3]};
        return temp_nodes;
    }

    float compute_volume() const override {
        return volume;
    }

    void precompute_shape_functions() {
        
        Vec3 x0 = nodes[0]->rest_position;
        Vec3 x1 = nodes[1]->rest_position;
        Vec3 x2 = nodes[2]->rest_position;
        Vec3 x3 = nodes[3]->rest_position;

        Vec3 e10 = x1 - x0;
        Vec3 e20 = x2 - x0;
        Vec3 e30 = x3 - x0;

        
        float detJ = e10.dot(e20.cross(e30));
        volume = detJ / 6.0f;
        
        
        if (volume < 1e-9f) {
            
            
        }
        if (volume < 0) volume = -volume; 

        
        
        
        
        
        
        
        
        
        
        
        Mat3 Dm;
        
        
        
        Dm.set_column(0, e10);
        Dm.set_column(1, e20);
        Dm.set_column(2, e30);
        
        Mat3 Bm = Dm.inverse(); 
        
        
        
        
        
        
        
        
        
        
        
        shape_derivs[1] = Bm.row(0);
        shape_derivs[2] = Bm.row(1);
        shape_derivs[3] = Bm.row(2);
        shape_derivs[0] = (shape_derivs[1] + shape_derivs[2] + shape_derivs[3]) * -1.0f;
    }

    void compute_forces(const continuum::ConstitutiveLaw& material) override {
        
        
        
        
        
        
        Mat3 grad_u; 
        
        for (int i = 0; i < 4; ++i) {
            Vec3 u = nodes[i]->position - nodes[i]->rest_position;
            Vec3 dN = shape_derivs[i];
            
            
            
            for (int r = 0; r < 3; ++r) {     
                for (int c = 0; c < 3; ++c) { 
                    grad_u.data[r * 3 + c] += u[r] * dN[c]; 
                }
            }
        }
        
        
        
        Mat3 eps = (grad_u + grad_u.transpose()) * 0.5f;
        current_strain = continuum::StrainTensor(eps);
        
        
        
        current_stress = material.compute_stress(current_strain, 0.0f);
        
        
        
        
        
        
        
        
        for (int i = 0; i < 4; ++i) {
            Vec3 force_density = current_stress.data * shape_derivs[i]; 
            Vec3 f = force_density * (-volume);
            
            
            nodes[i]->force = nodes[i]->force + f;
        }
    }
};

} 
} 