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
    window.analyser.frequenyBinCount = 2;

    // Connect the source to the analyser, to the processor
    source.connect(window.analyser);
    analyser.connect(processor);

    processor.onaudioprocess = processAudio;
    source.connect(processor);

    // Store the max volume level reached
    window.volumeMax = 0;

    // Lagging value used for smoothing the graph
    window.upvolume = 0;
}

/**
 * Process the audio into a volume level
 */
function processAudio() {
    // Calculate the current volume level
    var array =  new Uint8Array(window.analyser.frequenyBinCount);
    window.analyser.getByteFrequencyData(array);
    var volume = array[0] / 2.56;

    // Store the maximum volume reached
    window.volumeMax = Math.max(window.volumeMax, volume * 84);

    updateUI(volume);
}

/**
 * Updates the UI components to display the new volume
 * @param  integer   volume
 * @return undefined
 */
function updateUI(volume) {
    // Display max volume reached
    $('#max').text(window.volumeMax);

    drawGraph(volume);
}

function drawGraph(volume) {
    // Calculate lagging value for graph smoothing
    window.upvolume = 0.9 * window.upvolume + 0.1 * volume;

    // Reset canvas and draw the meter
    window.canvas.clearRect(0, 0, 100, 100);
    window.canvas.fillStyle = window.gradient;
    window.canvas.fillRect(0, 0, window.upvolume, 100);
}