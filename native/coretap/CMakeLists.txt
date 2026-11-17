cmake_minimum_required(VERSION 3.15)
project(coretap)

# Tap do Core Audio (macOS 14.2+) pro Caramujo Vision. Só compila no macOS.
if(NOT APPLE)
  message(FATAL_ERROR "coretap só compila no macOS")
endif()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "13.0")

# a raiz do projeto (dois níveis acima) tem o node_modules com o node-addon-api
get_filename_component(PROJ_ROOT "${CMAKE_SOURCE_DIR}/../.." ABSOLUTE)
execute_process(
  COMMAND node -p "require('path').resolve(require('node-addon-api').include_dir)"
  WORKING_DIRECTORY ${PROJ_ROOT}
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE)
include_directories(${CMAKE_JS_INC} ${NODE_ADDON_API_DIR})

add_definitions(-DNAPI_VERSION=8 -DNAPI_CPP_EXCEPTIONS)

add_library(${PROJECT_NAME} SHARED src/coretap.mm)
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_compile_options(${PROJECT_NAME} PRIVATE -fobjc-arc -fexceptions)
target_link_options(${PROJECT_NAME} PRIVATE -undefined dynamic_lookup)

find_library(COREAUDIO_FRAMEWORK CoreAudio)
find_library(FOUNDATION_FRAMEWORK Foundation)
find_library(COREFOUNDATION_FRAMEWORK CoreFoundation)
target_link_libraries(${PROJECT_NAME} PRIVATE ${CMAKE_JS_LIB} ${COREAUDIO_FRAMEWORK} ${FOUNDATION_FRAMEWORK} ${COREFOUNDATION_FRAMEWORK})
