

#pragma once
#include "../math/mat3.hpp"

namespace realis {
namespace continuum {



class StressTensor {
public:
    Mat3 data;

    StressTensor() : data() {} 
    explicit StressTensor(const Mat3& m) : data(m) {}

    
    
    
    
    
    
    
    
    static StressTensor from_voigt(float xx, float yy, float zz, float yz, float xz, float xy) {
        Mat3 m;
        m.data[0] = xx; m.data[1] = xy; m.data[2] = xz;
        m.data[3] = xy; m.data[4] = yy; m.data[5] = yz;
        m.data[6] = xz; m.data[7] = yz; m.data[8] = zz;
        return StressTensor(m);
    }
};

} 
} 