


#pragma once
#include "../math/mat3.hpp"

namespace realis {
namespace continuum {

class StrainTensor {
public:
    Mat3 data;

    StrainTensor() : data() {}
    explicit StrainTensor(const Mat3& m) : data(m) {}

    
    float trace() const {
        return data.data[0] + data.data[4] + data.data[8];
    }
    
    
    Mat3 deviatoric() const {
        float mean = trace() / 3.0f;
        Mat3 dev = data;
        dev.data[0] -= mean;
        dev.data[4] -= mean;
        dev.data[8] -= mean;
        return dev;
    }
};

} 
} 