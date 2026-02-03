// Visual Adapter (3D Physics -> 2D Snapshot)
// Projects authoritative 3D state onto 2D plane (XY)
#pragma once
#include "visual_state.hpp"
#include "../core/world.hpp"
#include "../dynamics/rigid_body.hpp"
#include "../geometry/sphere.hpp"
#include "../geometry/box.hpp"
#include "../energy/energy_monitor.hpp"

namespace realis {
namespace visualization {

class VisualAdapter {
public:
    static VisualFrame capture(const World& world, double time) {
        VisualFrame frame;
        frame.timestamp = time;
        // frame.step_count = ... need world to expose step count? Or accumulator.
        
        // 1. Capture Bodies
        for (const auto* body : world.bodies) {
            VisualBody vb;
            vb.id = 0; // Needs ID system? Pointers for now.
            vb.position = { body->position.x, body->position.y };
            
            // Extract Z-rotation from Quaternion
            // Axis-Angle approximation or decomposition
            // If strictly 2D planar (XY), then axis is Z.
            // q = [cos(t/2), 0, 0, sin(t/2)]
            // theta = 2 * atan2(z, w)
            vb.orientation = 2.0f * std::atan2(body->orientation.z, body->orientation.w);
            
            // Shape
            if (body->shape) {
                if (body->shape->type == geometry::ShapeType::SPHERE) {
                    vb.shape = VisShapeType::CIRCLE;
                    float r = static_cast<geometry::Sphere*>(body->shape)->radius;
                    vb.dimensions = { r, r };
                    vb.color = { 100, 200, 255, 255 }; // Light Blue
                } else if (body->shape->type == geometry::ShapeType::BOX) {
                    vb.shape = VisShapeType::BOX;
                    auto box = static_cast<geometry::Box*>(body->shape);
                    // Box stores HALF extents
                    vb.dimensions = { box->half_extents.x, box->half_extents.y };
                    vb.color = { 255, 150, 100, 255 }; // Orange
                }
            } else {
                vb.shape = VisShapeType::CIRCLE;
                vb.dimensions = { 0.1f, 0.1f }; // Default point mass
                vb.color = { 200, 200, 200, 255 };
            }
            
            if (body->inv_mass == 0.0f) vb.color = { 100, 100, 100, 255 }; // Static
            
            frame.bodies.push_back(vb);
            
            // Velocity Vectors (Debug)
            VisualDebugVector vel;
            vel.start = vb.position;
            vel.end = { vb.position.x + body->velocity.x * 0.1f, vb.position.y + body->velocity.y * 0.1f };
            vel.color = { 0, 255, 0, 255 }; // Green
            frame.debug_vectors.push_back(vel);
        }
        
        // 2. Capture Constraints (Linkages)
        // Check World constraint list
        for (const auto* c : world.constraints) {
             // If this is a Distance Constraint, draw a line
             // We need RTTI or type check.
             // For now, draw line between body centers.
             if (c->bodyA && c->bodyB) {
                 VisualDebugVector link;
                 link.start = { c->bodyA->position.x, c->bodyA->position.y };
                 link.end = { c->bodyB->position.x, c->bodyB->position.y };
                 link.color = { 255, 255, 255, 100 }; // White faint
                 frame.debug_vectors.push_back(link);
             }
        }
        
        // 3. Energy
        // 3. Energy
        // energy::EnergyMonitor monitor;
        // frame.total_energy = monitor.compute_total_energy(world.bodies, world.get_gravity());
        frame.total_energy = 0.0f;
        
        return frame;
    }
};

} // namespace visualization
} // namespace realis
