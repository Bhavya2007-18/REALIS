#pragma once

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct RealisSim RealisSim;

typedef struct {
    float x, y, z;
} RealisVec3;

typedef struct {
    float x, y, z, w;
} RealisQuat;

typedef struct {
    float dt;
    int sub_steps;
    int fixed_timestep;
    float max_dt;
    const char* integrator;
    RealisVec3 gravity;
    int enable_collision;
    int enable_constraints;
    int constraint_iterations;
    float baumgarte_beta;
    float penetration_slop;
    float max_correction;
} RealisSimConfig;

typedef struct {
    const char* id;
    RealisVec3 position;
    RealisVec3 velocity;
    RealisVec3 angular_velocity;
    RealisQuat orientation;
    float mass;
    float restitution;
    float friction;
    int is_static;
    const char* shape_type;
    RealisVec3 half_extents;
    float radius;
    const char* material_id;
} RealisBodyDef;

typedef struct {
    const char* id;
    const char* type;
    const char* body_a;
    const char* body_b;
    RealisVec3 anchor_a;
    RealisVec3 anchor_b;
    RealisVec3 axis;
    float distance;
    int motor_enabled;
    float target_velocity;
    float max_force;
    float min_limit;
    float max_limit;
} RealisConstraintDef;

typedef struct {
    const char* body_a;
    const char* body_b;
    RealisVec3 point;
    RealisVec3 normal;
    float penetration;
    float restitution;
    float friction;
} RealisContactInfo;

typedef struct {
    const char* id;
    RealisVec3 position;
    RealisQuat orientation;
    RealisVec3 linear_velocity;
    RealisVec3 angular_velocity;
    RealisVec3 force;
    RealisVec3 torque;
    int sleeping;
    int on_ground;
} RealisBodyState;

typedef struct {
    float time;
    RealisBodyState* bodies;
    size_t body_count;
    RealisContactInfo* contacts;
    size_t contact_count;
    float energy;
    float kinetic_energy;
    float potential_energy;
} RealisFrameOutput;

typedef struct {
    float time;
    uint64_t step_count;
    int paused;
    float* system_state;
    size_t state_size;
    const char** warnings;
    size_t warning_count;
} RealisSimState;

RealisSim* realis_sim_create();
void realis_sim_destroy(RealisSim* sim);
int realis_sim_initialize(RealisSim* sim, const RealisSimConfig* config);
void realis_sim_step(RealisSim* sim);
void realis_sim_step_dt(RealisSim* sim, float dt);
void realis_sim_reset(RealisSim* sim);
void realis_sim_pause(RealisSim* sim);
void realis_sim_resume(RealisSim* sim);
int realis_sim_is_paused(RealisSim* sim);

RealisSimState realis_sim_get_state(RealisSim* sim);
void realis_sim_set_state(RealisSim* sim, const RealisSimState* state);

void realis_sim_add_body(RealisSim* sim, const RealisBodyDef* body);
void realis_sim_remove_body(RealisSim* sim, const char* id);
void realis_sim_add_constraint(RealisSim* sim, const RealisConstraintDef* constraint);
void realis_sim_remove_constraint(RealisSim* sim, const char* id);
void realis_sim_clear(RealisSim* sim);

RealisFrameOutput realis_sim_get_frame(RealisSim* sim);
void realis_sim_free_frame(RealisFrameOutput frame);

void realis_sim_apply_force(RealisSim* sim, const char* body_id, RealisVec3 force);
void realis_sim_apply_torque(RealisSim* sim, const char* body_id, RealisVec3 torque);
void realis_sim_set_velocity(RealisSim* sim, const char* body_id, RealisVec3 vel);
void realis_sim_set_angular_velocity(RealisSim* sim, const char* body_id, RealisVec3 ang_vel);
int realis_sim_has_body(RealisSim* sim, const char* id);

float realis_sim_compute_energy(RealisSim* sim);
int realis_sim_validate(RealisSim* sim);

#ifdef __cplusplus
}
#endif