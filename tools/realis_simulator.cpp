#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include "../engine/core/world.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/geometry/box.hpp"
#include "../engine/geometry/sphere.hpp"
#include "../engine/geometry/convex_hull.hpp"
#include "../engine/core/integrator.hpp"
#include "../engine/constraints/distance_constraint.hpp"
#include "../engine/constraints/fixed_constraint.hpp"

using namespace realis;

int main() {
    // We use a simple line-based protocol for Phase 2 integration
    // Protocol:
    // SET_DT [float]
    // SET_DURATION [float]
    // ADD_BOX [id] [px] [py] [pz] [rx] [ry] [rz] [hx] [hy] [hz] [mass] [restitution] [friction] [is_static]
    // ADD_SPHERE [id] [px] [py] [pz] [rx] [ry] [rz] [radius] [mass] [restitution] [friction] [is_static]
    // RUN

    float dt = 0.01f;
    float duration = 2.0f;
    World world(dt);
    
    // Using Semi-Implicit Euler for better stability
    SemiImplicitEuler integrator;
    world.set_integrator(&integrator);

    std::vector<std::string> objectIds;
    std::string line;
    
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        std::stringstream ss(line);
        std::string cmd;
        ss >> cmd;

        if (cmd == "SET_DT") {
            ss >> dt;
            // Re-init world with new dt if needed, but World constructor takes it.
            // For now, we manually advance world time.
        } else if (cmd == "SET_DURATION") {
            ss >> duration;
        } else if (cmd == "ADD_BOX") {
            std::string id;
            float px, py, pz, rx, ry, rz, hx, hy, hz, mass, rest, fric;
            int is_static;
            ss >> id >> px >> py >> pz >> rx >> ry >> rz >> hx >> hy >> hz >> mass >> rest >> fric >> is_static;
            
            auto* body = new RigidBody();
            body->position = Vec3(px, py, pz);
            // Conversion from Euler rx, ry, rz to Quaternion (Simplified for demo)
            body->orientation = Quat::from_euler(rx, ry, rz);
            body->mass = mass;
            body->inv_mass = is_static ? 0.0f : (mass > 0 ? 1.0f / mass : 0.0f);
            body->restitution = rest;
            body->friction = fric;
            body->shape = new geometry::Box(Vec3(hx, hy, hz));
            
            world.add_body(body);
            objectIds.push_back(id);
        } else if (cmd == "ADD_SPHERE") {
             std::string id;
            float px, py, pz, rx, ry, rz, radius, mass, rest, fric;
            int is_static;
            ss >> id >> px >> py >> pz >> rx >> ry >> rz >> radius >> mass >> rest >> fric >> is_static;
            
            auto* body = new RigidBody();
            body->position = Vec3(px, py, pz);
            body->orientation = Quat::from_euler(rx, ry, rz);
            body->mass = mass;
            body->inv_mass = is_static ? 0.0f : (mass > 0 ? 1.0f / mass : 0.0f);
            body->restitution = rest;
            body->friction = fric;
            body->shape = new geometry::Sphere(radius);
            
            world.add_body(body);
            objectIds.push_back(id);
        } else if (cmd == "ADD_HULL") {
            std::string id;
            float px, py, pz, rx, ry, rz, mass, rest, fric;
            int is_static, num_verts;
            ss >> id >> px >> py >> pz >> rx >> ry >> rz >> mass >> rest >> fric >> is_static >> num_verts;
            
            std::vector<Vec3> verts;
            for (int i = 0; i < num_verts; ++i) {
                float vx, vy, vz;
                // We assume vertices are supplied on the next line or same line for simplicity
                // Let's assume they are on the same line following num_verts
                ss >> vx >> vy >> vz;
                verts.push_back(Vec3(vx, vy, vz));
            }

            auto* body = new RigidBody();
            body->position = Vec3(px, py, pz);
            body->orientation = Quat::from_euler(rx, ry, rz);
            body->mass = mass;
            body->inv_mass = is_static ? 0.0f : (mass > 0 ? 1.0f / mass : 0.0f);
            body->restitution = rest;
            body->friction = fric;
            body->shape = new geometry::ConvexHull(verts);
            
            world.add_body(body);
            objectIds.push_back(id);
        } else if (cmd == "ADD_DISTANCE") {
            std::string idA, idB;
            float dist;
            ss >> idA >> idB >> dist;
            
            RigidBody *bodyA = nullptr, *bodyB = nullptr;
            for (size_t i = 0; i < objectIds.size(); ++i) {
                if (objectIds[i] == idA) bodyA = world.bodies[i];
                if (objectIds[i] == idB) bodyB = world.bodies[i];
            }
            
            if (bodyA && bodyB) {
                world.add_constraint(new DistanceConstraint(bodyA, bodyB, dist));
            }
        } else if (cmd == "ADD_FIXED") {
            std::string idA;
            float px, py, pz, ax, ay, az;
            ss >> idA >> px >> py >> pz >> ax >> ay >> az;
            
            RigidBody *bodyA = nullptr;
            for (size_t i = 0; i < objectIds.size(); ++i) {
                if (objectIds[i] == idA) bodyA = world.bodies[i];
            }
            
            if (bodyA) {
                world.add_constraint(new FixedConstraint1D(bodyA, Vec3(px, py, pz), Vec3(ax, ay, az)));
            }
        } else if (cmd == "RUN") {
            // Header for output
            std::cout << "START_SIMULATION" << std::endl;
            
            int steps = static_cast<int>(duration / dt);
            for (int i = 0; i <= steps; ++i) {
                float t = i * dt;
                std::cout << "FRAME " << t << std::endl;
                
                for (size_t j = 0; j < world.bodies.size(); ++j) {
                    RigidBody* b = world.bodies[j];
                    std::cout << "OBJ " << objectIds[j] << " "
                              << b->position.x << " " << b->position.y << " " << b->position.z << " "
                              << b->orientation.w << " " << b->orientation.x << " " << b->orientation.y << " " << b->orientation.z << " "
                              << b->velocity.x << " " << b->velocity.y << " " << b->velocity.z << " "
                              << b->angular_velocity.x << " " << b->angular_velocity.y << " " << b->angular_velocity.z << std::endl;
                }
                
                if (i < steps) world.step();
            }
            std::cout << "END_SIMULATION" << std::endl;
            break;
        }
    }

    return 0;
}
