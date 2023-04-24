//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI

struct ViewOffsetKey: PreferenceKey {
    typealias Value = CGFloat
    static var defaultValue = CGFloat.zero
    static func reduce(value: inout Value, nextValue: () -> Value) {
        value += nextValue()
    }
}

struct SizePreferenceKey: PreferenceKey {
    typealias Value = CGSize
    static var defaultValue: Value = .zero
    static func reduce(value _: inout Value, nextValue: () -> Value) {
        _ = nextValue()
    }
}

struct ChildSizeReader<Content: View>: View {
    @Binding var size: CGSize

    let content: () -> Content
    var body: some View {
        ZStack {
            content().background(
                    GeometryReader { proxy in
                        Color.clear.preference(
                                key: SizePreferenceKey.self,
                                value: proxy.size
                        )
                    }
            )
        }
                .onPreferenceChange(SizePreferenceKey.self) { preferences in
                    self.size = preferences
                }
    }
}

struct ContentView: View {
    @StateObject var viewModel = ViewModel()

    @State var wholeSize: CGSize = .zero
    @State var scrollViewSize: CGSize = .zero

    let activeBlue = Color(red: 55/255, green: 125/255, blue: 1, opacity: 1)
    let dangerRed = Color(red: 1, green: 14/255, blue: 14/255, opacity: 1)
    let navyBlue = Color(red: 37/255, green: 24/255, blue: 126/255, opacity: 1)

    var autoScroll = true

    var body: some View {
        let interactionDisabled = !viewModel.errorMessage.isEmpty || viewModel.state == UIState.INIT

        VStack(spacing: 10) {
            Spacer()

            ScrollViewReader { reader in
                ChildSizeReader(size: $wholeSize) {
                    ScrollView {
                        ChildSizeReader(size: $scrollViewSize) {
                            LazyVStack {
                                Text(viewModel.result)
                                        .padding()
                                        .fixedSize(horizontal: false, vertical: true)
                                        .foregroundColor(Color.white)
                                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                        .font(.title3)
                                        .id(0)
                            }
                                    .background(
                                        GeometryReader { proxy in
                                            Color.clear.preference(
                                                    key: ViewOffsetKey.self,
                                                    value: -1 * proxy.frame(in: .named("scroll")).origin.y
                                            )
                                        }
                                    ).onPreferenceChange(ViewOffsetKey.self, perform: { value in
                                        if value >= scrollViewSize.height - wholeSize.height {
                                            viewModel.setAutoScroll(true)
                                        } else {
                                            viewModel.setAutoScroll(false)
                                        }
                                    })
                        }
                    }
                            .coordinateSpace(name: "scroll")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(navyBlue)
                            .onChange(of: viewModel.result.count, perform: { _ in
                                if viewModel.shouldAutoScroll() {
                                    reader.scrollTo(0, anchor: .bottomTrailing)
                                }
                            })
                }
            }

            Spacer()

            if viewModel.state == .RECORDING {
                Text(String(format: "Transcribing audio..."))
                        .padding()
                        .font(.body)
                        .foregroundColor(Color.black)
            } else {
                Text(viewModel.errorMessage)
                        .padding()
                        .foregroundColor(Color.white)
                        .frame(maxWidth: .infinity)
                        .background(dangerRed)
                        .font(.body)
                        .opacity(viewModel.errorMessage.isEmpty ? 0 : 1)
                        .cornerRadius(10)
            }

            Spacer()

            Button(action: {
                viewModel.toggleRecording()
            }, label: {
                Text(viewModel.state == .RECORDING ? "STOP" : "START")
                        .padding()
                        .background(interactionDisabled ? Color.gray : activeBlue)
                        .foregroundColor(Color.white)
                        .font(.largeTitle)
            }).disabled(interactionDisabled)
        }.onReceive(
            NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification),
            perform: { _ in
                viewModel.initialize()
            }
        ).onReceive(
            NotificationCenter.default.publisher(for: UIApplication.didEnterBackgroundNotification),
            perform: { _ in
                viewModel.destroy()
            }
        )
                .padding()
                .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                .background(Color.white)

    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
