cmake_minimum_required(VERSION 3.24)
project(Mnemo VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Widgets)

add_library(MnemoCore STATIC
    src/core/Logging.cpp
    src/core/Logging.hpp
    src/core/providers/IStorageProvider.hpp
)
target_include_directories(MnemoCore PUBLIC src)
target_link_libraries(MnemoCore PUBLIC Qt6::Core)

add_executable(Mnemo WIN32
    assets/resources.qrc
    src/main.cpp
    src/app/Application.cpp
    src/app/Application.hpp
    src/app/AppInfo.hpp
    src/ui/MainWindow.cpp
    src/ui/MainWindow.hpp
)
target_link_libraries(Mnemo PRIVATE MnemoCore Qt6::Widgets)

if(MSVC)
    target_compile_options(MnemoCore PRIVATE /W4 /permissive-)
    target_compile_options(Mnemo PRIVATE /W4 /permissive-)
else()
    target_compile_options(MnemoCore PRIVATE -Wall -Wextra -Wpedantic)
    target_compile_options(Mnemo PRIVATE -Wall -Wextra -Wpedantic)
endif()

include(CTest)
if(BUILD_TESTING)
    find_package(Qt6 6.5 REQUIRED COMPONENTS Test)
    add_subdirectory(tests)
endif()

