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

    // Enable configuration keys
    $(window).on('keyup', configure);
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

    // // Connect a low-pass filter
    var filterLow = context.createBiquadFilter();
    filterLow.type = 'lowpass';
    filterLow.frequency.value = 255;
    source.connect(filterLow);

    // Connect a high-pass filter
    var filterHigh = context.createBiquadFilter();
    filterHigh.type = 'highpass';
    filterHigh.frequency.value = 85;
    filterLow.connect(filterHigh);

    // Connect an analyser
    window.analyser = context.createAnalyser(5);
    window.analyser.smoothingTimeConstant = 0.3;
    window.analyser.fftSize = 32;
    filterHigh.connect(analyser);

    // Connect a processor to interpret the sound
    processor = context.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = processAudio;
    analyser.connect(processor);

    // Connect to speakers at the end
    processor.connect(context.destination);

    // Store the max volume level reached
    window.volumeMax = 0;

    // Lagging value used for smoothing the graph
    window.upvolume = 0;

    // Set default sensitivity
    window.audioSensitivity = 1;

    // Disable debug by default
    window.debug = false;
}

/**
 * Process the audio into a volume level
 */
function processAudio() {
    // Calculate the current volume level
    var array =  new Uint8Array(window.analyser.frequencyBinCount);
    window.analyser.getByteFrequencyData(array);
    var volume = (array[3] / 2.56) * window.audioSensitivity;

    // Calculate lagging value for graph smoothing
    window.upvolume = 0.9 * window.upvolume + 0.1 * volume;

    // Store the maximum volume reached
    window.volumeMax = Math.round(Math.max(window.volumeMax, volume * 84));

    updateUI(volume, array);
}

/**
 * Updates the UI components to display the new volume
 * @param  integer   volume average volume 
 * @param  array     array  raw array of volume files
 * @return undefined
 */
function updateUI(volume, array) {
    // Display max volume reached
    $('#max').text(window.volumeMax.toLocaleString());

    var volume = Math.round(window.upvolume * 84).toLocaleString();
    $('#current').text(volume);

    // Reset canvas and draw the meter
    window.canvas.clearRect(0, 0, 100, 100);

    if (window.debug) {
        window.canvas.fillStyle = 'black';
        var height = (100 / array.length) - 5;

        for (var i = array.length - 1; i >= 0; i--) {
            window.canvas.fillRect(0, (height+5)*i, array[i], (height)*(i+1));
        };
    }
    else {
        window.canvas.fillStyle = window.gradient;
        window.canvas.fillRect(0, 0, window.upvolume, 100);
    }
}

/**
 * Accepts keypress input to set various configuration options
 * @param  Event event
 * @return undefined
 */
function configure(event) {

    if (event.keyCode === 82) { // R resets graph and max volume reached
        window.upvolume = 0;
        window.volumeMax = 0;
    }
    else if (event.keyCode == 68) { // D toggles debug mode
        window.debug = !window.debug;
    }   
    else if (event.keyCode >= 49 && event.keyCode <= 57) {  // Numbers (0-9) set the sensitivity; default 5
        window.audioSensitivity = Math.pow(2, event.keyCode - 52);
    }
}
