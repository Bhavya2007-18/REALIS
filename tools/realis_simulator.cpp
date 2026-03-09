#include "../engine/constraints/angular_constraint.hpp"
#include "../engine/constraints/distance_constraint.hpp"
#include "../engine/constraints/point_constraint.hpp"
#include "../engine/core/integrator.hpp"
#include "../engine/core/world.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/geometry/box.hpp"
#include "../engine/geometry/convex_hull.hpp"
#include "../engine/geometry/sphere.hpp"
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

using namespace realis;

int main() {
  float dt = 0.01f;
  float duration = 2.0f;
  int sub_steps = 1;
  World world(dt);

  SemiImplicitEuler integrator;
  world.set_integrator(&integrator);

  std::vector<std::string> objectIds;
  std::string line;

  while (std::getline(std::cin, line)) {
    if (line.empty())
      continue;
    std::stringstream ss(line);
    std::string cmd;
    ss >> cmd;

    if (cmd == "SET_DT") {
      ss >> dt;
    } else if (cmd == "SET_DURATION") {
      ss >> duration;
    } else if (cmd == "SET_SUBSTEPS") {
      ss >> sub_steps;
    } else if (cmd == "SET_GRAVITY") {
      float gx, gy, gz;
      ss >> gx >> gy >> gz;
      // Gravity is currently handled by Force Fields or individual bodies
    } else if (cmd == "ADD_BOX") {
      std::string id;
      float px, py, pz, rx, ry, rz, hx, hy, hz, mass, rest, fric;
      int is_static;
      ss >> id >> px >> py >> pz >> rx >> ry >> rz >> hx >> hy >> hz >> mass >>
          rest >> fric >> is_static;

      auto *body = new RigidBody();
      body->position = Vec3(px, py, pz);
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
      ss >> id >> px >> py >> pz >> rx >> ry >> rz >> radius >> mass >> rest >>
          fric >> is_static;

      auto *body = new RigidBody();
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
      ss >> id >> px >> py >> pz >> rx >> ry >> rz >> mass >> rest >> fric >>
          is_static >> num_verts;
      std::vector<Vec3> verts;
      for (int i = 0; i < num_verts; ++i) {
        float vx, vy, vz;
        ss >> vx >> vy >> vz;
        verts.push_back(Vec3(vx, vy, vz));
      }
      auto *body = new RigidBody();
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
        if (objectIds[i] == idA)
          bodyA = world.bodies[i];
        if (objectIds[i] == idB)
          bodyB = world.bodies[i];
      }
      if (bodyA && bodyB)
        world.add_constraint(new DistanceConstraint(bodyA, bodyB, dist));
    } else if (cmd == "ADD_POINT_JOINT") {
      std::string idA, idB;
      float pax, pay, paz, pbx, pby, pbz;
      ss >> idA >> idB >> pax >> pay >> paz >> pbx >> pby >> pbz;
      RigidBody *bodyA = nullptr, *bodyB = nullptr;
      for (size_t i = 0; i < objectIds.size(); ++i) {
        if (objectIds[i] == idA)
          bodyA = world.bodies[i];
        if (objectIds[i] == idB)
          bodyB = world.bodies[i];
      }
      if (bodyA && bodyB) {
        world.add_constraint(new PointConstraint(
            bodyA, bodyB, Vec3(pax, pay, paz), Vec3(pbx, pby, pbz), 0));
        world.add_constraint(new PointConstraint(
            bodyA, bodyB, Vec3(pax, pay, paz), Vec3(pbx, pby, pbz), 1));
        world.add_constraint(new PointConstraint(
            bodyA, bodyB, Vec3(pax, pay, paz), Vec3(pbx, pby, pbz), 2));
      }
    } else if (cmd == "ADD_ANGULAR_JOINT") {
      std::string idA, idB;
      float ax, ay, az;
      ss >> idA >> idB >> ax >> ay >> az;
      RigidBody *bodyA = nullptr, *bodyB = nullptr;
      for (size_t i = 0; i < objectIds.size(); ++i) {
        if (objectIds[i] == idA)
          bodyA = world.bodies[i];
        if (objectIds[i] == idB)
          bodyB = world.bodies[i];
      }
      if (bodyA && bodyB)
        world.add_constraint(
            new AngularConstraint(bodyA, bodyB, Vec3(ax, ay, az)));
    } else if (cmd == "RUN") {
      std::cout << "START_SIMULATION" << std::endl;
      int steps = static_cast<int>(duration / dt);
      for (int i = 0; i <= steps; ++i) {
        float t = i * dt;
        std::cout << "FRAME " << t << std::endl;
        for (size_t j = 0; j < world.bodies.size(); ++j) {
          RigidBody *b = world.bodies[j];
          std::cout << "OBJ " << objectIds[j] << " " << b->position.x << " "
                    << b->position.y << " " << b->position.z << " "
                    << b->orientation.w << " " << b->orientation.x << " "
                    << b->orientation.y << " " << b->orientation.z << " "
                    << b->velocity.x << " " << b->velocity.y << " "
                    << b->velocity.z << " " << b->angular_velocity.x << " "
                    << b->angular_velocity.y << " " << b->angular_velocity.z
                    << std::endl;
        }
        if (i < steps) {
          for (int s = 0; s < sub_steps; s++) {
            world.step();
            // For the current i-th frame, we only report the final state after
            // sub-steps. However, we can also report all contacts that happened
            // in the last step.
          }
          // Output contacts for the current frame
          for (const auto &contact : world.last_contacts) {
            // Find body IDs
            std::string idA = "?", idB = "?";
            for (size_t k = 0; k < world.bodies.size(); k++) {
              if (world.bodies[k] == contact.body_a)
                idA = objectIds[k];
              if (world.bodies[k] == contact.body_b)
                idB = objectIds[k];
            }
            std::cout << "CONTACT " << idA << " " << idB << " "
                      << contact.point.x << " " << contact.point.y << " "
                      << contact.point.z << std::endl;
          }
        }
      }
      std::cout << "END_SIMULATION" << std::endl;
      break;
    }
  }
  return 0;
}
