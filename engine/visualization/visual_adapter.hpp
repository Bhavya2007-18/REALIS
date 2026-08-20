

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
        
        
        
        for (const auto* body : world.bodies) {
            VisualBody vb;
            vb.id = 0; 
            vb.position = { body->position.x, body->position.y };
            
            
            
            
            
            
            vb.orientation = 2.0f * std::atan2(body->orientation.z, body->orientation.w);
            
            
            if (body->shape) {
                if (body->shape->type == geometry::ShapeType::SPHERE) {
                    vb.shape = VisShapeType::CIRCLE;
                    float r = static_cast<geometry::Sphere*>(body->shape)->radius;
                    vb.dimensions = { r, r };
                    vb.color = { 100, 200, 255, 255 }; 
                } else if (body->shape->type == geometry::ShapeType::BOX) {
                    vb.shape = VisShapeType::BOX;
                    auto box = static_cast<geometry::Box*>(body->shape);
                    
                    vb.dimensions = { box->half_extents.x, box->half_extents.y };
                    vb.color = { 255, 150, 100, 255 }; 
                }
            } else {
                vb.shape = VisShapeType::CIRCLE;
                vb.dimensions = { 0.1f, 0.1f }; 
                vb.color = { 200, 200, 200, 255 };
            }
            
            if (body->inv_mass == 0.0f) vb.color = { 100, 100, 100, 255 }; 
            
            frame.bodies.push_back(vb);
            
            
            VisualDebugVector vel;
            vel.start = vb.position;
            vel.end = { vb.position.x + body->velocity.x * 0.1f, vb.position.y + body->velocity.y * 0.1f };
            vel.color = { 0, 255, 0, 255 }; 
            frame.debug_vectors.push_back(vel);
        }
        
        
        
        for (const auto* c : world.constraints) {
             
             
             
             if (c->bodyA && c->bodyB) {
                 VisualDebugVector link;
                 link.start = { c->bodyA->position.x, c->bodyA->position.y };
                 link.end = { c->bodyB->position.x, c->bodyB->position.y };
                 link.color = { 255, 255, 255, 100 }; 
                 frame.debug_vectors.push_back(link);
             }
        }
        
        
        
        
        
        frame.total_energy = 0.0f;
        
        return frame;
    }
};

} 
} 