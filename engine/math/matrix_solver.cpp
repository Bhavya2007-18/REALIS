// Matrix solver implementation
#include "matrix_solver.hpp"
#include <algorithm>
#include <cmath>


namespace realis {

bool MatrixSolver::solve_gaussian(std::vector<float> &A, std::vector<float> &b,
                                  std::vector<float> &x) {
  int n = b.size();
  if (n == 0)
    return true;
  if (A.size() != static_cast<size_t>(n * n))
    return false;

  x.assign(n, 0.0f);

  // Create a working augmented matrix [A | b]
  std::vector<std::vector<float>> aug(n, std::vector<float>(n + 1));
  for (int i = 0; i < n; ++i) {
    for (int j = 0; j < n; ++j) {
      aug[i][j] = A[i * n + j];
    }
    aug[i][n] = b[i];
  }

  // Forward elimination with partial pivoting
  for (int k = 0; k < n; ++k) {
    // Find pivot
    int pivot_row = k;
    float max_val = std::abs(aug[k][k]);

    for (int i = k + 1; i < n; ++i) {
      float val = std::abs(aug[i][k]);
      if (val > max_val) {
        max_val = val;
        pivot_row = i;
      }
    }

    // Singular matrix check
    if (max_val < 1e-6f) {
      return false;
    }

    // Swap rows
    if (pivot_row != k) {
      std::swap(aug[k], aug[pivot_row]);
    }

    // Eliminate column k for rows below
    for (int i = k + 1; i < n; ++i) {
      float factor = aug[i][k] / aug[k][k];
      for (int j = k; j <= n; ++j) {
        aug[i][j] -= factor * aug[k][j];
      }
    }
  }

  // Backward substitution
  for (int i = n - 1; i >= 0; --i) {
    float sum = 0.0f;
    for (int j = i + 1; j < n; ++j) {
      sum += aug[i][j] * x[j];
    }
    x[i] = (aug[i][n] - sum) / aug[i][i];
  }

  return true;
}

} // namespace realis
