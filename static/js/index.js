var User = function(username) {
  this.username = username;
}
var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var PeerChat = (function() {
  var rtcConfig = {
    iceServers: [
      {urls: "stun:stun2.l.google.com:19302"}
    ]
  };
  var offerOptions = {
    
  };

  var me;
  var init = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
    $("#chat-toggle").on("click", toggleChat);
    setupWebRTC();
  }

  var setupWebRTC = function() {
    console.log(rtcConfig);
    console.log("initializing webrtc connection");
    var conn = new RTCPeerConnection(rtcConfig);
    var dataChannel = conn.createDataChannel({ordered: false, maxRetransmitTime: 3000});
    conn.onicecandidate = handleIceCandidate;
    var offer = conn.createOffer(onOfferCreated.bind(conn), onError);
  }

  var onOfferCreated = function(description) {
    console.log("offer created");
    console.log(description);
    this.setLocalDescription(description, onLocalDescriptionSet, onError);
  }

  var onLocalDescriptionSet = function() {
    console.log("local description set");
  }

  var handleIceCandidate = function(e) {
    console.log("handling ice candidate");
    console.log(e);
    if (e.candidate) {
      console.log(e.candidate);
    } else {
      return;
    }
  }

  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    $.post("/users", JSON.stringify({ username: newUsername }), createUserSuccess, "json");
  }

  var createUserSuccess = function(data) {
    me = new User(data["username"]);
    $("#set-user-name").remove();
    $("#user-name").remove();
    $("#set-user-name-label").remove();
    $("body").prepend("<h2>Welcome " + me.username + "</h2>");
    $("#main-app").removeClass("hidden");
    startWebSocket();
  }

  var startWebSocket = function() {
    var socket = new WebSocket("ws://127.0.0.1:4567/users");
    socket.onopen = function() {
      console.log("connection open");
      socket.send(JSON.stringify(me));
      console.log("getting users...");
      me.socket = socket;
    }
    socket.onmessage = function(msg) {
      userList = JSON.parse(msg.data);
      updateUsers(userList);
      console.log(userList);
    }
  }

  var toggleChat = function() {
    var selectedUsername = $("#user-list").val();
    console.log(me);
  }

  var updateUsers = function(userList) {
    var $userList = $("#user-list");
    $userList.empty();
    for (var i in userList) {
      var user = userList[i];
      $userList.append("<option>" + user.username + "</option>");
    }
  }

  var onError = function(error) {
    window.alert(error.message);
  }
  
  return {
    init: init
  }
})();

window.onload = PeerChat.init;
