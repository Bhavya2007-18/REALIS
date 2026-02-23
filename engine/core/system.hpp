// Unified State Space System Interface
#pragma once
#include <vector>

namespace realis {

class System {
public:
  virtual ~System() = default;

  // Abstract state vector access
  virtual std::vector<float> get_state() const = 0;
  virtual void set_state(const std::vector<float> &state) = 0;

  // Abstract derivative computation: dq/dt = f(q, t)
  virtual std::vector<float>
  compute_derivatives(const std::vector<float> &state, float t) = 0;
};

} // namespace realis
