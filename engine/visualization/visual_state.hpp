// Visual State DTO (Immutable 2D Snapshot)
// Contains ONLY what the renderer needs to verify physics.
// No references to physics objects allowed.
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
    LINE // For constraints/links
};

struct VisualBody {
    int id;
    VisVec2 position;
    float orientation; // Radians, 2D (Z-axis rotation)
    
    VisShapeType shape;
    VisVec2 dimensions; // Radius (x) or Half-extents (x,y)
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
    // Energy info for HUD
    float kinetic_energy;
    float potential_energy;
    float total_energy;
};

} // namespace visualization
} // namespace realis
