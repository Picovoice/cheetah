let cheetah = null;

function writeMessage(message) {
  console.log(message);
  document.getElementById("status").innerHTML = message;
}

function cheetahErrorCallback(error) {
  writeMessage(error);
}

function cheetahTranscriptionCallback(cheetahTranscript) {
  let inputTranscript = cheetahTranscript.transcript;
  let outputTranscriptHTML = "";

  let startingIndex = 0;
  for (const word of cheetahTranscript.words) {
    let strIndex = inputTranscript.slice(startingIndex).indexOf(word.word);
    outputTranscriptHTML += inputTranscript.slice(startingIndex, startingIndex + strIndex);
    startingIndex += strIndex + word.word.length;

    if (word.startSeconds !== -1) {
      outputTranscriptHTML += `<span class="word has-tooltip">${word.word}`;
      outputTranscriptHTML += `<span class="tooltip-text">${(word.confidence * 100).toFixed(1)}% confidence</span>`;
      outputTranscriptHTML += "</span>";
    } else {
      outputTranscriptHTML += word.word;
    }
  }

  document.getElementById("result").innerHTML += outputTranscriptHTML;

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
      {
        enableAutomaticPunctuation: true,
        enableTextNormalization: true
      },
    );

    writeMessage("Cheetah worker ready!");

    writeMessage(
      "WebVoiceProcessor initializing. Microphone permissions requested ...",
    );
    const processAnnotatedEngine = {
      worker: {
        postMessage: e => {
          console.log(e);
          if (e.command && e.command === "process") {
            e.command = "process_annotated";
          }
          cheetah.worker.postMessage(e);
        }
      }
    };
    await window.WebVoiceProcessor.WebVoiceProcessor.subscribe(processAnnotatedEngine);
    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (err) {
    cheetahErrorCallback(err);
  }
}
