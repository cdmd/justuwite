var JustCast = function() {
  this.session = null;
  this.increment = 0;
  this.progress = 0;
  this.currentMediaSession = null;
  this.timer = null;
  
  this.initializeCastPlayer();
};

JustCast.prototype.initializeCastPlayer = function() {
  if (!chrome.cast || !chrome.cast.isAvailable) {
    setTimeout(this.initializeCastPlayer.bind(this), 1000);
    return;
  }
  // default set to the default media receiver app ID
  // optional: you may change it to point to your own
  var applicationID = 'C6D5BAED';

  // auto join policy can be one of the following three
  var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
  //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.PAGE_SCOPED;
  //var autoJoinPolicy = chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED;

  // request session
  var sessionRequest = new chrome.cast.SessionRequest(applicationID);
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
                                            this.sessionListener.bind(this),
                                            this.receiverListener.bind(this),
                                            autoJoinPolicy);

  chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.onError.bind(this));
  this.initializeUI();
};

JustCast.prototype.onError = function()
{
  console.log("Chromecast init failed");
};

JustCast.prototype.sessionListener = function(e)
{
  this.session = e;
  console.log('New session');
  if (this.session.media[0])
  {
    console.log('Found ' + this.session.media.length + ' sessions.');
    this.onMediaDiscovered('activeSession', this.session.media[0]);
  }
};

JustCast.prototype.receiverListener = function(e) {
  if( e == 'available' )
  {
    console.log("Chromecast was found on the network.");
    this.launchApp();
  }
  else
  {
    console.log("There are no Chromecasts available.");
  }
};

JustCast.prototype.onInitSuccess = function()
{
  console.log("Initialization succeeded");
};

JustCast.prototype.onInitError = function()
{
  console.log("Initialization failed");
};

JustCast.prototype.initializeUI = function() {
  document.getElementById("progress").addEventListener('mouseup', this.seekMedia.bind(this));
  document.getElementById("progress").addEventListener('mousemove', this.showTime.bind(this));
  document.getElementById("progress").addEventListener('mouseout', this.hideTime.bind(this));
  document.getElementById("play").addEventListener('click', this.playMedia.bind(this));
  document.getElementById("castme").addEventListener('click', this.launchApp.bind(this));
  document.getElementById("pause").addEventListener('click', this.pauseMedia.bind(this));
  document.getElementById("stop").addEventListener('click', this.stopApp.bind(this));
};

JustCast.prototype.pauseMedia = function()
{
  if(!this.session || !this.currentMediaSession) {
    return;
  }

  this.currentMediaSession.pause(null,
                                 this.pauseSuccess.bind(this),
                                 this.playPauseFailure.bind(this));
};

JustCast.prototype.pauseSuccess = function()
{
  console.log("Pause Success");
  $('#pause').addClass("hidden");
  $('#play').removeClass("hidden");
  if(this.timer)
    clearInterval(this.timer);
  this.increment = 0;
};

JustCast.prototype.playPauseFailure = function()
{
  console.log("Pause Failure");
};


JustCast.prototype.playMedia = function()
{
  if(!this.session || !this.currentMediaSession) {
    return;
  }

  this.currentMediaSession.play(null,
                                this.playSuccess.bind(this),
                                this.playPauseFailure.bind(this));
};

JustCast.prototype.playSuccess = function()
{
  console.log("Play Success");
  $('#play').addClass("hidden");
  $('#pause').removeClass("hidden");
  var tt = this.currentMediaSession.media.duration;
  this.increment = (1/tt)*100;
  if(this.timer)
    clearInterval(this.timer);
  this.updateProgressBar();
};

JustCast.prototype.launchApp = function()
{
  console.log("Launching the Chromecast App...");
  chrome.cast.requestSession(this.onRequestSessionSuccess.bind(this),
                             this.onLaunchError.bind(this));
};

JustCast.prototype.onRequestSessionSuccess = function(e)
{
  console.log("Successfully created session: " + e.sessionId);
  this.session = e;
};

JustCast.prototype.onLaunchError = function()
{
  console.log("Error connecting to the Chromecast.");
};

JustCast.prototype.onRequestSessionSuccess = function(e)
{
  console.log("Successfully created session: " + e.sessionId);
  this.session = e;
  this.loadMedia();
};

JustCast.prototype.loadMedia = function()
{
  if (!this.session)
  {
    console.log("No session.");
    return;
  }

  var mediaInfo = new chrome.cast.media.MediaInfo(videoLink);
  mediaInfo.contentType = 'video/mp4';

  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = true;

  this.session.loadMedia(request,
                         this.onMediaDiscovered.bind(this, 'loadMedia'),
                         this.onLoadError.bind(this));
};

JustCast.prototype.onMediaDiscovered = function(how, mediaSession) {
  if(how == 'loadMedia') {
    console.log('Successfully loaded.');
    this.currentMediaSession = mediaSession;
  }
  
  if(how == 'activeSession') {
    console.log("Active session found");
  }
  
  this.playSuccess();
  this.currentMediaSession.addUpdateListener(this.onMediaStatusUpdate.bind(this));
};

JustCast.prototype.updateProgressBar = function()
{
  if(this.increment === 0)
    return;
  document.getElementById('progressBar').style.width= (this.progress) +'%';
  var timeLeftInSecs = this.progress/this.increment;
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
  if(this.progress < 100 && this.increment !== 0)
  {
    this.progress = this.progress + this.increment;
    this.timer = setTimeout(this.updateProgressBar.bind(this),1000);
  }
};


JustCast.prototype.onMediaStatusUpdate = function(e)
{
  if(e === false)
  {
    this.progress = 0;
    this.increment = 0;
  }
  else
  {
    this.progress = (this.currentMediaSession.currentTime / this.currentMediaSession.media.duration)*100;
    console.log("Updating Media", this.currentMediaSession.currentTime,
                                  this.currentMediaSession.media.duration);
  }
};

JustCast.prototype.onLoadError = function() {
  console.log('Failed to load.');
};


JustCast.prototype.stopApp = function() {
  this.session.stop(this.onStopAppSuccess.bind(this), this.onStopAppError.bind(this));
  this.progress = 0;
  this.increment = 0;
  if(this.timer)
    clearInterval(this.timer);
  document.getElementById('timeleft').innerHTML = '<br/>';
};

JustCast.prototype.onStopAppSuccess = function() {
  console.log('Successfully stopped app.');
};

JustCast.prototype.onStopAppError = function() {
  console.log('Error stopping app.');
};

JustCast.prototype.seekMedia = function(event)
{
  var pos = parseInt(event.offsetX);
  var total = document.getElementById("progress").clientWidth;
  console.log(pos/total);
  var request = new chrome.cast.media.SeekRequest();
  request.currentTime = (pos/total)*currentMediaSession.media.duration;
  this.currentMediaSession.seek(request,
                                this.onSeekSuccess.bind(this, request.currentTime),
                                this.onSeekError.bind(this));
};

JustCast.prototype.showTime = function(event)
{
  var x, y;
  if(event.offsetX == x && event.offsetY == y) {
    return;
  }
  var pos = parseInt(event.offsetX);
  var total = document.getElementById("progress").clientWidth;
  var timeLeftInSecs = (pos/total)*this.currentMediaSession.media.duration;
  var hours = Math.floor(timeLeftInSecs / 3600);
  var minutes = Math.floor(timeLeftInSecs / 60);
  var seconds = timeLeftInSecs - hours * 3600 - minutes * 60;
  if(!isNaN(timeLeftInSecs))
  {
    document.getElementById('hoverTime').innerHTML = ((hours < 10) ? ('0' + hours) : hours) + ':' + ((minutes<10) ? ('0' + minutes) : minutes) + ':' + ((seconds<10) ? ('0'+seconds.toFixed(3)) : seconds.toFixed(3));
  }
};

JustCast.prototype.hideTime = function(event)
{
  document.getElementById('hoverTime').innerHTML = '<br/>';
};

JustCast.prototype.onSeekSuccess = function(currTime)
{
  this.progress = currTime/this.currentMediaSession.media.duration;
  console.log("Seek success");
};


JustCast.prototype.onSeekError = function()
{
  console.log("Seek Failure");
};
