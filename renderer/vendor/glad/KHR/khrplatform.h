

#ifndef __khrplatform_h_
#define __khrplatform_h_

#include <stdint.h>



typedef int8_t   khronos_int8_t;
typedef uint8_t  khronos_uint8_t;
typedef int16_t  khronos_int16_t;
typedef uint16_t khronos_uint16_t;
typedef int32_t  khronos_int32_t;
typedef uint32_t khronos_uint32_t;
typedef int64_t  khronos_int64_t;
typedef uint64_t khronos_uint64_t;

typedef float    khronos_float_t;
typedef double   khronos_double_t;

#ifdef _WIN64
typedef int64_t  khronos_intptr_t;
typedef uint64_t khronos_uintptr_t;
typedef int64_t  khronos_ssize_t;
typedef uint64_t khronos_usize_t;
#else
typedef int32_t  khronos_intptr_t;
typedef uint32_t khronos_uintptr_t;
typedef int32_t  khronos_ssize_t;
typedef uint32_t khronos_usize_t;
#endif

typedef int64_t  khronos_time_ns_t;
typedef uint64_t khronos_utime_nanoseconds_t;
typedef int64_t  khronos_stime_nanoseconds_t;

typedef unsigned int khronos_enum_t;
typedef unsigned int khronos_bitfield_t;


typedef enum khronos_boolean_enum_e {
    KHRONOS_FALSE = 0,
    KHRONOS_TRUE  = 1,
    KHRONOS_BOOLEAN_ENUM_FORCE_SIZE = 0x7FFFFFFF
} khronos_boolean_enum_t;

#define KHRONOS_MAX_ENUM 0x7FFFFFFF

#endif 