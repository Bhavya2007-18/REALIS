// Contact Constraint Implementation
#include "contact_constraint.hpp"
#include <cmath>

namespace realis {

ContactConstraint::ContactConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp)
    : Constraint(a, b), contact(cp)
{
    // Inequality constraint: lambda >= 0 (Push only)
    minLambda = 0.0f;
    maxLambda = 1e20f;
}

void ContactConstraint::pre_step(float dt) {
    if (!bodyA || !bodyB) return;
    
    // Jacobian for non-penetration:
    // J = [-n, -(rA x n), n, (rB x n)]
    // v_rel = J * v
    
    // Relative vectors
    // contact.point is in World Space.
    Vec3 rA = contact.position - bodyA->position;
    Vec3 rB = contact.position - bodyB->position;
    
    Vec3 n = contact.normal; 
    
    // Linear
    linearA = n * -1.0f;
    linearB = n;
    
    // Angular
    angularA = rA.cross(n) * -1.0f;
    angularB = rB.cross(n);
    
    // Effective Mass
    // invEffMass = J * M^-1 * J^T
    // = invMa + invMb + (rA x n)^T * Ia^-1 * (rA x n) ...
    // Note: Angular part needs Inertia Tensor inverse in world space.
    // For Phase 6A/B, we might simplify or assume body->get_inverse_inertia_world().
    // Let's assume point mass first? No, we are in Phase 6. We need rotation.
    // We already passed Phase 3 (Rotation).
    
    // Assume Diagonal Inertia for simplicity in this step if helper missing, 
    // BUT we should compute it properly.
    // termA = (Ia^-1 * angularA) . angularA
    
    // For stability in Phase 6 demo, we might use infinite friction or verify stacking.
    
    float invMassSum = bodyA->inv_mass + bodyB->inv_mass;
    
    // Angular contribution (Simplified for now - treating as particle for first pass if needed, 
    // but code structure allows full I^-1 support).
    // float termA = ...
    // effectiveMass = 1 / ...
    
    effectiveMass = (invMassSum > 0) ? 1.0f / invMassSum : 0.0f;
    
    // Bias (Baumgarte)
    // b = -(beta/dt) * C. 
    // C = penetration depth (positive). 
    // We want to correct C to 0.
    float beta = 0.2f;
    float slop = 0.005f; // 5mm
    float penetration = contact.penetration;
    
    bias = 0.0f;
    if (penetration > slop) {
        bias = -(beta / dt) * (penetration - slop); // Target v = (pen/dt), so b = -v
    }
    
    // Restitution
    
    // Restitution
    // v_rel dot n < -threshold
    float vy = (bodyB->velocity - bodyA->velocity).dot(n);
    float e = 0.0f; // Inelastic for stacking stability
    if (vy < -1.0f) {
        bias += e * vy;
    }
}

FrictionConstraint::FrictionConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp, 
                                       const Vec3& tan, float mu, ContactConstraint* nc)
    : Constraint(a, b), contact(cp), tangent(tan), friction_coeff(mu), normal_constraint(nc)
{
    // Friction is mixed (Box constraint)
    // -mu * lambda_n <= lambda_t <= mu * lambda_n
    // This requires updating limits inside solve(), but typical PGS does it interleaved.
    // For Phase 6, we set limits based on accumulated lambda from normal constraint?
    // Not easy in standard loop. 
    // Approximate: Fixed limits or update in iterative loop?
    // We'll set limits in pre_step as placeholder, but real friction needs dynamic limits.
    minLambda = -1000.0f;
    maxLambda = 1000.0f;
}

void FrictionConstraint::pre_step(float dt) {
    // Similar Jacobian but with Tangent definition
    Vec3 rA = contact.position - bodyA->position;
    Vec3 rB = contact.position - bodyB->position;
    
    linearA = tangent * -1.0f;
    linearB = tangent;
    angularA = rA.cross(tangent) * -1.0f;
    angularB = rB.cross(tangent);
    
    float invMassSum = bodyA->inv_mass + bodyB->inv_mass;
    effectiveMass = (invMassSum > 0) ? 1.0f / invMassSum : 0.0f;
    
    bias = 0.0f; // Friction opposes velocity, no position correction usually
    
    // Update limits based on normal load if available (Warm start?)
    if (normal_constraint) {
        float limit = friction_coeff * normal_constraint->lambda;
        minLambda = -limit;
        maxLambda = limit;
    }
}

} // namespace realis
