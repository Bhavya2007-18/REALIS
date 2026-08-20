#include "rigid_body_simulation.hpp"
#include <algorithm>
#include <cmath>
#include <sstream>
#include <iostream>

namespace realis {

RigidBodySimulation::RigidBodySimulation()
    : world(0.01f), initialized(false) {
    gravity_field = std::make_unique<UniformGravity>(Vec3(0, -9.81f, 0));
    world.add_force_field(gravity_field.get());
}

RigidBodySimulation::~RigidBodySimulation() = default;

bool RigidBodySimulation::initialize(const SimulationConfig& cfg) {
    config = cfg;
    gravity_field->gravity = config.gravity;
    setup_integrator();
    
    for (const auto& def : initial_bodies) {
        add_body(def);
    }
    for (const auto& def : initial_constraints) {
        add_constraint(def);
    }
    
    setup_shapes();
    sync_body_shapes();
    
    state.time = 0;
    state.step_count = 0;
    state.paused = false;
    state.system_state = world.get_state();
    state.warnings.clear();
    warnings.clear();
    initialized = true;
    
    return true;
}

void RigidBodySimulation::setup_integrator() {
    if (config.integrator == "rk4") {
        integrator = std::make_unique<RK4Integrator>();
    } else if (config.integrator == "forward_euler") {
        integrator = std::make_unique<ForwardEuler>();
    } else {
        integrator = std::make_unique<SemiImplicitEuler>();
    }
    world.set_integrator(integrator.get());
}

void RigidBodySimulation::setup_shapes() {
    shapes.clear();
    for (const auto& [id, def] : body_defs) {
        if (def.shape_type == "sphere") {
            auto sphere = std::make_unique<geometry::Sphere>();
            sphere->radius = def.radius;
            shapes[id] = std::move(sphere);
        } else if (def.shape_type == "box") {
            auto box = std::make_unique<geometry::Box>();
            box->half_extents = def.half_extents;
            shapes[id] = std::move(box);
        } else if (def.shape_type == "plane") {
            auto plane = std::make_unique<geometry::Plane>();
            plane->normal = Vec3(0, 1, 0);
            plane->d = 0;
            shapes[id] = std::move(plane);
        }
    }
}

void RigidBodySimulation::sync_body_shapes() {
    for (auto* body : world.bodies) {
        auto it = body_defs.find(body->id);
        if (it != body_defs.end()) {
            auto shape_it = shapes.find(it->first);
            if (shape_it != shapes.end()) {
                body->shape = shape_it->second.get();
            }
        }
    }
}

void RigidBodySimulation::step() {
    if (state.paused || !initialized) return;
    step_substeps(config.dt);
}

void RigidBodySimulation::step(float dt) {
    if (state.paused || !initialized) return;
    float clamped_dt = std::min(dt, config.max_dt);
    step_substeps(clamped_dt);
}

void RigidBodySimulation::step_substeps(float dt) {
    int sub = std::max(1, config.sub_steps);
    float sub_dt = dt / sub;
    
    for (int i = 0; i < sub; ++i) {
        world.timestep.dt = sub_dt;
        
        apply_gravity();
        
        if (integrator) {
            integrator->step(world, sub_dt);
        }
        
        if (config.enable_collision) {
            detect_and_resolve_collisions();
        }
        
        if (config.enable_constraints && !world.constraints.empty()) {
            world.constraint_solver.solve(world.constraints, sub_dt);
        }
        
        update_sleeping(sub_dt);
        validate_bodies();
        
        world.timestep.advance();
    }
    
    state.time = world.get_time();
    state.step_count++;
    state.system_state = world.get_state();
}

void RigidBodySimulation::apply_gravity() {
    gravity_field->gravity = config.gravity;
}

void RigidBodySimulation::detect_and_resolve_collisions() {
    std::vector<Contact> contacts;
    std::vector<BroadPhasePair> pairs = BroadPhase::detect(world.bodies);
    
    for (const auto& pair : pairs) {
        Contact contact = NarrowPhase::generate_contact(pair.a, pair.b);
        if (contact.colliding) {
            contacts.push_back(contact);
        }
    }
    
    world.last_contacts = contacts;
    ContactSolver::solve_contacts(contacts);
    
    last_contacts.clear();
    for (const auto& c : contacts) {
        last_contacts.push_back({
            c.body_a ? c.body_a->id : "",
            c.body_b ? c.body_b->id : "",
            c.point,
            c.normal,
            c.penetration,
            c.restitution,
            c.friction
        });
    }
}

void RigidBodySimulation::solve_constraints(float dt) {
    if (!world.constraints.empty()) {
        world.constraint_solver.solve(world.constraints, dt);
    }
}

void RigidBodySimulation::update_sleeping(float dt) {
    const float sleep_vel_threshold = 0.01f;
    const float sleep_ang_threshold = 0.01f;
    const float sleep_time_threshold = 0.5f;
    
    for (auto* body : world.bodies) {
        if (body->inv_mass == 0) continue;
        
        float v2 = body->velocity.dot(body->velocity);
        float w2 = body->angular_velocity.dot(body->angular_velocity);
        
        if (v2 < sleep_vel_threshold * sleep_vel_threshold && 
            w2 < sleep_ang_threshold * sleep_ang_threshold) {
            body->sleep_timer += dt;
            if (body->sleep_timer >= sleep_time_threshold) {
                body->sleeping = true;
            }
        } else {
            body->sleep_timer = 0;
            body->sleeping = false;
        }
    }
}

void RigidBodySimulation::validate_bodies() {
    warnings.clear();
    for (auto* body : world.bodies) {
        if (std::isnan(body->position.x) || std::isinf(body->position.x) ||
            std::isnan(body->position.y) || std::isinf(body->position.y) ||
            std::isnan(body->position.z) || std::isinf(body->position.z)) {
            warnings.push_back("Body " + body->id + ": NaN/Inf position");
            body->position = Vec3(0, 0, 0);
            body->velocity = Vec3(0, 0, 0);
        }
        if (std::isnan(body->velocity.x) || std::isinf(body->velocity.x) ||
            std::isnan(body->velocity.y) || std::isinf(body->velocity.y) ||
            std::isnan(body->velocity.z) || std::isinf(body->velocity.z)) {
            warnings.push_back("Body " + body->id + ": NaN/Inf velocity");
            body->velocity = Vec3(0, 0, 0);
        }
        if (std::isnan(body->angular_velocity.x) || std::isinf(body->angular_velocity.x) ||
            std::isnan(body->angular_velocity.y) || std::isinf(body->angular_velocity.y) ||
            std::isnan(body->angular_velocity.z) || std::isinf(body->angular_velocity.z)) {
            warnings.push_back("Body " + body->id + ": NaN/Inf angular velocity");
            body->angular_velocity = Vec3(0, 0, 0);
        }
        
        float vmax = 500.0f;
        float v2 = body->velocity.dot(body->velocity);
        if (v2 > vmax * vmax) {
            body->velocity = body->velocity.normalized() * vmax;
            warnings.push_back("Body " + body->id + ": velocity clamped");
        }
    }
}

void RigidBodySimulation::reset() {
    world = World(config.dt);
    world.add_force_field(gravity_field.get());
    setup_integrator();
    
    body_defs.clear();
    constraint_defs.clear();
    shapes.clear();
    last_contacts.clear();
    
    for (const auto& def : initial_bodies) {
        add_body(def);
    }
    for (const auto& def : initial_constraints) {
        add_constraint(def);
    }
    
    setup_shapes();
    sync_body_shapes();
    
    state.time = 0;
    state.step_count = 0;
    state.paused = false;
    state.system_state = world.get_state();
    state.warnings.clear();
    warnings.clear();
}

void RigidBodySimulation::pause() {
    state.paused = true;
}

void RigidBodySimulation::resume() {
    state.paused = false;
}

bool RigidBodySimulation::is_paused() const {
    return state.paused;
}

SimulationState RigidBodySimulation::get_state() const {
    return state;
}

void RigidBodySimulation::set_state(const SimulationState& s) {
    state = s;
    world.set_state(s.system_state);
    state.time = world.get_time();
}

SimulationSnapshot RigidBodySimulation::serialize() const {
    SimulationSnapshot snap;
    snap.state = state;
    
    std::ostringstream meta;
    meta << "{\"version\":1,\"config_hash\":\"" << std::hash<std::string>{}(config.integrator) 
         << "\",\"body_count\":" << body_defs.size() 
         << ",\"constraint_count\":" << constraint_defs.size() << "}";
    snap.metadata = meta.str();
    
    snap.binary_blob.assign(
        reinterpret_cast<const uint8_t*>(state.system_state.data()),
        reinterpret_cast<const uint8_t*>(state.system_state.data()) + state.system_state.size() * sizeof(float)
    );
    
    return snap;
}

bool RigidBodySimulation::deserialize(const SimulationSnapshot& snap) {
    if (snap.binary_blob.size() != state.system_state.size() * sizeof(float)) {
        warnings.push_back("Snapshot size mismatch");
        return false;
    }
    
    std::vector<float> restored_state(state.system_state.size());
    std::memcpy(restored_state.data(), snap.binary_blob.data(), snap.binary_blob.size());
    world.set_state(restored_state);
    state = snap.state;
    state.system_state = restored_state;
    
    return true;
}

void RigidBodySimulation::set_config(const SimulationConfig& cfg) {
    config = cfg;
    gravity_field->gravity = config.gravity;
    setup_integrator();
}

SimulationConfig RigidBodySimulation::get_config() const {
    return config;
}

float RigidBodySimulation::compute_energy() const {
    return world.compute_energy();
}

bool RigidBodySimulation::validate() const {
    for (const auto* body : world.bodies) {
        if (std::isnan(body->position.x) || std::isinf(body->position.x) ||
            std::isnan(body->velocity.x) || std::isinf(body->velocity.x)) {
            return false;
        }
    }
    return true;
}

std::vector<std::string> RigidBodySimulation::get_warnings() const {
    return warnings;
}

void RigidBodySimulation::add_body(const BodyDef& def) {
    if (has_body(def.id)) return;
    
    auto* body = new RigidBody();
    body->id = def.id;
    body->position = def.position;
    body->velocity = def.velocity;
    body->angular_velocity = def.angular_velocity;
    body->orientation = def.orientation;
    body->mass = def.mass;
    body->inv_mass = def.is_static || def.mass <= 0.001f ? 0.0f : 1.0f / def.mass;
    body->restitution = def.restitution;
    body->friction = def.friction;
    body->orientation.normalize();
    
    if (def.shape_type == "sphere") {
        float r = def.radius;
        body->inertia_tensor = Mat3::identity() * (0.4f * def.mass * r * r);
    } else if (def.shape_type == "box") {
        Vec3 h = def.half_extents;
        float m = def.mass;
        body->inertia_tensor = Mat3(
            m/3.0f * (h.y*h.y + h.z*h.z), 0, 0,
            0, m/3.0f * (h.x*h.x + h.z*h.z), 0,
            0, 0, m/3.0f * (h.x*h.x + h.y*h.y)
        );
    } else {
        body->inertia_tensor = Mat3::identity() * (def.mass * 0.1f);
    }
    body->inv_inertia_tensor = body->inertia_tensor.inverse();
    
    world.add_body(body);
    body_defs[def.id] = def;
    initial_bodies.push_back(def);
}

void RigidBodySimulation::remove_body(const std::string& id) {
    auto it = body_defs.find(id);
    if (it != body_defs.end()) {
        RigidBody* body = nullptr;
        for (auto* b : world.bodies) {
            if (b->id == id) { body = b; break; }
        }
        if (body) world.remove_body(body);
        body_defs.erase(it);
        
        auto init_it = std::find_if(initial_bodies.begin(), initial_bodies.end(),
            [&id](const BodyDef& d) { return d.id == id; });
        if (init_it != initial_bodies.end()) initial_bodies.erase(init_it);
    }
}

void RigidBodySimulation::add_constraint(const ConstraintDef& def) {
    RigidBody* body_a = get_body(def.body_a);
    RigidBody* body_b = def.body_b.empty() ? nullptr : get_body(def.body_b);
    if (!body_a || (!def.body_b.empty() && !body_b)) return;
    
    Constraint* constraint = nullptr;
    
    if (def.type == "distance" || def.type == "stick") {
        constraint = new DistanceConstraint(body_a, body_b);
        static_cast<DistanceConstraint*>(constraint)->distance = def.distance;
    } else if (def.type == "fixed") {
        constraint = new FixedConstraint(body_a, body_b);
    } else if (def.type == "hinge" || def.type == "revolute") {
        constraint = new HingeConstraint(body_a, body_b);
        static_cast<HingeConstraint*>(constraint)->axis = def.axis;
    } else if (def.type == "slider" || def.type == "prismatic") {
        constraint = new SliderConstraint(body_a, body_b);
        static_cast<SliderConstraint*>(constraint)->axis = def.axis;
    } else if (def.type == "spring") {
        constraint = new SpringConstraint(body_a, body_b);
        static_cast<SpringConstraint*>(constraint)->stiffness = 100.0f;
        static_cast<SpringConstraint*>(constraint)->damping = 5.0f;
        static_cast<SpringConstraint*>(constraint)->rest_length = def.distance;
    }
    
    if (constraint) {
        constraint->motorEnabled = def.motor_enabled;
        constraint->targetVelocity = def.target_velocity;
        constraint->maxForce = def.max_force;
        constraint->minLambda = def.min_limit;
        constraint->maxLambda = def.max_limit;
        
        world.add_constraint(constraint);
        constraint_defs[def.id] = def;
        initial_constraints.push_back(def);
    }
}

void RigidBodySimulation::remove_constraint(const std::string& id) {
    auto it = constraint_defs.find(id);
    if (it != constraint_defs.end()) {
        for (auto cit = world.constraints.begin(); cit != world.constraints.end(); ++cit) {
            delete *cit;
            world.constraints.erase(cit);
            break;
        }
        constraint_defs.erase(it);
        
        auto init_it = std::find_if(initial_constraints.begin(), initial_constraints.end(),
            [&id](const ConstraintDef& d) { return d.id == id; });
        if (init_it != initial_constraints.end()) initial_constraints.erase(init_it);
    }
}

void RigidBodySimulation::clear() {
    for (auto* b : world.bodies) delete b;
    world.bodies.clear();
    for (auto* c : world.constraints) delete c;
    world.constraints.clear();
    body_defs.clear();
    constraint_defs.clear();
    initial_bodies.clear();
    initial_constraints.clear();
    shapes.clear();
}

FrameOutput RigidBodySimulation::get_frame_output() const {
    FrameOutput frame;
    frame.time = state.time;
    frame.bodies = get_body_states();
    frame.contacts = last_contacts;
    frame.energy = compute_energy();
    
    float ke = 0, pe = 0;
    for (const auto* body : world.bodies) {
        if (body->inv_mass > 0) {
            ke += 0.5f * body->mass * body->velocity.dot(body->velocity);
            Vec3 Iw = body->inertia_tensor * body->angular_velocity;
            ke += 0.5f * body->angular_velocity.dot(Iw);
        }
        for (const auto* f : world.force_fields) {
            pe += f->compute_potential_energy(*body);
        }
    }
    frame.kinetic_energy = ke;
    frame.potential_energy = pe;
    
    return frame;
}

std::vector<BodyState> RigidBodySimulation::get_body_states() const {
    std::vector<BodyState> states;
    for (const auto* body : world.bodies) {
        states.push_back({
            body->id,
            body->position,
            body->orientation,
            body->velocity,
            body->angular_velocity,
            body->force,
            body->torque,
            body->sleeping,
            false
        });
    }
    return states;
}

std::vector<ContactInfo> RigidBodySimulation::get_contacts() const {
    return last_contacts;
}

void RigidBodySimulation::apply_force(const std::string& body_id, const Vec3& force) {
    RigidBody* body = get_body(body_id);
    if (body) body->apply_force(force);
}

void RigidBodySimulation::apply_torque(const std::string& body_id, const Vec3& torque) {
    RigidBody* body = get_body(body_id);
    if (body) body->apply_torque(torque);
}

void RigidBodySimulation::set_body_velocity(const std::string& body_id, const Vec3& vel) {
    RigidBody* body = get_body(body_id);
    if (body) body->velocity = vel;
}

void RigidBodySimulation::set_body_angular_velocity(const std::string& body_id, const Vec3& ang_vel) {
    RigidBody* body = get_body(body_id);
    if (body) body->angular_velocity = ang_vel;
}

bool RigidBodySimulation::has_body(const std::string& id) const {
    return body_defs.find(id) != body_defs.end();
}

RigidBody* RigidBodySimulation::get_body(const std::string& id) {
    for (auto* body : world.bodies) {
        if (body->id == id) return body;
    }
    return nullptr;
}

const RigidBody* RigidBodySimulation::get_body(const std::string& id) const {
    for (const auto* body : world.bodies) {
        if (body->id == id) return body;
    }
    return nullptr;
}

} // namespace realis