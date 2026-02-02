// Python bindings for REALIS engine
// Using pybind11 (placeholder)

#include <pybind11/pybind11.h>
#include "../engine/math/vec3.hpp"
#include "../engine/dynamics/rigid_body.hpp"

namespace py = pybind11;

PYBIND11_MODULE(py_realis, m) {
    m.doc() = "REALIS Physics Engine Python Bindings";
    
    // Vec3 bindings
    py::class_<realis::Vec3>(m, "Vec3")
        .def(py::init<float, float, float>())
        .def_readwrite("x", &realis::Vec3::x)
        .def_readwrite("y", &realis::Vec3::y)
        .def_readwrite("z", &realis::Vec3::z);
    
    // RigidBody bindings
    py::class_<realis::RigidBody>(m, "RigidBody")
        .def(py::init<>())
        .def("integrate", &realis::RigidBody::integrate);
}
