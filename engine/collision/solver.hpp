// Contact solver
#pragma once
#include "contact.hpp"
#include <vector>

namespace realis {

class ContactSolver {
public:
  void solve_contacts(const std::vector<Contact> &contacts);
};

} // namespace realis