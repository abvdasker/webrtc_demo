var User = function(username) {
  this.username = username;
}
var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var App = (function() {

  var users = [];
  var me;
  var candidate;

  var init = function() {
    console.log("starting app");
    ServerConnection.init();
    setListeners();
    PeerChat.init();
  };

  var setListeners = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
    console.log("setting listeners");
    $("#chat-toggle").on("click", toggleChat);
  };
  
  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    console.log("click");
    candidate = new User(newUsername);
    ServerConnection.createNewUser(newUsername);
  }

  var toggleChat = function() {
    var selectedUsername = $("#user-list").val()[0];
    console.log("selected to chat with" + selectedUsername);
    ServerConnection.sendOffer(selectedUsername);
  }

  var updateUsers = function(message) {
    if (me == null) {
      me = candidate;
      createUserSuccess();
    }
    var userList = message["users"];
    var $userList = $("#user-list");
    $userList.empty();
    users = [];
    for (var i in userList) {
      var user = new User(userList[i]["username"]);
      users.push(user);
      $userList.append("<option>" + user.username + "</option>");
    }
  };

  var createUserSuccess = function(data) {
    $("#set-user-name").remove();
    $("#user-name").remove();
    $("#set-user-name-label").remove();
    $("body").prepend("<h2>Welcome " + me.username + "</h2>");
    $("#main-app").removeClass("hidden");
  };

  var getMe = function() {
    return me;
  }

  return {
    init: init,
    updateUsers: updateUsers,
    getMe: getMe
  };
})();

var ServerConnection = (function() {
  var socket;
  var init = function() {
    startWebSocket();
  };
  
  var startWebSocket = function() {
    socket = new WebSocket("ws://127.0.0.1:4567/socket");
    socket.onopen = function() {
      console.log("connection open");
    }
    socket.onmessage = handleAction;
  };

  var handleAction = function(msg) {
    messageJSON = JSON.parse(msg.data);
    action = messageJSON["action"];
    console.log(messageJSON);
    console.log(action);
    if (action == "updateUsers") {
      App.updateUsers(messageJSON);
      return true;
    } else {
      console.log("unidentified action");
      return false;
    }
  };

  var createNewUser = function(username) {
    console.log("sending username " + username + " to server");
    message = { action: "createUser", username: username }
    socket.send(JSON.stringify(message));
  };

  var sendOffer = function(from, to) {
    var message = {
      action: "sendOffer",
      from: fromUser,
      to: toUser
    }
  }
  
  return {
    init: init,
    createNewUser: createNewUser
  };
})();

var PeerChat = (function() {

  var candidate;
  var rtcConfig = {
    iceServers: [
      {urls: "stun:stun2.l.google.com:19302"}
    ]
  };
  var offerOptions = {
    
  };

  var init = function() {
    setupWebRTC();
  }
  /*
Outgoing:
1. get ice candidate (STUN)
2. Find peer
3. Create offer
  3a) set local description
  3b) local description set
4. Transmit offer to peer through signaling channel
5. Receive peer answer
6. Chat!

Incoming
1. get offer
2. send anser
3. Chat!
*/

  var setupWebRTC = function() {
    console.log(rtcConfig);
    console.log("initializing webrtc connection");
    var conn = new RTCPeerConnection(rtcConfig);
    conn.onicecandidate = handleIceCandidate; // 1
    var dataChannel = conn.createDataChannel({ordered: false, maxRetransmitTime: 3000});
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
      candidate = e.candidate;
    } else {
      return;
    }
  }
  
  var onError = function(error) {
    window.alert(error.message);
  };

  var getCandidate = function() {
    return candidate;
  };
  
  return {
    init: init,
    getCandidate: getCandidate
  };
})();

window.onload = App.init;
