// FEM Mesh Container
// Holds the mesh data structures
#pragma once
#include "element.hpp"
#include <vector>
#include <memory>

namespace realis {
namespace fem {

class FEMMesh {
public:
    std::vector<std::unique_ptr<Node>> nodes;
    std::vector<std::unique_ptr<Element>> elements;
    
    // Helper to add nodes
    Node* add_node(const Vec3& pos, float mass) {
        int id = static_cast<int>(nodes.size());
        nodes.push_back(std::make_unique<Node>(id, pos, mass));
        return nodes.back().get();
    }
    
    // Reset forces before solver step
    void clear_forces() {
        for (auto& n : nodes) {
            n->force = Vec3(0,0,0);
        }
    }
};

} // namespace fem
} // namespace realis
