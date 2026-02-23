// Numerical integrators
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "../math/vec3.hpp"
#include <vector>

namespace realis {

class Integrator {
public:
  virtual ~Integrator() = default;
  virtual void step(std::vector<RigidBody *> &bodies, float dt) = 0;
};

class SemiImplicitEuler : public Integrator {
public:
  void step(std::vector<RigidBody *> &bodies, float dt) override;
};

class ForwardEuler : public Integrator {
public:
  void step(std::vector<RigidBody *> &bodies, float dt) override;
};

} // namespace realis