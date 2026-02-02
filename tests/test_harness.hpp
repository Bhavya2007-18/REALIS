// Simple Testing Harness for REALIS
#pragma once
#include <iostream>
#include <vector>
#include <string>
#include <cmath>

namespace realis {
namespace test {

struct TestResult {
    std::string name;
    bool passed;
    std::string message;
};

class TestRunner {
    std::vector<TestResult> results;
public:
    void run(const std::string& name, bool (*test_func)()) {
        std::cout << "Running test: " << name << "... ";
        try {
            if (test_func()) {
                std::cout << "PASSED" << std::endl;
                results.push_back({name, true, ""});
            } else {
                std::cout << "FAILED" << std::endl;
                results.push_back({name, false, "Assertion failed"});
            }
        } catch (const std::exception& e) {
            std::cout << "ERROR: " << e.what() << std::endl;
            results.push_back({name, false, e.what()});
        }
    }

    void summary() {
        int passed = 0;
        std::cout << "\n=== Test Summary ===" << std::endl;
        for (const auto& res : results) {
            if (res.passed) passed++;
            else std::cout << "[FAIL] " << res.name << ": " << res.message << std::endl;
        }
        std::cout << passed << "/" << results.size() << " tests passed." << std::endl;
    }
    
    bool all_passed() const {
        for(const auto& res : results) if(!res.passed) return false;
        return true;
    }
};

#define ASSERT_NEAR(a, b, epsilon) if (std::abs((a) - (b)) > (epsilon)) return false;
#define ASSERT_TRUE(condition) if (!(condition)) return false;
#define ASSERT_VEC_NEAR(v1, v2, eps) if ((v1 - v2).magnitude() > eps) return false;

} // namespace test
} // namespace realis
