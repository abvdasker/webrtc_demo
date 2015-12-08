var rtcConfig = {
  iceServers: [
    {urls: "stun:stun.l.google.com"}
  ]
};
var connection = {
  optional: [
    //{ RtpDataChannels: true }, DO NOT ADD THIS; IT APPARENTLY BREAKS CHROME!
    { DtlsSrtpKeyAgreement: true }
  ]
};
var constraints = {
  optional: [],
  mandatory: {
    offerToReceiveAudio: false,
    offerToReceiveVideo: false
  }
}

var Peer = function(username) {
  this.username = username;
  var conn;
  var dataChannel;
  function init() {
    conn = new RTCPeerConnection(rtcConfig, connection);
    conn.onicecandidate = handleIceCandidate;
  }
  this.connect = function() {
    dataChannel = conn.createDataChannel("test");
    setupDataChannel();
    conn.createOffer(onOfferCreated, App.onError, constraints);
  };
  this.connectFrom = function(offer) {
    conn.ondatachannel = function(event) {
      dataChannel = event.channel;
      setupDataChannel();
    };
    console.log("offer received");
    console.log(offer);
    var remoteDescription = new RTCSessionDescription(offer);
    conn.setRemoteDescription(remoteDescription, function() {
      console.log("remote description set");
      conn.createAnswer(onAnswerCreated, App.onError, {}/*constraints*/);
    }, App.onError);
  }
  function onOfferCreated(offer) {
    console.log("offer created");
    console.log(offer);
    conn.setLocalDescription(offer, function() {
      console.log("local description created");
      ServerConnection.sendOffer(App.getMe().username, username, offer);
    }, App.onError);
  };
  function onAnswerCreated(answer) {
    console.log("answer created");
    console.log(answer);
    conn.setLocalDescription(answer, function() {
      console.log("local description set");
      ServerConnection.sendAnswer(App.getMe().username, username, answer);
    }, App.onError);
  }
  function handleIceCandidate(event) {
    if (event.candidate) {
      console.log("new ice candidate found");
      console.log(conn.iceConnectionState);
      console.log(event.candidate);
      ServerConnection.sendIceCandidate(App.getMe().username, username, event.candidate);
    }
  };
  this.onIceCandidateReceived = function(candidateData) {
    var candidate = candidateData.candidate;
    var sdpMLineIndex = candidateData.sdpMLineIndex;
    var iceCandidate = new RTCIceCandidate({
      sdpMLineIndex: sdpMLineIndex,
      candidate: candidate
    });
    
    console.log(iceCandidate);
    conn.addIceCandidate(iceCandidate, function() {
      console.log("success");
      console.log(conn.iceConnectionState);
    }, App.onError);
    console.log("added ice candidate");
  };
  this.onAnswerReceived = function(answer) {
    console.log("answer received " + answer);
    var remoteDescription = new RTCSessionDescription(answer);
    conn.setRemoteDescription(remoteDescription, function() {
      console.log("remote description set");
    }, App.onError);
  };
  function setupDataChannel() {
    dataChannel.onopen = function(e) {
      console.log("opened channel!");
      //dataChannel.send("Hello World!");
      console.log(conn.iceConnectionState);
      App.startChat();
    };
    dataChannel.onmessage = function(event) {
      console.log(event.data);
      App.receiveMessage(username, event.data);
    };
    dataChannel.onerror = App.onError;
    dataChannel.onclose = function (event) {
      console.log("closed!");
      console.log(event);
      console.log(conn.iceConnectionState);
      App.endChat();
    };
  };
  this.send = function(data) {
    dataChannel.send(data);
  };
  this.disconnect = function() {
    dataChannel.close();
  }
  init();
};
