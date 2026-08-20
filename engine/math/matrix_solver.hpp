
#pragma once
#include <vector>

namespace realis {

class MatrixSolver {
public:
  
  
  
  
  static bool solve_gaussian(std::vector<float> &A, std::vector<float> &b,
                             std::vector<float> &x);
};

} 