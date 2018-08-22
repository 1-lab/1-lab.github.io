let videoWidth, videoHeight;

let qvga = {width: {exact: 320}, height: {exact: 240}};
let vga = {width: {exact: 640}, height: {exact: 480}};
let resolution = window.innerWidth < 640 ? vga : vga;

// whether streaming video from the camera.
let streaming = false;

let camvideo = document.getElementById('video');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOutputCtx = canvasOutput.getContext('2d');
let stream = null;

let cardioImg = document.getElementById('cardio');
let loadingInfo = document.getElementById('info');
var lessonVideo = document.getElementById('lessonvideo');
var lessonVideoSrc = document.getElementById('lessonvideosrc');

var count = 0;
var values = [];

// Setup camera
function startCamera() {
  if (streaming) return;
  navigator.mediaDevices.getUserMedia({video: resolution, audio: false})
    .then(function(s) {
    stream = s;
    camvideo.srcObject = s;
    camvideo.play();
  })
    .catch(function(err) {
    console.log("An error occured! " + err);
  });

  camvideo.addEventListener("canplay", function(ev){
    if (!streaming) {
      videoWidth = camvideo.videoWidth;
      videoHeight = camvideo.videoHeight;
      camvideo.setAttribute("width", videoWidth);
      camvideo.setAttribute("height", videoHeight);
      canvasOutput.width = videoWidth;
      canvasOutput.height = videoHeight;
      streaming = true;
    }
    startVideoProcessing();
    playVideo("lesson/s0.mp4");
  }, false);
}

// Start video processing
let faceClassifier = null;

let canvasInput = null;
let canvasInputCtx = null;

let canvasBuffer = null;
let canvasBufferCtx = null;

function startVideoProcessing() {
  if (!streaming) { console.warn("Please startup your webcam"); return; }
  stopVideoProcessing();
  canvasInput = document.createElement('canvas');
  canvasInput.width = videoWidth;
  canvasInput.height = videoHeight;
  canvasInputCtx = canvasInput.getContext('2d');
  
  canvasBuffer = document.createElement('canvas');
  canvasBuffer.width = videoWidth;
  canvasBuffer.height = videoHeight;
  canvasBufferCtx = canvasBuffer.getContext('2d');
  
  srcMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
  grayMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC1);
  
  faceClassifier = new cv.CascadeClassifier();
  faceClassifier.load('haarcascade_frontalface_default.xml');
  
  requestAnimationFrame(processVideo);
}

// Video processing loop
function processVideo() {
  stats.begin();
  canvasInputCtx.drawImage(camvideo, 0, 0, videoWidth, videoHeight);
  let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
  srcMat.data.set(imageData.data);
  cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
  let faces = [];
  let size;

  let faceVect = new cv.RectVector();
  let faceMat = new cv.Mat();
  cv.pyrDown(grayMat, faceMat);
  if (videoWidth > 320)
    cv.pyrDown(faceMat, faceMat);
  size = faceMat.size();
  faceClassifier.detectMultiScale(faceMat, faceVect);
  //for (let i = 0; i < faceVect.size(); i++) {
  if(faceVect.size() > 0) {
    //let face = faceVect.get(i);
    let face = faceVect.get(0);
    faces.push(new cv.Rect(face.x, face.y, face.width, face.height));
    values.push(face.y);
  }
  faceMat.delete();
  faceVect.delete();

  canvasOutputCtx.drawImage(canvasInput, 0, 0, videoWidth, videoHeight);
  drawResults(canvasOutputCtx, faces, size);
  stats.end();
  requestAnimationFrame(processVideo);
}

// Calc fitself tempo
// https://stackoverflow.com/questions/22583391/peak-signal-detection-in-realtime-timeseries-data
// return the number of moving motion

// Check if face detected
// return face detecting count in last few seconds

// Drawing fitself emoticon
function drawResults(ctx, results, size) {
  for (let i = 0; i < results.length; ++i) {
    let rect = results[i];
    let xRatio = videoWidth/size.width;
    let yRatio = videoHeight/size.height;
    ctx.drawImage(cardioImg, (rect.x-64+rect.width/2)*xRatio, rect.y*yRatio);
    //console.log(rect.y);
  }
  ctx.font = "100px Arial";
  ctx.fillStyle = "yellow";
  ctx.fillText(detectPeaks(values), 30, 100);
}

// Initialize
function initUI() {
  stats = new Stats();
  stats.showPanel(0);
  document.getElementById('camvideo').appendChild(stats.dom);
  lessonVideo = document.getElementById('lessonvideo');
  lessonVideoSrc = document.getElementById('lessonvideosrc');
  lessonVideo.addEventListener("ended", playEnded, false);
}

function opencvIsReady() {
  console.log('OpenCV.js is ready');
  if (!featuresReady) {
    console.log('Requred features are not ready.');
    return;
  }
  loadingInfo.innerHTML = '';
  initUI();
  startCamera();
}

// Closing
function stopVideoProcessing() {
}

function stopCamera() {
  if (!streaming) return;
  stopVideoProcessing();
  document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
  camvideo.pause();
  camvideo.srcObject=null;
  stream.getVideoTracks()[0].stop();
  streaming = false;
}

// Play video & callback
function playVideo(file) {
  lessonVideo.pause();
  lessonVideoSrc.setAttribute('src', file);
  lessonVideo.load();
  //lessonVideo.currentTime = 0;
  lessonVideo.play();
}

function playEnded() {
  triggerfsm();
}

// State machine
var fsm = new StateMachine({
  init: 'idle',
  transitions: [
    { name: 'facedetected', from: 'idle',        to: 'greeting' },
    { name: 'facedetected', from: 'greeting',    to: 'exercise' },
    { name: 'slowdetected', from: 'exercise',    to: 'encouraging' },
    { name: 'gooddetected', from: 'exercise',    to: 'excellent' },
    { name: 'facedetected', from: 'encouraging', to: 'saygoodbye' },
    { name: 'facedetected', from: 'excellent',   to: 'saygoodbye' },
    { name: 'facedetected', from: 'saygoodbye',  to: 'idle' },
  ],
  methods: {
    faceDetected: function() { console.log('Face detected'); onFaceDetected();      },
    slowDetected: function() { console.log('Slow pace detected'); onSlowDetected(); },
    goodDetected: function() { console.log('Good pace detected'); onGoodDetect(); },
  }
});

function onFaceDetected() {
  console.log('onFaceDetected:'+fsm.state);

  switch(fsm.state) {
    case 'idle':
      console.log("greeting");
      count = 0;
      values = [];
      playVideo("lesson/s2.mp4");
      fsm.facedetected();
      break;
    case 'greeting':
      console.log("exercise");
      playVideo("lesson/s3.mp4");
      fsm.facedetected();
      break;
    case 'encouraging':
      console.log("saygoodbye");
      playVideo("lesson/s5.mp4");
      fsm.facedetected();
      break;
    case 'excellent':
      console.log("saygoodbye");
      playVideo("lesson/s4.mp4");
      fsm.facedetected();
      break;
    case 'saygoodbye':
      console.log("idle");
      playVideo("lesson/s8.mp4");
      fsm.facedetected();
      break;
  }
}

function onSlowDetected() {
  console.log('onSlowDetected:'+fsm.state);

  switch(fsm.state) {
    case 'exercise':
      console.log("encouraging");
      count = 0;
      values = [];
      playVideo("lesson/s5.mp4");
      fsm.slowdetected();
      break;
  }
}

function onGoodDetected() {
  console.log('onGoodDetected:'+fsm.state);

  switch(fsm.state) {
    case 'exercise':
      console.log("excellent");
      count = 0;
      values = [];
      playVideo("lesson/s6.mp4");
      fsm.gooddetected();
      break;
  }
}

function triggerfsm() {
  console.log('fsm triggered @', fsm.state);

  if(checkFitTempoSlow() && fsm.can('slowdetected')) {
    console.log('fsm/slowdetected');
    fsm.slowDetected();
  }
  else if(fsm.can('gooddetected')) {
    console.log('fsm/gooddetected');
    fsm.goodDetected();
  }

  if(checkifFacedetected() && fsm.can('facedetected')) {
    console.log('fsm/facedetected');
    fsm.faceDetected();
  }
}

function checkifFacedetected() {
  return true;
}

function checkFitTempoSlow() {
  if(detectPeaks(values) < 5) {
    return true;
  } else {
    return false;
  }
}
