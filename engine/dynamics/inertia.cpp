// Inertia tensor helper functions
#include "../math/mat3.hpp"
#include "../math/vec3.hpp"

namespace realis {

#include "inertia.hpp"

namespace realis {

Mat3 Inertia::box(float mass, float width, float height, float depth) {
  float ixx = (1.0f / 12.0f) * mass * (height * height + depth * depth);
  float iyy = (1.0f / 12.0f) * mass * (width * width + depth * depth);
  float izz = (1.0f / 12.0f) * mass * (width * width + height * height);

  Mat3 m;
  m.data[0] = ixx;
  m.data[1] = 0;
  m.data[2] = 0;
  m.data[3] = 0;
  m.data[4] = iyy;
  m.data[5] = 0;
  m.data[6] = 0;
  m.data[7] = 0;
  m.data[8] = izz;
  return m;
}

Mat3 Inertia::sphere(float mass, float radius) {
  float i = (2.0f / 5.0f) * mass * radius * radius;
  Mat3 m;
  m.data[0] = i;
  m.data[1] = 0;
  m.data[2] = 0;
  m.data[3] = 0;
  m.data[4] = i;
  m.data[5] = 0;
  m.data[6] = 0;
  m.data[7] = 0;
  m.data[8] = i;
  return m;
}

Mat3 Inertia::cylinder(float mass, float radius, float height) {
  float i_axial = 0.5f * mass * radius * radius;
  float i_trans =
      (1.0f / 12.0f) * mass * (3 * radius * radius + height * height);

  Mat3 m;
  // Assuming Y is up/axis
  m.data[0] = i_trans;
  m.data[1] = 0;
  m.data[2] = 0;
  m.data[3] = 0;
  m.data[4] = i_axial;
  m.data[5] = 0;
  m.data[6] = 0;
  m.data[7] = 0;
  m.data[8] = i_trans;
  return m;
}

} // namespace realis

} // namespace realis
