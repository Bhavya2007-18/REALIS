// Linear Tetrahedral Element (Constant Strain)
// 4 Nodes. Linear shape functions. 
// Constant B matrix, constant Strain/Stress inside.
#pragma once
#include "element.hpp"
#include "../math/mat3.hpp"
#include <array>

namespace realis {
namespace fem {

class TetraElement : public Element {
public:
    std::array<Node*, 4> nodes; // Defined connectivity
    float volume;               // Undeformed volume (precomputed)
    
    // Shape function derivatives (B-matrix components)
    // Precomputed in material coordinates (reference config)
    // beta matrices for each node? Or just raw gradient vectors?
    // B = [dN1/dX, dN2/dX, ... ]
    // Each dNi/dX is a Vec3 (vector).
    std::array<Vec3, 4> shape_derivs; 

    // Current State (for visualization/monitoring)
    continuum::StrainTensor current_strain;
    continuum::StressTensor current_stress;

    TetraElement(Node* n0, Node* n1, Node* n2, Node* n3) {
        nodes = {n0, n1, n2, n3};
        precompute_shape_functions();
    }

    const std::vector<Node*>& get_nodes() const override {
        // Safe cast hack or just hold a vector too? 
        // Returning array reference is tricky if interface expects vector.
        // Let's create a temp static vector or just member.
        static std::vector<Node*> temp_nodes;
        temp_nodes = {nodes[0], nodes[1], nodes[2], nodes[3]};
        return temp_nodes;
    }

    float compute_volume() const override {
        return volume;
    }

    void precompute_shape_functions() {
        // Volume of tetra = 1/6 * det(x1-x0, x2-x0, x3-x0)
        Vec3 x0 = nodes[0]->rest_position;
        Vec3 x1 = nodes[1]->rest_position;
        Vec3 x2 = nodes[2]->rest_position;
        Vec3 x3 = nodes[3]->rest_position;

        Vec3 e10 = x1 - x0;
        Vec3 e20 = x2 - x0;
        Vec3 e30 = x3 - x0;

        // Mixed product
        float detJ = e10.dot(e20.cross(e30));
        volume = detJ / 6.0f;
        
        // Check for degenerate elements
        if (volume < 1e-9f) {
            // Throw or error? For Phase 7, we trust input or assert.
            // Inverted?
        }
        if (volume < 0) volume = -volume; // Handle inversion gracefully for unsigned vol, but derivatives will be wrong if we don't fix order.

        // Compute derivatives shape functions dNi/dX_j
        // Using relationship: [DX] * [GradN] = [I] (partitioned)
        // See standard FEM texts:
        // GradN_1 = (e20 x e30) / (6V) ... 
        // Need to be precise. 
        // Reference: Muller et al., "Real-time deformation..." (2004) or standard text.
        
        // Let's use coordinate matrix inverse.
        // D_m = [x1-x0, x2-x0, x3-x0]
        // B_m = D_m^-1
        
        Mat3 Dm;
        // Check column/row major. Realis Mat3:
        // data[0]=xx (0,0), data[1]=xy (0,1), data[2]=xz (0,2)
        // Col0: x1-x0. Col1: x2-x0...
        Dm.set_column(0, e10);
        Dm.set_column(1, e20);
        Dm.set_column(2, e30);
        
        Mat3 Bm = Dm.inverse(); // Must implement inverse in Mat3 if not there! (We assume it is or will add it)
        
        // Shape derivatives for nodes 1,2,3 are the rows of Bm?
        // u = u0 + Dm * b (b barycentric coords related?)
        // Standard P1 element gradient:
        // Grad u = (u1-u0)*b1^T + (u2-u0)*b2^T + ...
        // Where vectors b1, b2, b3 are rows of Bm.
        
        // q1 = Bm.row(0), q2 = Bm.row(1), q3 = Bm.row(2)
        // grad(Ni) = qi for i=1,2,3.
        // grad(N0) = -q1 -q2 -q3.
        
        shape_derivs[1] = Bm.row(0);
        shape_derivs[2] = Bm.row(1);
        shape_derivs[3] = Bm.row(2);
        shape_derivs[0] = (shape_derivs[1] + shape_derivs[2] + shape_derivs[3]) * -1.0f;
    }

    void compute_forces(const continuum::ConstitutiveLaw& material) override {
        // 1. Compute Deformation Gradient F (or Strain directly for small strain)
        // For small strain: epsilon = 0.5 (du/dx + du/dx^T)
        // u_i = x_i - X_i (Displacement)
        
        // Grad(u) = Sum(u_node * grad_N)
        // Grad(u) is 3x3 tensor
        Mat3 grad_u; // Zero init
        
        for (int i = 0; i < 4; ++i) {
            Vec3 u = nodes[i]->position - nodes[i]->rest_position;
            Vec3 dN = shape_derivs[i];
            
            // Outer product term: u * dN^T
            // G_ij += u_i * dN_j
            for (int r = 0; r < 3; ++r) {     // Row (u components)
                for (int c = 0; c < 3; ++c) { // Col (dN components)
                    grad_u.data[r * 3 + c] += u[r] * dN[c]; 
                }
            }
        }
        
        // 2. Compute Strain (Small Strain assumption)
        // E = 0.5 (G + G^T)
        Mat3 eps = (grad_u + grad_u.transpose()) * 0.5f;
        current_strain = continuum::StrainTensor(eps);
        
        // 3. Compute Stress (Constitutive Law)
        // We assume explicit update, no dt dependency for elastic yet.
        current_stress = material.compute_stress(current_strain, 0.0f);
        
        // 4. Compute Forces
        // f_i = - Volume * stress * dN_i (For constant stress tetra)
        // Divergence of stress theorem: Integral(sigma : grad_phi)
        
        // Force on node i: f_node = - V * sigma * grad_N_i
        // sigma is symmetric 3x3. grad_N is 3x1. Result is 3x1 force.
        
        for (int i = 0; i < 4; ++i) {
            Vec3 force_density = current_stress.data * shape_derivs[i]; // M * v
            Vec3 f = force_density * (-volume);
            
            // Add to node force (Force Accumulation)
            nodes[i]->force = nodes[i]->force + f;
        }
    }
};

} // namespace fem
} // namespace realis
