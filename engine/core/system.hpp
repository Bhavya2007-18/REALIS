
#pragma once
#include <vector>

namespace realis {

class System {
public:
  virtual ~System() = default;

  
  virtual std::vector<float> get_state() const = 0;
  virtual void set_state(const std::vector<float> &state) = 0;

  
  virtual std::vector<float>
  compute_derivatives(const std::vector<float> &state, float t) = 0;
};

} 