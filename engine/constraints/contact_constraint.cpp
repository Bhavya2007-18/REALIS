
#include "contact_constraint.hpp"
#include <cmath>

namespace realis {

ContactConstraint::ContactConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp)
    : Constraint(a, b), contact(cp)
{
    
    minLambda = 0.0f;
    maxLambda = 1e20f;
}

void ContactConstraint::pre_step(float dt) {
    if (!bodyA || !bodyB) return;
    
    
    
    
    
    
    
    Vec3 rA = contact.position - bodyA->position;
    Vec3 rB = contact.position - bodyB->position;
    
    Vec3 n = contact.normal; 
    
    
    linearA = n * -1.0f;
    linearB = n;
    
    
    angularA = rA.cross(n) * -1.0f;
    angularB = rB.cross(n);
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    float invMassSum = bodyA->inv_mass + bodyB->inv_mass;
    
    
    
    
    
    
    effectiveMass = (invMassSum > 0) ? 1.0f / invMassSum : 0.0f;
    
    
    
    
    
    float beta = 0.2f;
    float slop = 0.005f; 
    float penetration = contact.penetration;
    
    bias = 0.0f;
    if (penetration > slop) {
        bias = -(beta / dt) * (penetration - slop); 
    }
    
    
    
    
    
    float vy = (bodyB->velocity - bodyA->velocity).dot(n);
    float e = 0.0f; 
    if (vy < -1.0f) {
        bias += e * vy;
    }
}

FrictionConstraint::FrictionConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp, 
                                       const Vec3& tan, float mu, ContactConstraint* nc)
    : Constraint(a, b), contact(cp), tangent(tan), friction_coeff(mu), normal_constraint(nc)
{
    
    
    
    
    
    
    
    minLambda = -1000.0f;
    maxLambda = 1000.0f;
}

void FrictionConstraint::pre_step(float dt) {
    
    Vec3 rA = contact.position - bodyA->position;
    Vec3 rB = contact.position - bodyB->position;
    
    linearA = tangent * -1.0f;
    linearB = tangent;
    angularA = rA.cross(tangent) * -1.0f;
    angularB = rB.cross(tangent);
    
    float invMassSum = bodyA->inv_mass + bodyB->inv_mass;
    effectiveMass = (invMassSum > 0) ? 1.0f / invMassSum : 0.0f;
    
    bias = 0.0f; 
    
    
    if (normal_constraint) {
        float limit = friction_coeff * normal_constraint->lambda;
        minLambda = -limit;
        maxLambda = limit;
    }
}

} 