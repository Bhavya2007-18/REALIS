// Contact solver
#pragma once
#include "contact.hpp"
#include <vector>

namespace realis {

class ContactSolver {
public:
  void solve_contacts(std::vector<Contact> &contacts);
};

} // namespace realis