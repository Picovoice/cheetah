//
// Copyright 2022-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import React, {Component} from 'react';
import {
  NativeScrollEvent,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {StyleSheet, Text, View} from 'react-native';

import {Cheetah, CheetahErrors} from '@picovoice/cheetah-react-native';
import {
  VoiceProcessor,
  VoiceProcessorError,
} from '@picovoice/react-native-voice-processor';

enum UIState {
  loading,
  init,
  recording,
  stopping,
  error,
}

type Props = {};
type State = {
  appState: UIState;
  errorMessage: string | null;
  transcription: string;
  isBottom: boolean;
};

export default class App extends Component<Props, State> {
  _cheetah?: Cheetah;
  _accessKey: string = '${YOUR_ACCESS_KEY_HERE}'; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

  _voiceProcessor?: VoiceProcessor;
  _scrollView: ScrollView | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      appState: UIState.loading,
      errorMessage: null,
      transcription: '',
      isBottom: false,
    };
  }

  async componentDidMount() {
    await this.init();
  }

  async componentWillUnmount() {
    if (this.state.appState === UIState.recording) {
      await this._stopProcessing();
    }
    if (this._cheetah !== undefined) {
      await this._cheetah.delete();
      this._cheetah = undefined;
    }
  }

  async init() {
    try {
      this._cheetah = await Cheetah.create(
        this._accessKey,
        'cheetah_params.pv',
        {enableAutomaticPunctuation: true},
      );
    } catch (err: any) {
      this.handleError(err);
      return;
    }

    this._voiceProcessor = VoiceProcessor.instance;
    this._voiceProcessor.addFrameListener(async (buffer: number[]) => {
      if (!this._cheetah || !(await this._voiceProcessor?.isRecording())) {
        return;
      }

      try {
        const partialResult = await this._cheetah.process(buffer);
        if (partialResult.isEndpoint) {
          const remainingResult = await this._cheetah.flush();
          let transcriptText =
            this.state.transcription +
            partialResult.transcript +
            remainingResult.transcript;
          if (remainingResult.transcript.length > 0) {
            transcriptText += ' ';
          }
          this.setState({
            transcription: transcriptText,
          });
        } else {
          this.setState({
            transcription: this.state.transcription + partialResult.transcript,
          });
        }
      } catch (e: any) {
        this.handleError(e);
      }
    });

    this._voiceProcessor.addErrorListener((error: VoiceProcessorError) => {
      this.handleError(error);
    });
    this.setState({
      appState: UIState.init,
    });
  }

  handleError(err: any) {
    let errorMessage: string;
    if (err instanceof CheetahErrors.CheetahInvalidArgumentError) {
      errorMessage = `${err.message}`;
    } else if (err instanceof CheetahErrors.CheetahActivationError) {
      errorMessage = 'AccessKey activation error';
    } else if (err instanceof CheetahErrors.CheetahActivationLimitError) {
      errorMessage = 'AccessKey reached its device limit';
    } else if (err instanceof CheetahErrors.CheetahActivationRefusedError) {
      errorMessage = 'AccessKey refused';
    } else if (err instanceof CheetahErrors.CheetahActivationThrottledError) {
      errorMessage = 'AccessKey has been throttled';
    } else {
      errorMessage = err.toString();
    }

    this.setState({
      appState: UIState.error,
      errorMessage: errorMessage,
    });
  }

  async _startProcessing() {
    this.setState({
      appState: UIState.recording,
      transcription: '',
      isBottom: true,
    });

    try {
      await this._voiceProcessor?.start(
        this._cheetah!.frameLength,
        this._cheetah!.sampleRate,
      );
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async _stopProcessing() {
    this.setState({
      appState: UIState.stopping,
    });

    try {
      await this._voiceProcessor?.stop();
    } catch (err: any) {
      this.handleError(err);
      return;
    }

    try {
      const result = await this._cheetah?.flush();
      if (result !== undefined) {
        this.setState({
          transcription: this.state.transcription + result.transcript,
          appState: UIState.init,
        });
      }
    } catch (err: any) {
      this.handleError(err);
    }
  }

  async _toggleListening() {
    if (this.state.appState === UIState.recording) {
      await this._stopProcessing();
    } else if (this.state.appState === UIState.init) {
      await this._startProcessing();
    }
  }

  checkBottom({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: NativeScrollEvent) {
    this.setState({
      isBottom:
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 1,
    });
  }

  render() {
    const disabled =
      this.state.appState === UIState.loading ||
      this.state.appState === UIState.error ||
      this.state.appState === UIState.stopping;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#377DFF" />
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>Cheetah</Text>
        </View>
        <View style={{flex: 6}}>
          <View style={styles.transcriptionBox}>
            <ScrollView
              ref={(el) => {
                this._scrollView = el;
              }}
              onScroll={({nativeEvent}) => this.checkBottom(nativeEvent)}
              onContentSizeChange={() => {
                if (this.state.isBottom) {
                  this._scrollView?.scrollToEnd({animated: true});
                }
              }}>
              <Text style={styles.transcriptionText}>
                {this.state.transcription}
              </Text>
            </ScrollView>
          </View>
        </View>

        {this.state.appState === UIState.error && (
          <View style={styles.errorBox}>
            <Text
              style={{
                color: 'white',
                fontSize: 16,
              }}>
              {this.state.errorMessage}
            </Text>
          </View>
        )}

        <View
          style={{flex: 1, justifyContent: 'center', alignContent: 'center'}}>
          <TouchableOpacity
            style={[styles.buttonStyle, disabled ? styles.buttonDisabled : {}]}
            onPress={() => this._toggleListening()}
            disabled={disabled}>
            <Text style={styles.buttonText}>
              {this.state.appState === UIState.recording ? 'Stop' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{flex: 0.5, justifyContent: 'center', paddingBottom: 10}}>
          <Text style={styles.instructions}>
            Made in Vancouver, Canada by Picovoice
          </Text>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  subContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBar: {
    flex: 1,
    backgroundColor: '#377DFF',
    justifyContent: 'flex-end',
    maxHeight: 50,
  },
  statusBarText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 15,
  },
  buttonStyle: {
    width: '50%',
    height: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: '#377DFF',
    borderRadius: 100,
  },
  buttonText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'gray',
  },
  itemStyle: {
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    color: '#666666',
  },
  errorBox: {
    backgroundColor: 'red',
    margin: 20,
    padding: 20,
    textAlign: 'center',
  },
  transcriptionBox: {
    backgroundColor: '#25187E',
    margin: 20,
    padding: 20,
    height: '100%',
    flex: 1,
  },
  transcriptionText: {
    fontSize: 20,
    color: 'white',
  },
});
