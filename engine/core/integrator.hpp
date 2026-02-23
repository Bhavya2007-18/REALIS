// Numerical integrators
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "../math/vec3.hpp"
#include "system.hpp"
#include <vector>

namespace realis {

class Integrator {
public:
  virtual ~Integrator() = default;

  // Abstract step on generic state vector
  virtual void step(System &sys, float dt) = 0;
};

class SemiImplicitEuler : public Integrator {
public:
  void step(System &sys, float dt) override;
};

class ForwardEuler : public Integrator {
public:
  void step(System &sys, float dt) override;
};

class RK4Integrator : public Integrator {
public:
  void step(System &sys, float dt) override;
};

} // namespace realis