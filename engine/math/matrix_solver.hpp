// Arbitrary-sized linear system solver (Ax = b)
#pragma once
#include <vector>

namespace realis {

class MatrixSolver {
public:
  // Solves Ax = b using Gaussian elimination with partial pivoting.
  // Returns true on success, false if matrix is singular.
  // A is assumed to be an n x n square matrix represented as a flat vector in
  // row-major order.
  static bool solve_gaussian(std::vector<float> &A, std::vector<float> &b,
                             std::vector<float> &x);
};

} // namespace realis
