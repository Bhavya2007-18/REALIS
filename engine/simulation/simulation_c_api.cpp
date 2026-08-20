#include "simulation_c_api.h"
#include "rigid_body_simulation.hpp"
#include <vector>
#include <string>
#include <cstring>
#include <new>

using namespace realis;

extern "C" {

static RealisVec3 to_c_vec3(const Vec3& v) {
    return {v.x, v.y, v.z};
}

static RealisQuat to_c_quat(const Quat& q) {
    return {q.x, q.y, q.z, q.w};
}

static Vec3 from_c_vec3(const RealisVec3& v) {
    return {v.x, v.y, v.z};
}

static Quat from_c_quat(const RealisQuat& q) {
    return {q.w, q.x, q.y, q.z};
}

RealisSim* realis_sim_create() {
    try {
        return reinterpret_cast<RealisSim*>(new RigidBodySimulation());
    } catch (...) {
        return nullptr;
    }
}

void realis_sim_destroy(RealisSim* sim) {
    if (sim) {
        delete reinterpret_cast<RigidBodySimulation*>(sim);
    }
}

int realis_sim_initialize(RealisSim* sim, const RealisSimConfig* config) {
    if (!sim || !config) return 0;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    
    SimulationConfig cfg;
    cfg.dt = config->dt;
    cfg.sub_steps = config->sub_steps;
    cfg.fixed_timestep = config->fixed_timestep;
    cfg.max_dt = config->max_dt;
    cfg.integrator = config->integrator ? config->integrator : "semi_implicit_euler";
    cfg.gravity = from_c_vec3(config->gravity);
    cfg.enable_collision = config->enable_collision;
    cfg.enable_constraints = config->enable_constraints;
    cfg.constraint_iterations = config->constraint_iterations;
    cfg.baumgarte_beta = config->baumgarte_beta;
    cfg.penetration_slop = config->penetration_slop;
    cfg.max_correction = config->max_correction;
    
    return s->initialize(cfg) ? 1 : 0;
}

void realis_sim_step(RealisSim* sim) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->step();
    }
}

void realis_sim_step_dt(RealisSim* sim, float dt) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->step(dt);
    }
}

void realis_sim_reset(RealisSim* sim) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->reset();
    }
}

void realis_sim_pause(RealisSim* sim) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->pause();
    }
}

void realis_sim_resume(RealisSim* sim) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->resume();
    }
}

int realis_sim_is_paused(RealisSim* sim) {
    if (!sim) return 1;
    return reinterpret_cast<RigidBodySimulation*>(sim)->is_paused() ? 1 : 0;
}

RealisSimState realis_sim_get_state(RealisSim* sim) {
    RealisSimState result = {0};
    if (!sim) return result;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    SimulationState state = s->get_state();
    
    result.time = state.time;
    result.step_count = state.step_count;
    result.paused = state.paused ? 1 : 0;
    result.state_size = state.system_state.size();
    
    if (!state.system_state.empty()) {
        result.system_state = new float[state.system_state.size()];
        std::memcpy(result.system_state, state.system_state.data(), 
                   state.system_state.size() * sizeof(float));
    }
    
    result.warning_count = state.warnings.size();
    if (!state.warnings.empty()) {
        result.warnings = new const char*[state.warnings.size()];
        for (size_t i = 0; i < state.warnings.size(); ++i) {
            result.warnings[i] = strdup(state.warnings[i].c_str());
        }
    }
    
    return result;
}

void realis_sim_set_state(RealisSim* sim, const RealisSimState* state) {
    if (!sim || !state) return;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    SimulationState st;
    st.time = state->time;
    st.step_count = state->step_count;
    st.paused = state->paused;
    
    if (state->system_state && state->state_size > 0) {
        st.system_state.assign(state->system_state, state->system_state + state->state_size);
    }
    
    s->set_state(st);
}

void realis_sim_add_body(RealisSim* sim, const RealisBodyDef* body) {
    if (!sim || !body) return;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    BodyDef def;
    def.id = body->id ? body->id : "";
    def.position = from_c_vec3(body->position);
    def.velocity = from_c_vec3(body->velocity);
    def.angular_velocity = from_c_vec3(body->angular_velocity);
    def.orientation = from_c_quat(body->orientation);
    def.mass = body->mass;
    def.restitution = body->restitution;
    def.friction = body->friction;
    def.is_static = body->is_static;
    def.shape_type = body->shape_type ? body->shape_type : "sphere";
    def.half_extents = from_c_vec3(body->half_extents);
    def.radius = body->radius;
    def.material_id = body->material_id ? body->material_id : "";
    
    s->add_body(def);
}

void realis_sim_remove_body(RealisSim* sim, const char* id) {
    if (sim && id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->remove_body(id);
    }
}

void realis_sim_add_constraint(RealisSim* sim, const RealisConstraintDef* constraint) {
    if (!sim || !constraint) return;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    ConstraintDef def;
    def.id = constraint->id ? constraint->id : "";
    def.type = constraint->type ? constraint->type : "distance";
    def.body_a = constraint->body_a ? constraint->body_a : "";
    def.body_b = constraint->body_b ? constraint->body_b : "";
    def.anchor_a = from_c_vec3(constraint->anchor_a);
    def.anchor_b = from_c_vec3(constraint->anchor_b);
    def.axis = from_c_vec3(constraint->axis);
    def.distance = constraint->distance;
    def.motor_enabled = constraint->motor_enabled;
    def.target_velocity = constraint->target_velocity;
    def.max_force = constraint->max_force;
    def.min_limit = constraint->min_limit;
    def.max_limit = constraint->max_limit;
    
    s->add_constraint(def);
}

void realis_sim_remove_constraint(RealisSim* sim, const char* id) {
    if (sim && id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->remove_constraint(id);
    }
}

void realis_sim_clear(RealisSim* sim) {
    if (sim) {
        reinterpret_cast<RigidBodySimulation*>(sim)->clear();
    }
}

RealisFrameOutput realis_sim_get_frame(RealisSim* sim) {
    RealisFrameOutput result = {0};
    if (!sim) return result;
    
    RigidBodySimulation* s = reinterpret_cast<RigidBodySimulation*>(sim);
    FrameOutput frame = s->get_frame_output();
    
    result.time = frame.time;
    result.body_count = frame.bodies.size();
    result.contact_count = frame.contacts.size();
    result.energy = frame.energy;
    result.kinetic_energy = frame.kinetic_energy;
    result.potential_energy = frame.potential_energy;
    
    if (!frame.bodies.empty()) {
        result.bodies = new RealisBodyState[frame.bodies.size()];
        for (size_t i = 0; i < frame.bodies.size(); ++i) {
            const auto& b = frame.bodies[i];
            result.bodies[i] = {
                strdup(b.id.c_str()),
                to_c_vec3(b.position),
                to_c_quat(b.orientation),
                to_c_vec3(b.linear_velocity),
                to_c_vec3(b.angular_velocity),
                to_c_vec3(b.force),
                to_c_vec3(b.torque),
                b.sleeping ? 1 : 0,
                b.on_ground ? 1 : 0
            };
        }
    }
    
    if (!frame.contacts.empty()) {
        result.contacts = new RealisContactInfo[frame.contacts.size()];
        for (size_t i = 0; i < frame.contacts.size(); ++i) {
            const auto& c = frame.contacts[i];
            result.contacts[i] = {
                strdup(c.body_a.c_str()),
                strdup(c.body_b.c_str()),
                to_c_vec3(c.point),
                to_c_vec3(c.normal),
                c.penetration,
                c.restitution,
                c.friction
            };
        }
    }
    
    return result;
}

void realis_sim_free_frame(RealisFrameOutput frame) {
    if (frame.bodies) {
        for (size_t i = 0; i < frame.body_count; ++i) {
            free((void*)frame.bodies[i].id);
        }
        delete[] frame.bodies;
    }
    if (frame.contacts) {
        for (size_t i = 0; i < frame.contact_count; ++i) {
            free((void*)frame.contacts[i].body_a);
            free((void*)frame.contacts[i].body_b);
        }
        delete[] frame.contacts;
    }
}

void realis_sim_apply_force(RealisSim* sim, const char* body_id, RealisVec3 force) {
    if (sim && body_id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->apply_force(body_id, from_c_vec3(force));
    }
}

void realis_sim_apply_torque(RealisSim* sim, const char* body_id, RealisVec3 torque) {
    if (sim && body_id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->apply_torque(body_id, from_c_vec3(torque));
    }
}

void realis_sim_set_velocity(RealisSim* sim, const char* body_id, RealisVec3 vel) {
    if (sim && body_id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->set_body_velocity(body_id, from_c_vec3(vel));
    }
}

void realis_sim_set_angular_velocity(RealisSim* sim, const char* body_id, RealisVec3 ang_vel) {
    if (sim && body_id) {
        reinterpret_cast<RigidBodySimulation*>(sim)->set_body_angular_velocity(body_id, from_c_vec3(ang_vel));
    }
}

int realis_sim_has_body(RealisSim* sim, const char* id) {
    if (!sim || !id) return 0;
    return reinterpret_cast<RigidBodySimulation*>(sim)->has_body(id) ? 1 : 0;
}

float realis_sim_compute_energy(RealisSim* sim) {
    if (!sim) return 0;
    return reinterpret_cast<RigidBodySimulation*>(sim)->compute_energy();
}

int realis_sim_validate(RealisSim* sim) {
    if (!sim) return 0;
    return reinterpret_cast<RigidBodySimulation*>(sim)->validate() ? 1 : 0;
}

} // extern "C"