#pragma once

#include <vector>
#include <string>
#include <memory>
#include <cstdint>
#include "system.hpp"
#include "timestep.hpp"
#include "../math/vec3.hpp"

namespace realis {

struct SimulationConfig {
    float dt = 0.01f;
    int sub_steps = 1;
    bool fixed_timestep = true;
    float max_dt = 0.1f;
    std::string integrator = "semi_implicit_euler";
    Vec3 gravity = {0, -9.81f, 0};
    bool enable_collision = true;
    bool enable_constraints = true;
    int constraint_iterations = 20;
    float baumgarte_beta = 0.2f;
    float penetration_slop = 0.005f;
    float max_correction = 0.1f;
};

struct SimulationState {
    float time = 0;
    uint64_t step_count = 0;
    bool paused = false;
    std::vector<float> system_state;
    std::vector<std::string> warnings;
};

struct SimulationSnapshot {
    SimulationState state;
    std::string metadata;
    std::vector<uint8_t> binary_blob;
};

class ISimulation {
public:
    virtual ~ISimulation() = default;

    virtual bool initialize(const SimulationConfig& config) = 0;
    virtual void step() = 0;
    virtual void step(float dt) = 0;
    virtual void reset() = 0;
    virtual void pause() = 0;
    virtual void resume() = 0;
    virtual bool is_paused() const = 0;

    virtual SimulationState get_state() const = 0;
    virtual void set_state(const SimulationState& state) = 0;

    virtual SimulationSnapshot serialize() const = 0;
    virtual bool deserialize(const SimulationSnapshot& snap) = 0;

    virtual void set_config(const SimulationConfig& config) = 0;
    virtual SimulationConfig get_config() const = 0;

    virtual float compute_energy() const = 0;
    virtual bool validate() const = 0;
    virtual std::vector<std::string> get_warnings() const = 0;
};

using SimPtr = std::shared_ptr<ISimulation>;

}