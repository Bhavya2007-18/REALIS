// Physics world container
#pragma once
#include "../constraints/constraint.hpp"
#include "../constraints/constraint_solver.hpp"
#include "../dynamics/force_field.hpp"
#include "../math/vec3.hpp"
#include "system.hpp"
#include "timestep.hpp"
#include <vector>

namespace realis {

class RigidBody;  // Forward declaration
class Integrator; // Forward declaration

class World : public System {
public:
  // Construction
  World(float dt = 0.01f);
  ~World();

  // Simulation
  void step();
  float compute_energy() const;
  Vec3 compute_angular_momentum() const;
  void log_state() const;

  // Setup
  void add_constraint(Constraint *c);
  void add_body(RigidBody *body);
  void remove_body(RigidBody *body);
  void add_force_field(ForceField *field);
  void set_integrator(Integrator *integrator);

  // State access
  float get_time() const;
  // System interface overrides
  std::vector<float> get_state() const override;
  void set_state(const std::vector<float> &state) override;
  std::vector<float> compute_derivatives(const std::vector<float> &state,
                                         float t) override;

  // Public for easy access in demos/adapters for now
  std::vector<RigidBody *> bodies;
  std::vector<Constraint *> constraints;
  std::vector<ForceField *> force_fields;

private:
  Timestep timestep;
  ConstraintSolver constraint_solver;
  Integrator *integrator;
};

} // namespace realis