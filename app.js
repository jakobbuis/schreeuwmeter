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
    window.maxVolume = 0;

    // Lagging value used for smoothing the graph
    window.currentVolume = 0;

    // Set default sensitivity
    window.audioSensitivity = 1;

    // Disable debug by default
    window.debug = false;

    // Default bucket setting
    window.bucket = 3;
}

/**
 * Process the audio into a volume level
 */
function processAudio() {
    // Calculate the current volume level
    var array =  new Uint8Array(window.analyser.frequencyBinCount);
    window.analyser.getByteFrequencyData(array);
    var volume = (array[window.bucket] / 2.56) * window.audioSensitivity;

    // Calculate lagging value for graph smoothing
    window.currentVolume = 0.9 * window.currentVolume + 0.1 * volume;

    // Store the maximum volume reached
    window.maxVolume = Math.round(Math.max(window.maxVolume, window.currentVolume));

    updateUI(array);
}

/**
 * Updates the UI components to display the new volume
 * @param  array     array  raw array of volume files
 * @return undefined
 */
function updateUI(array) {
    // Display max volume reached
    $('#max').text((window.maxVolume * 84).toLocaleString());

    // Display current volume
    $('#current').text(Math.round(window.currentVolume * 84).toLocaleString());

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
        window.canvas.fillRect(0, 0, window.currentVolume, 100);
    }
}

/**
 * Accepts keypress input to set various configuration options
 * @param  Event event
 * @return undefined
 */
function configure(event) {

    if (event.keyCode === 82) { // R resets graph and max volume reached
        window.currentVolume = 0;
        window.maxVolume = 0;
        console.log('Reset volumes');
    }
    else if (event.keyCode == 68) { // D toggles debug mode
        window.debug = !window.debug;
        if (window.debug) {
            console.log('Debug ON');
        }
        else {
            console.log('Debug OFF');
        }
    }
    else if (event.keyCode == 66) { // B shows prompt to set bucket number
        window.bucket = parseInt(prompt('Choose bucket (integers only)'));
        console.log('Using bucket ' + window.bucket);
    }   
    else if (event.keyCode >= 49 && event.keyCode <= 57) {  // Numbers (0-9) set the sensitivity; default 5
        window.audioSensitivity = Math.pow(2, event.keyCode - 53);
        console.log('Audio sensitivity set to ' + window.audioSensitivity);
    }
}
