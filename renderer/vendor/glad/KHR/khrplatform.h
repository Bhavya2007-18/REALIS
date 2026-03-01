/*
** Copyright (c) 2008-2018 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

#ifndef __khrplatform_h_
#define __khrplatform_h_

#include <stdint.h>

/*
 * Basic platform type definitions, aligned with the Khronos spec.
 */

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

/*
 * Enumerated boolean type — exactly one definition.
 */
typedef enum khronos_boolean_enum_e {
    KHRONOS_FALSE = 0,
    KHRONOS_TRUE  = 1,
    KHRONOS_BOOLEAN_ENUM_FORCE_SIZE = 0x7FFFFFFF
} khronos_boolean_enum_t;

#define KHRONOS_MAX_ENUM 0x7FFFFFFF

#endif /* __khrplatform_h_ */
