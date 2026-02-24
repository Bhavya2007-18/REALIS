// Constraint Solver implementation
#include "constraint_solver.hpp"
#include "../math/matrix_solver.hpp"
#include <cmath>

namespace realis {

void ConstraintSolver::solve(std::vector<Constraint *> &constraints, float dt) {
  if (constraints.empty())
    return;

  int n = constraints.size();

  // 1. Pre-step: compute Jacobians, C_val, J_dot_v
  for (auto c : constraints) {
    c->pre_step(dt);
  }

  // 2. Build block matrix A_c = J * M^-1 * J^T
  std::vector<float> A(n * n, 0.0f);
  std::vector<float> b(n, 0.0f);

  for (int i = 0; i < n; ++i) {
    Constraint *c_i = constraints[i];

    // J M^-1 F_ext
    float j_m_f = 0.0f;
    // J v (which is \dot{C})
    float j_v = 0.0f;

    if (c_i->bodyA && c_i->bodyA->inv_mass > 0) {
      j_m_f += c_i->linearA.dot(c_i->bodyA->force * c_i->bodyA->inv_mass);
      j_v += c_i->linearA.dot(c_i->bodyA->velocity);
    }
    if (c_i->bodyB && c_i->bodyB->inv_mass > 0) {
      j_m_f += c_i->linearB.dot(c_i->bodyB->force * c_i->bodyB->inv_mass);
      j_v += c_i->linearB.dot(c_i->bodyB->velocity);
    }

    // Baumgarte stabilization: a = - kp * C - kd * \dot{C}
    // For dt = 0.01, kp around 400, kd around 40 provides good critical
    // damping.
    float kp = 400.0f;
    float kd = 40.0f;
    float stabilization = kp * c_i->C_val + kd * j_v;

    // RHS: - J M^-1 F - \dot{J}v - stabilization
    b[i] = -(j_m_f + c_i->J_dot_v + stabilization);

    for (int j = 0; j < n; ++j) {
      Constraint *c_j = constraints[j];

      float val = 0.0f;

      // Check interaction if constraints share a body
      if (c_i->bodyA == c_j->bodyA && c_i->bodyA && c_i->bodyA->inv_mass > 0) {
        val += c_i->linearA.dot(c_j->linearA) * c_i->bodyA->inv_mass;
      }
      if (c_i->bodyA == c_j->bodyB && c_i->bodyA && c_i->bodyA->inv_mass > 0) {
        val += c_i->linearA.dot(c_j->linearB) * c_i->bodyA->inv_mass;
      }
      if (c_i->bodyB == c_j->bodyA && c_i->bodyB && c_i->bodyB->inv_mass > 0) {
        val += c_i->linearB.dot(c_j->linearA) * c_i->bodyB->inv_mass;
      }
      if (c_i->bodyB == c_j->bodyB && c_i->bodyB && c_i->bodyB->inv_mass > 0) {
        val += c_i->linearB.dot(c_j->linearB) * c_i->bodyB->inv_mass;
      }

      A[i * n + j] = val;
    }
  }

  // 3. Solve exact multipliers
  std::vector<float> lambda(n, 0.0f);
  if (!MatrixSolver::solve_gaussian(A, b, lambda)) {
    // Fallback or handle singular matrix (e.g. redundant constraints)
    // For Phase 2A, assume well-posed full row-rank constraints
  }

  // 4. Apply continuous constraint forces
  for (int i = 0; i < n; ++i) {
    constraints[i]->lambda = lambda[i]; // Store exact multiplier
    constraints[i]->apply_constraint_force(lambda[i]);
  }
}

} // namespace realis
