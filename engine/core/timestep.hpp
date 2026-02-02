// Fixed timestep control
#pragma once

namespace realis {

class Timestep {
public:
    float dt;
    float current_time;
    
    Timestep(float dt = 0.01f);
    
    void advance();
    float get_dt() const;
    float get_current_time() const;
    void reset();
};

} // namespace realis