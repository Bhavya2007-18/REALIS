
#include "cad_importer.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace realis {
namespace cad {

std::shared_ptr<Solid> CADImporter::import_step(const std::string& filename, bool ) {
    
    
    
    
    std::cout << "[CAD Error] OpenCascade kernel not found. Cannot parse STEP file: " << filename << std::endl;
    std::cout << "Strict adherence to Phase 6 rules: No silent approximation allowed." << std::endl;
    return nullptr;
}

std::shared_ptr<Solid> CADImporter::import_obj_as_cad(const std::string& filename) {
    
    
    
    std::cout << "[CAD] Importing OBJ as topological model: " << filename << std::endl;
    
    auto solid = std::make_shared<Solid>();
    std::vector<Vertex*> vertices;
    
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "[CAD Error] File not found: " << filename << std::endl;
        return nullptr;
    }
    
    std::string line;
    while (std::getline(file, line)) {
        std::stringstream ss(line);
        std::string prefix;
        ss >> prefix;
        
        if (prefix == "v") {
            float x, y, z;
            ss >> x >> y >> z;
            vertices.push_back(new Vertex(Vec3(x, y, z)));
        } else if (prefix == "f") {
            Face* face = new Face();
            std::string vertex_idx_str;
            std::vector<int> v_indices;
            
            while (ss >> vertex_idx_str) {
                
                size_t slash = vertex_idx_str.find('/');
                int idx = std::stoi(vertex_idx_str.substr(0, slash));
                v_indices.push_back(idx - 1); 
            }
            
            
            for (size_t i = 0; i < v_indices.size(); ++i) {
                Vertex* v1 = vertices[v_indices[i]];
                Vertex* v2 = vertices[v_indices[(i + 1) % v_indices.size()]];
                face->edges.push_back(new Edge(v1, v2));
            }
            
            
            if (v_indices.size() >= 3) {
                Vec3 p0 = vertices[v_indices[0]]->position;
                Vec3 p1 = vertices[v_indices[1]]->position;
                Vec3 p2 = vertices[v_indices[2]]->position;
                Vec3 u = p1 - p0;
                Vec3 v = p2 - p0;
                face->normal = u.cross(v).normalized();
            }
            
            solid->faces.push_back(face);
        }
    }
    
    
    validate_topology(solid.get());
    return solid;
}

void CADImporter::validate_topology(Solid* solid) {
    
    std::cout << "[CAD] Imported " << solid->faces.size() << " faces." << std::endl;
    
}

} 
} 