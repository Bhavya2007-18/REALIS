// CAD Integrity Validator
// Enforces geometric truth before physics
#pragma once
#include "cad_types.hpp"
#include <vector>
#include <string>

namespace realis {
namespace cad {

struct ValidationResult {
    bool is_valid;
    std::vector<std::string> errors;
    std::vector<std::string> warnings;
    
    ValidationResult() : is_valid(true) {}
};

class CADValidator {
public:
    // Main validation entry point
    static ValidationResult validate_solid(const Solid& solid);
    
private:
    static void check_watertight(const Solid& solid, ValidationResult& result);
    static void check_manifold(const Solid& solid, ValidationResult& result);
    static void check_normals(const Solid& solid, ValidationResult& result);
    static void check_tolerances(const Solid& solid, ValidationResult& result);
};

} // namespace cad
} // namespace realis
