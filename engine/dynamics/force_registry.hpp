// Force accumulation
#pragma once

namespace realis {

class ForceRegistry {
public:
    void clear();
    void apply_forces();
};

} // namespace realis