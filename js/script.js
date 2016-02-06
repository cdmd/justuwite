var session = null;
var increment = 0;
var progress = 0;
var currentMediaSession;
var timer = null;

$( document ).ready(function(){
  document.getElementById("progress").addEventListener('mouseup', seekMedia);
  document.getElementById("progress").addEventListener('mousemove', showTime);
  document.getElementById("progress").addEventListener('mouseout', hideTime);
  var loadCastInterval = setInterval(function(){
    if (chrome.cast.isAvailable) 
    {
      console.log('Cast has loaded.');
      clearInterval(loadCastInterval);
      initializeCastApi();
    } 
    else 
    {
      console.log('Unavailable');
    }
  }, 1000);
});


function initializeCastApi() 
{
  var applicationID = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
  var sessionRequest = new chrome.cast.SessionRequest(applicationID);
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest, sessionListener, receiverListener);
  chrome.cast.initialize(apiConfig, onInitSuccess, onInitError);
}

function sessionListener(e) 
{
  session = e;
  console.log('New session');
  if (session.media.length !== 0) 
  {
    console.log('Found ' + session.media.length + ' sessions.');
  }
}

function receiverListener(e) {
  if( e == 'available' ) 
  {
    console.log("Chromecast was found on the network.");
    launchApp();
  }
  else 
  {
    console.log("There are no Chromecasts available.");
  }
}

function onInitSuccess() 
{
  console.log("Initialization succeeded");
}

function onInitError() 
{
  console.log("Initialization failed");
}

$('#castme').click(function()
{
  launchApp();
});


$('#pause').click(function()
{
  if(!session || !currentMediaSession) {
    return;
  }
  
  currentMediaSession.pause(null, pauseSuccess, playPauseFailure);
});

function pauseSuccess()
{
  console.log("Pause Success");
  $('#pause').addClass("hidden");
  $('#play').removeClass("hidden");
  if(timer)
    clearInterval(timer);
  increment = 0;
}

function playPauseFailure()
{
  console.log("Pause Failure");
}


$('#play').click(function()
{
  if(!session || !currentMediaSession) {
    return;
  }
  
  currentMediaSession.play(null, playSuccess, playPauseFailure);
});

function playSuccess()
{
  console.log("Play Success");
  $('#play').addClass("hidden");
  $('#pause').removeClass("hidden");
  var tt = currentMediaSession.media.duration;
  increment = (1/tt)*100;
  if(timer)
    clearInterval(timer);
  updateProgressBar();
}

function launchApp() 
{
  console.log("Launching the Chromecast App...");
  chrome.cast.requestSession(onRequestSessionSuccess, onLaunchError);
}

function onRequestSessionSuccess(e) 
{
  console.log("Successfully created session: " + e.sessionId);
  session = e;
}

function onLaunchError() 
{
  console.log("Error connecting to the Chromecast.");
}

function onRequestSessionSuccess(e) 
{
  console.log("Successfully created session: " + e.sessionId);
  session = e;
  loadMedia();
}

function loadMedia() 
{
  if (!session) 
  {
    console.log("No session.");
    return;
  }

  var mediaInfo = new chrome.cast.media.MediaInfo(videoLink);
  mediaInfo.contentType = 'video/mp4';

  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = true;

  session.loadMedia(request, onLoadSuccess, onLoadError);
}

function onLoadSuccess(mediaSession) {
  console.log('Successfully loaded.');
  currentMediaSession = mediaSession;
  playSuccess();
  mediaSession.addUpdateListener(onMediaStatusUpdate);
  var tt = mediaSession.media.duration;
  increment = (1/tt)*100;
  console.log(increment, mediaSession.media.duration); 
  updateProgressBar();
}

function updateProgressBar()
{
  if(increment === 0)
    return;
  document.getElementById('progressBar').style.width= (progress) +'%';
  var timeLeftInSecs = progress/increment;
  var hours = Math.floor(timeLeftInSecs / 3600);
  var minutes = Math.floor(timeLeftInSecs / 60);
  var seconds = timeLeftInSecs - hours * 3600 - minutes * 60;
  if(!isNaN(timeLeftInSecs))
  {
    document.getElementById('timeleft').innerHTML = ((hours < 10) ? ('0' + hours) : hours) + ':' + ((minutes<10) ? ('0' + minutes) : minutes) + ':' + ((seconds<10) ? ('0'+seconds.toFixed(3)) : seconds.toFixed(3));
  }
  else
  {
    document.getElementById('timeleft').innerHTML = '00:00:00.000';
  }
  if(progress < 100 && increment !== 0)
  {
    progress = progress + increment;
    timer = setTimeout(updateProgressBar.bind(this),1000);
  }
}


function onMediaStatusUpdate(e)
{
  if(e === false)
  {
    progress = 0;
    increment = 0;
  }
  else
  {
    progress = (currentMediaSession.currentTime / currentMediaSession.media.duration)*100;
    console.log("Updating Media", currentMediaSession.currentTime, currentMediaSession.media.duration);
    //updateProgressBar();
  }
}

function onLoadError() {
  console.log('Failed to load.');
}

$('#stop').click(function(){
  stopApp();
});

function stopApp() {
  session.stop(onStopAppSuccess, onStopAppError);
  progress = 0;
  increment = 0;
  if(timer)
    clearInterval(timer);
  document.getElementById('timeleft').innerHTML = '<br/>';
}

function onStopAppSuccess() {
  console.log('Successfully stopped app.');
}

function onStopAppError() {
  console.log('Error stopping app.');
}

function seekMedia(event)
{
  var pos = parseInt(event.offsetX);
  var total = document.getElementById("progress").clientWidth;
  console.log(pos/total);
  var request = new chrome.cast.media.SeekRequest();
  request.currentTime = (pos/total)*currentMediaSession.media.duration;
  currentMediaSession.seek(request, onSeekSuccess(request.currentTime), onSeekError);
}

function showTime(event)
{
  var x, y;
  if(event.offsetX == x && event.offsetY == y) {
    return;
  }
  var pos = parseInt(event.offsetX);
  var total = document.getElementById("progress").clientWidth;
  var timeLeftInSecs = (pos/total)*currentMediaSession.media.duration;
  var hours = Math.floor(timeLeftInSecs / 3600);
  var minutes = Math.floor(timeLeftInSecs / 60);
  var seconds = timeLeftInSecs - hours * 3600 - minutes * 60;
  if(!isNaN(timeLeftInSecs))
  {
    document.getElementById('hoverTime').innerHTML = ((hours < 10) ? ('0' + hours) : hours) + ':' + ((minutes<10) ? ('0' + minutes) : minutes) + ':' + ((seconds<10) ? ('0'+seconds.toFixed(3)) : seconds.toFixed(3));
  }
}

function hideTime(event)
{
  document.getElementById('hoverTime').innerHTML = '<br/>';
}

function onSeekSuccess(currTime)
{
  progress = currTime/currentMediaSession.media.duration;
  console.log("Seek success");
}


function onSeekError()
{
  console.log("Seek Failure");
}

