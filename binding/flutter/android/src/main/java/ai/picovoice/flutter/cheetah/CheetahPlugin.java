//
// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

package ai.picovoice.flutter.cheetah;

import android.content.Context;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import ai.picovoice.cheetah.*;
import io.flutter.embedding.engine.plugins.FlutterPlugin;
import io.flutter.plugin.common.MethodCall;
import io.flutter.plugin.common.MethodChannel;
import io.flutter.plugin.common.MethodChannel.MethodCallHandler;
import io.flutter.plugin.common.MethodChannel.Result;

public class CheetahPlugin implements FlutterPlugin, MethodCallHandler {

  private enum Method {
    CREATE,
    PROCESS,
    FLUSH,
    DELETE
  }

  private Context flutterContext;
  private MethodChannel channel;
  private final Map<String, Cheetah> cheetahPool = new HashMap<>();

  @Override
  public void onAttachedToEngine(@NonNull FlutterPluginBinding flutterPluginBinding) {
    flutterContext = flutterPluginBinding.getApplicationContext();
    channel = new MethodChannel(flutterPluginBinding.getBinaryMessenger(), "cheetah");
    channel.setMethodCallHandler(this);
  }

  @Override
  public void onMethodCall(@NonNull MethodCall call, @NonNull Result result) {
    Method method;
    try {
      method = Method.valueOf(call.method.toUpperCase());
    } catch (IllegalArgumentException e) {
      result.error(
              CheetahRuntimeException.class.getSimpleName(),
              String.format("Cheetah method '%s' is not a valid function", call.method),
              null);
      return;
    }

    switch (method) {
      case CREATE:
        try {
          String accessKey = call.argument("accessKey");
          String modelPath = call.argument("modelPath");
          double endpointDuration = call.argument("endpointDuration");

          Cheetah.Builder cheetahBuilder = new Cheetah.Builder(accessKey)
                  .setModelPath(modelPath)
                  .setEndpointDuration((float) endpointDuration);

          Cheetah cheetah = cheetahBuilder.build(flutterContext);
          cheetahPool.put(String.valueOf(System.identityHashCode(cheetah)), cheetah);

          Map<String, Object> param = new HashMap<>();
          param.put("handle", String.valueOf(System.identityHashCode(cheetah)));
          param.put("frameLength", cheetah.getFrameLength());
          param.put("sampleRate", cheetah.getSampleRate());
          param.put("version", cheetah.getVersion());

          result.success(param);
        } catch (CheetahException e) {
          result.error(e.getClass().getSimpleName(), e.getMessage(), null);
        } catch (Exception e) {
          result.error(CheetahException.class.getSimpleName(), e.getMessage(), null);
        }
        break;
      case PROCESS:
        try {
          String handle = call.argument("handle");
          ArrayList<Integer> pcmList = call.argument("frame");

          if (!cheetahPool.containsKey(handle)) {
            result.error(
                    CheetahInvalidStateException.class.getSimpleName(),
                    "Invalid cheetah handle provided to native module",
                    null);
            return;
          }

          short[] pcm = null;
          if (pcmList != null) {
            pcm = new short[pcmList.size()];
            for (int i = 0; i < pcmList.size(); i++) {
              pcm[i] = pcmList.get(i).shortValue();
            }
          }

          Cheetah cheetah = cheetahPool.get(handle);
          CheetahTranscript transcriptObj = cheetah.process(pcm);

          Map<String, Object> param = new HashMap<>();
          param.put("transcript", transcriptObj.getTranscript());
          param.put("isEndpoint", transcriptObj.getIsEndpoint());

          result.success(param);
        } catch (CheetahException e) {
          result.error(
                  e.getClass().getSimpleName(),
                  e.getMessage(),
                  null);
        }
        break;
      case FLUSH:
        try {
          String handle = call.argument("handle");

          if (!cheetahPool.containsKey(handle)) {
            result.error(
                    CheetahInvalidStateException.class.getSimpleName(),
                    "Invalid cheetah handle provided to native module",
                    null);
            return;
          }

          Cheetah cheetah = cheetahPool.get(handle);
          CheetahTranscript transcriptObj = cheetah.flush();

          Map<String, Object> param = new HashMap<>();
          param.put("transcript", transcriptObj.getTranscript());

          result.success(param);
        } catch (CheetahException e) {
          result.error(
                  e.getClass().getSimpleName(),
                  e.getMessage(),
                  null);
        }
        break;
      case DELETE:
        String handle = call.argument("handle");

        if (!cheetahPool.containsKey(handle)) {
          result.error(
                  CheetahInvalidArgumentException.class.getSimpleName(),
                  "Invalid Cheetah handle provided to native module.",
                  null);
          return;
        }

        Cheetah cheetah = cheetahPool.get(handle);
        cheetah.delete();
        cheetahPool.remove(handle);

        result.success(null);
        break;
    }
  }

  @Override
  public void onDetachedFromEngine(@NonNull FlutterPluginBinding binding) {
    channel.setMethodCallHandler(null);
  }
}
