//
//  Copyright 2022-2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = ViewModel()

    let activeBlue = Color(red: 55/255, green: 125/255, blue: 1, opacity: 1)
    let dangerRed = Color(red: 1, green: 14/255, blue: 14/255, opacity: 1)
    let navyBlue = Color(red: 37/255, green: 24/255, blue: 126/255, opacity: 1)

    var body: some View {
        let interactionDisabled = !viewModel.errorMessage.isEmpty || viewModel.state == UIState.INIT

        VStack {
            GeometryReader { metrics in
                VStack {
                    Spacer()

                    ScrollView {
                        VStack {
                            Text(viewModel.result)
                                .padding(7)
                                .foregroundColor(Color.white)
                                .font(.title3)
                        }.frame(minHeight: metrics.size.height * 0.4, alignment: .topLeading)
                    }.frame(width: metrics.size.width, height: metrics.size.height * 0.4, alignment: .topLeading)
                        .background(navyBlue)
                        .defaultScrollAnchor(.bottomLeading)

                    Spacer()

                    HStack {
                        Text("Word")
                            .font(.system(size: 14.0))
                            .frame(width: metrics.size.width * 0.30, alignment: .center)
                        Text("Start")
                            .font(.system(size: 14.0))
                            .frame(width: metrics.size.width * 0.20, alignment: .center)
                        Text("End")
                            .font(.system(size: 14.0))
                            .frame(width: metrics.size.width * 0.20, alignment: .center)
                        Text("Confidence")
                            .font(.system(size: 14.0))
                            .frame(width: metrics.size.width * 0.30, alignment: .center)
                    }.frame(width: metrics.size.width)

                    ScrollView {
                        VStack {
                            ForEach(viewModel.words, id: \.startSec) { word in
                                HStack {
                                    Text(word.word)
                                        .frame(minWidth: metrics.size.width * 0.30, alignment: .center)
                                        .foregroundColor(.white)
                                        .font(.system(size: 14.0))
                                    Text(String(format: "%.1fs", word.startSec))
                                        .frame(minWidth: metrics.size.width * 0.20, alignment: .center)
                                        .foregroundColor(.white)
                                        .font(.system(size: 14.0))
                                    Text(String(format: "%.1fs", word.endSec))
                                        .frame(minWidth: metrics.size.width * 0.20, alignment: .center)
                                        .foregroundColor(.white)
                                        .font(.system(size: 14.0))
                                    Text(String(format: "%.0f%%", word.confidence * 100))
                                        .frame(minWidth: metrics.size.width * 0.30, alignment: .center)
                                        .foregroundColor(.white)
                                        .font(.system(size: 14.0))
                                }.frame(width: metrics.size.width)
                                    .background(Color(red: 0, green: 229 / 255, blue: 195 / 255, opacity: 0.1))
                            }
                        }.frame(minHeight: metrics.size.height * 0.4, alignment: .top)
                    }.frame(width: metrics.size.width, height: metrics.size.height * 0.4, alignment: .leading)
                        .background(navyBlue)
                        .defaultScrollAnchor(.bottomLeading)
                }
            }

            if viewModel.state == .RECORDING {
                Text(String(format: "Transcribing audio..."))
                    .padding()
                    .font(.body)
                    .foregroundColor(Color.black)
            } else if viewModel.errorMessage.isEmpty {
                Text(" ")
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
        ).padding()
            .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
            .background(Color.white)
    }
}
