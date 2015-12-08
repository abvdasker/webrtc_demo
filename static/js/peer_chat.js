var PeerChat = (function() {
  var currentPeer;

  var init = function() {
    setupWebRTC();
  }

  var setupWebRTC = function() {
    console.log(rtcConfig);
    console.log("initializing webrtc connection");
    var conn = new RTCPeerConnection(rtcConfig);
    conn.onicecandidate = handleIceCandidate; // 1
  };

  var onLocalDescriptionSet = function() {
    console.log("local description set");
  };

  var connectTo = function(username) {
    setCurrentPeer(username);
    if (currentPeer && currentPeer.username != username)
      return;
    currentPeer.connect();
  };

  var offerReceived = function(fromUsername, offer) {
    setCurrentPeer(fromUsername);
    if (currentPeer && currentPeer.username != fromUsername)
      return;
    currentPeer.connectFrom(offer);
  };

  var answerReceived = function(fromUsername, answer) {
    if (fromUsername == currentPeer.username)
      currentPeer.onAnswerReceived(answer);
  };

  var iceCandidateReceived = function(fromUsername, candidate) {
    setCurrentPeer(fromUsername);
    if (currentPeer && currentPeer.username != fromUsername)
      return;
    if (fromUsername == currentPeer.username)
      currentPeer.onIceCandidateReceived(candidate);
  };

  var getCurrentPeer = function() {
    return currentPeer;
  };

  var setCurrentPeer = function(fromUsername) {
    if (currentPeer == null) {
      currentPeer = new Peer(fromUsername);
    }
  };

  var clearCurrentPeer = function() {
    currentPeer = null;
  }
  
  return {
    init: init,
    connectTo: connectTo,
    offerReceived: offerReceived,
    answerReceived: answerReceived,
    iceCandidateReceived: iceCandidateReceived,
    getCurrentPeer: getCurrentPeer,
    clearCurrentPeer: clearCurrentPeer
  };
})();
