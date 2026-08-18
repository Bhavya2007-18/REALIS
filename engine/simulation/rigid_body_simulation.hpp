#pragma once

#include "../core/simulation.hpp"
#include "../core/world.hpp"
#include "../core/integrator.hpp"
#include "../collision/solver.hpp"
#include "../collision/broadphase.hpp"
#include "../collision/narrowphase.hpp"
#include "../constraints/constraint_solver.hpp"
#include "../dynamics/rigid_body.hpp"
#include "../dynamics/force_field.hpp"
#include "../dynamics/uniform_gravity.hpp"
#include "../geometry/sphere.hpp"
#include "../geometry/box.hpp"
#include "../geometry/plane.hpp"
#include <vector>
#include <memory>
#include <string>
#include <unordered_map>
#include <cmath>

namespace realis {

struct BodyDef {
    std::string id;
    Vec3 position = {0, 0, 0};
    Vec3 velocity = {0, 0, 0};
    Vec3 angular_velocity = {0, 0, 0};
    Quat orientation = {1, 0, 0, 0};
    float mass = 1.0f;
    float restitution = 0.5f;
    float friction = 0.3f;
    bool is_static = false;
    std::string shape_type = "sphere";
    Vec3 half_extents = {0.5f, 0.5f, 0.5f};
    float radius = 0.5f;
    std::string material_id = "";
};

struct ConstraintDef {
    std::string id;
    std::string type = "distance";
    std::string body_a;
    std::string body_b;
    Vec3 anchor_a = {0, 0, 0};
    Vec3 anchor_b = {0, 0, 0};
    Vec3 axis = {0, 0, 1};
    float distance = 1.0f;
    bool motor_enabled = false;
    float target_velocity = 0.0f;
    float max_force = 1000.0f;
    float min_limit = -1e20f;
    float max_limit = 1e20f;
};

struct ContactInfo {
    std::string body_a;
    std::string body_b;
    Vec3 point;
    Vec3 normal;
    float penetration;
    float restitution;
    float friction;
};

struct FrameOutput {
    float time = 0;
    std::vector<BodyState> bodies;
    std::vector<ContactInfo> contacts;
    float energy = 0;
    float kinetic_energy = 0;
    float potential_energy = 0;
};

struct BodyState {
    std::string id;
    Vec3 position;
    Quat orientation;
    Vec3 linear_velocity;
    Vec3 angular_velocity;
    Vec3 force;
    Vec3 torque;
    bool sleeping = false;
    bool on_ground = false;
};

class RigidBodySimulation : public ISimulation {
public:
    RigidBodySimulation();
    ~RigidBodySimulation() override;

    bool initialize(const SimulationConfig& config) override;
    void step() override;
    void step(float dt) override;
    void reset() override;
    void pause() override;
    void resume() override;
    bool is_paused() const override;

    SimulationState get_state() const override;
    void set_state(const SimulationState& state) override;

    SimulationSnapshot serialize() const override;
    bool deserialize(const SimulationSnapshot& snap) override;

    void set_config(const SimulationConfig& config) override;
    SimulationConfig get_config() const override;

    float compute_energy() const override;
    bool validate() const override;
    std::vector<std::string> get_warnings() const override;

    void add_body(const BodyDef& def);
    void remove_body(const std::string& id);
    void add_constraint(const ConstraintDef& def);
    void remove_constraint(const std::string& id);
    void clear();

    FrameOutput get_frame_output() const;
    std::vector<BodyState> get_body_states() const;
    std::vector<ContactInfo> get_contacts() const;

    void apply_force(const std::string& body_id, const Vec3& force);
    void apply_torque(const std::string& body_id, const Vec3& torque);
    void set_body_velocity(const std::string& body_id, const Vec3& vel);
    void set_body_angular_velocity(const std::string& body_id, const Vec3& ang_vel);

    bool has_body(const std::string& id) const;
    RigidBody* get_body(const std::string& id);
    const RigidBody* get_body(const std::string& id) const;

private:
    void setup_integrator();
    void setup_shapes();
    void step_substeps(float dt);
    void detect_and_resolve_collisions();
    void solve_constraints(float dt);
    void apply_gravity();
    void update_sleeping(float dt);
    void validate_bodies();
    void sync_body_shapes();

    World world;
    SimulationConfig config;
    SimulationState state;
    std::vector<std::string> warnings;
    std::unique_ptr<Integrator> integrator;
    std::unique_ptr<UniformGravity> gravity_field;
    std::unordered_map<std::string, std::unique_ptr<geometry::Shape>> shapes;
    std::unordered_map<std::string, BodyDef> body_defs;
    std::unordered_map<std::string, ConstraintDef> constraint_defs;
    std::vector<ContactInfo> last_contacts;
    std::vector<BodyDef> initial_bodies;
    std::vector<ConstraintDef> initial_constraints;
    bool initialized = false;
};

} // namespace realis