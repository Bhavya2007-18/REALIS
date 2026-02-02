// Constraint Solver (Projected Gauss-Seidel)
#pragma once
#include "constraint.hpp"
#include <vector>

namespace realis {

class ConstraintSolver {
public:
    int iterations;

    ConstraintSolver(int iters = 10) : iterations(iters) {}

    void solve(std::vector<Constraint*>& constraints, float dt);
};

} // namespace realis
