


#pragma once
#include <vector>
#include <string>
#include <cmath>

namespace realis {
namespace visualization {

struct VisVec2 {
    float x, y;
};

struct VisColor {
    uint8_t r, g, b, a;
};

enum class VisShapeType {
    CIRCLE,
    BOX,
    LINE 
};

struct VisualBody {
    int id;
    VisVec2 position;
    float orientation; 
    
    VisShapeType shape;
    VisVec2 dimensions; 
    VisColor color;
};

struct VisualDebugVector {
    VisVec2 start;
    VisVec2 end;
    VisColor color;
    std::string label;
};

struct VisualFrame {
    double timestamp;
    int step_count;
    std::vector<VisualBody> bodies;
    std::vector<VisualDebugVector> debug_vectors;
    
    float kinetic_energy;
    float potential_energy;
    float total_energy;
};

} 
} 