let cheetah = null;

function writeMessage(message) {
  console.log(message);
  document.getElementById("status").innerHTML = message;
}

function cheetahErrorCallback(error) {
  writeMessage(error);
}

function cheetahTranscriptionCallback(cheetahTranscript) {
  document.getElementById("result").innerHTML += cheetahTranscript.transcript;
  if (cheetahTranscript.isEndpoint) {
    document.getElementById("result").innerHTML += "<br>";
  }
}

async function startCheetah(accessKey) {
  writeMessage("Cheetah is loading. Please wait...");
  try {
    cheetah = await CheetahWeb.CheetahWorker.create(
      accessKey,
      cheetahTranscriptionCallback,
      cheetahModel,
      { enableAutomaticPunctuation: true }
    );

    writeMessage("Cheetah worker ready!");

    writeMessage(
      "WebVoiceProcessor initializing. Microphone permissions requested ..."
    );
    await window.WebVoiceProcessor.WebVoiceProcessor.subscribe(cheetah);
    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (err) {
    cheetahErrorCallback(err);
  }
}
