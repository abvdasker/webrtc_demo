var User = function(username) {
  this.username = username;
}
var RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

var App = (function() {

  var users = [];
  var me;
  var candidate;

  var init = function() {
    console.log("starting app");
    ServerConnection.init();
    setListeners();
  };

  var setListeners = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
    console.log("setting listeners");
    $("#chat-toggle").on("click", toggleChat);
    $("#send-message").on("click", sendMessage);
  };
  
  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    console.log("click");
    candidate = new User(newUsername);
    ServerConnection.createNewUser(newUsername);
  }

  var toggleChat = function(event) {
    var currentPeer = PeerChat.getCurrentPeer();
    if (currentPeer == null) {
      connectChat(currentPeer);
    } else {
      disconnectChat();
    }
  }

  var disconnectChat = function() {
    var currentPeer = PeerChat.getCurrentPeer();
    currentPeer.disconnect();
    endChat();
  }

  var connectChat = function(currentPeer) {
    var selectedUsername = $("#user-list").val()[0];
    if (currentPeer && selectedUsername == currentPeer.username)
      return;
    console.log("selected to chat with " + selectedUsername);
    PeerChat.connectTo(selectedUsername);
  };

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
  };

  var onError = function(error) {
    console.error(error);
  };

  var startChat = function() {
    var currentPeer = PeerChat.getCurrentPeer();
    updateCurrentPeerName(currentPeer.username);
    $("#chat-toggle").html("End chat");
    $("#send-message").prop("disabled", false);
  };

  var endChat = function() {
    PeerChat.clearCurrentPeer();
    updateCurrentPeerName("");
    $("#chat-window").text("");
    $("#chat-toggle").html("Chat!");
    $("#send-message").prop("disabled", true);
  };

  var receiveMessage = function(name, data) {
    var peername = PeerChat.getCurrentPeer().username;
    $("#chat-window").append(name + ": " + data + "\n");
  };

  var sendMessage = function() {
    var $entryBox = $("#entry-box");
    var message = $entryBox.val();
    if (message.trim() == "")
      return;
    $entryBox.val("");
    receiveMessage("me", message);
    PeerChat.getCurrentPeer().send(message);
  }

  var updateCurrentPeerName = function(name) {
    $("#current-peer-name").text(name);
  };

  return {
    init: init,
    updateUsers: updateUsers,
    getMe: getMe,
    onError: onError,
    startChat: startChat,
    endChat: endChat,
    receiveMessage: receiveMessage
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
    } else if (action == "receiveOffer") {
      receiveOffer(messageJSON);
    } else if (action == "receiveAnswer") {
      receiveAnswer(messageJSON);
    } else if (action == "receiveIceCandidate") {
      receiveIceCandidate(messageJSON);
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

  var sendOffer = function(fromUser, toUser, offer) {
    console.log("sending offer to " + toUser);
    var message = {
      action: "sendOffer",
      from: fromUser,
      to: toUser,
      offer: offer
    }
    socket.send(JSON.stringify(message));
  }

  var sendAnswer = function(fromUser, toUser, answer) {
    console.log("sending answer to " + toUser);
    var message = {
      action: "sendAnswer",
      from: fromUser,
      to: toUser,
      answer: answer
    }
    socket.send(JSON.stringify(message));
  }

  var receiveOffer = function(message) {
    var fromUsername = message["from"];
    var offer = message["offer"];
    PeerChat.offerReceived(fromUsername, offer);
  }

  var receiveAnswer = function(message) {
    var fromUsername = message["from"];
    var answer = message["answer"];
    PeerChat.answerReceived(fromUsername, answer);
  }

  var sendIceCandidate = function(fromUser, toUser, candidate) {
    console.log("sending candidate to " + toUser);
    var message = {
      action: "sendIceCandidate",
      from: fromUser,
      to: toUser,
      candidate: candidate
    };
    socket.send(JSON.stringify(message));
  }

  var receiveIceCandidate = function(message) {
    var fromUsername = message["from"];
    var candidate = message["candidate"];
    PeerChat.iceCandidateReceived(fromUsername, candidate);
  }

  return {
    init: init,
    createNewUser: createNewUser,
    sendOffer: sendOffer,
    sendAnswer: sendAnswer,
    sendIceCandidate: sendIceCandidate
  };
})();

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

window.onload = App.init;
