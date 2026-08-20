



#include "../engine/core/world.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/math/vec3.hpp"
#include <iostream>

#include <cmath>
#include <iomanip>


using namespace realis;

void run_angular_stability_test() {
  std::cout << "=== Phase 3: Angular Stability (Tennis Racket Effect) ==="
            << std::endl;
  std::cout << "Starting rotation about the intermediate axis..." << std::endl;

  
  float i1 = 1.0f, i2 = 2.0f, i3 = 3.0f;

  RigidBody book;
  book.mass = 1.0f;
  book.inv_mass = 1.0f;

  
  
  book.angular_velocity = Vec3(0.1f, 5.0f, 0.1f);

  float dt = 0.001f;
  float duration = 10.0f;
  int steps = static_cast<int>(duration / dt);

  std::cout << std::fixed << std::setprecision(4);
  std::cout << "Initial Angular Vel: (" << book.angular_velocity.x << ", "
            << book.angular_velocity.y << ", " << book.angular_velocity.z << ")"
            << std::endl;

  int flips = 0;
  float last_wy = book.angular_velocity.y;

  for (int i = 0; i < steps; ++i) {
    
    
    Vec3 omega = book.angular_velocity;
    Vec3 dw(((i2 - i3) / i1) * omega.y * omega.z,
            ((i3 - i1) / i2) * omega.z * omega.x,
            ((i1 - i2) / i3) * omega.x * omega.y);

    book.angular_velocity = book.angular_velocity + dw * dt;

    
    if (book.angular_velocity.y * last_wy < 0) {
      flips++;
      std::cout << "[Step " << i << "] FLIP detected! t=" << i * dt
                << "s, wy=" << book.angular_velocity.y << std::endl;
    }
    last_wy = book.angular_velocity.y;

    
    
  }

  std::cout << std::endl << "=== Results ===" << std::endl;
  std::cout << "Total flips in 10s: " << flips << std::endl;

  if (flips >= 2) {
    std::cout << "✓ PASS: Dzhanibekov effect reproduced (Rotation is unstable "
                 "about intermediate axis)"
              << std::endl;
  } else {
    std::cout << "✗ FAIL: Expected periodic flipping not observed" << std::endl;
  }
}

int main() {
  run_angular_stability_test();
  return 0;
}