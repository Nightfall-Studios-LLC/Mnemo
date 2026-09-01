#pragma once

namespace mnemo {
class Application final {
public:
    Application() = delete;
    static int run(int argc, char* argv[]);
};
} // namespace mnemo

