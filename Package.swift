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
    dependencies: [
        .package(
            url: "https://github.com/jpsim/yams",
            .upToNextMajor(from: "5.0.6")
        )
    ],
    targets: [
        .binaryTarget(
            name: "PvCheetah",
            path: "lib/ios/PvCheetah.xcframework"
        ),
        .target(
            name: "Cheetah",
            dependencies: [
                "PvCheetah",
                .product(name: "Yams", package: "Yams")
            ],
            path: ".",
            exclude: [
                "binding/ios/CheetahAppTest",
                "binding/flutter",
                "binding/react-native",
                "demo"
            ],
            sources: [
                "binding/ios/Cheetah.swift",
                "binding/ios/CheetahErrors.swift",
                "binding/ios/CheetahTranscriptAnnotated.swift"
            ]
        )
    ]
)
