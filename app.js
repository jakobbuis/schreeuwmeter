$(document).ready(function(){
    // Standarize feature APIs
    navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    // Feature detection
    if (!navigator.getUserMedia) {
        showError('Your browser does not meet the technical requirements for the application');
        return;
    }

    // Connect to the microphone
    navigator.getUserMedia({video: false, audio: true}, setupMeter, function(){});

    // Setup the canvas
    window.canvas = $("#meter").get()[0].getContext("2d");

    window.gradient = canvas.createLinearGradient(0, 0, 100, 0);
    window.gradient.addColorStop(1,'#ff0000');
    window.gradient.addColorStop(0.66,'#ffff00');
    window.gradient.addColorStop(0.33,'#ffff00');
    window.gradient.addColorStop(0,'#00ff00');
});

/**
 * Use the audioStream to connect to the processor
 * @param  object localMediaStream
 * @return undefined
 */ 
function setupMeter(localMediaStream)
{
    // Setup audio context
    var context = new AudioContext();
    var source = context.createMediaStreamSource(localMediaStream);

    // Fix a bug for mozilla that crashes the input after roughly 5 seconds
    // as per https://support.mozilla.org/en-US/questions/984179
    window.horrible_hack_wtf_for_firefox = source;
    
    // Create a processor to interpret the sound
    processor = context.createScriptProcessor(2048, 1, 1);

    // Setup an analyzer
    window.analyser = context.createAnalyser();
    window.analyser.smoothingTimeConstant = 0.3;
    window.analyser.fftSize = 1024;

    // Connect the source to the analyser, to the processor
    source.connect(window.analyser);
    analyser.connect(processor);

    processor.onaudioprocess = processAudio;
    source.connect(processor);

    // Store the max volume level reached
    window.volumeMax = 0;
}

/**
 * Process the audio into a volume level
 */
function processAudio() {
    // Calculate the volume level
    var array =  new Uint8Array(window.analyser.frequencyBinCount);
    window.analyser.getByteFrequencyData(array);
    var volume = getAverageVolume(array);

    // Calculate desired display values
    var text_volume = Math.round(volume * 84);  // Scales 0 - 8400
    var graph_volume = Math.round(volume * 2);  // Scales 0 - 200

    // Display max volume reached
    window.volumeMax = Math.max(window.volumeMax, text_volume);
    $('#max').text(window.volumeMax);

    // Reset the canvas to blank
    window.canvas.clearRect(0, 0, 100, 100);
    window.canvas.fillStyle = window.gradient;

    // Draw meter
    window.canvas.fillRect(0, 0, graph_volume, 100);
}

/**
 * Returns the average volume of an event buffer
 * @param  array values
 * @return float
 */
function getAverageVolume(values) {
    var sum = 0;
    var count = values.length;

    for (i = 0; i< count; i++) {
        sum += values[i];
    };

    return sum / count;
}
