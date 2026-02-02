// Base constraint class
#pragma once

namespace realis {

class Constraint {
public:
    virtual void solve(float dt) = 0;
    virtual ~Constraint() = default;
};

} // namespace realis