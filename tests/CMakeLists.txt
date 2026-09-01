qt_add_executable(MnemoSanityTest AppInfoTest.cpp)
target_link_libraries(MnemoSanityTest PRIVATE MnemoCore Qt6::Test)
add_test(NAME Mnemo.AppInfo COMMAND MnemoSanityTest)

