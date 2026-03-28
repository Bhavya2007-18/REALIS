

#pragma once
#include "cad_types.hpp"
#include <string>
#include <memory>

namespace realis {
namespace cad {

class IGeometryImporter {
public:
    virtual ~IGeometryImporter() = default;
    
    
    
    virtual std::shared_ptr<Solid> import_step(const std::string& filename, bool strict_validation = true) = 0;
    
    
    virtual std::shared_ptr<Solid> import_obj_as_cad(const std::string& filename) = 0;
};

class CADImporter : public IGeometryImporter {
public:
    std::shared_ptr<Solid> import_step(const std::string& filename, bool strict_validation = true) override;
    std::shared_ptr<Solid> import_obj_as_cad(const std::string& filename) override;
    
private:
    void validate_topology(Solid* solid);
};

} 
} 