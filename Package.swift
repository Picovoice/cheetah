// swift-tools-version:5.7
import PackageDescription
let package = Package(
    name: "Cheetah-iOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "Cheetah",
            targets: ["Cheetah"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvCheetah",
            path: "lib/ios/PvCheetah.xcframework"
        ),
        .target(
            name: "Cheetah",
            dependencies: ["PvCheetah"],
            path: ".",
            exclude: [
                "binding/ios/CheetahAppTest",
                "binding/flutter",
                "binding/react-native",
                "demo"
            ],
            sources: [
                "binding/ios/Cheetah.swift",
                "binding/ios/CheetahErrors.swift"
            ]
        )
    ]
)
