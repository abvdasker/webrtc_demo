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
  };
  
  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    console.log("click");
    candidate = new User(newUsername);
    ServerConnection.createNewUser(newUsername);
  }

  var toggleChat = function() {
    var selectedUsername = $("#user-list").val()[0];
    console.log("selected to chat with " + selectedUsername);
    PeerChat.connectTo(selectedUsername);
    //ServerConnection.sendOffer(me.username, selectedUsername);
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

  var onError = function(error) {
    window.alert(error.message);
  };

  return {
    init: init,
    updateUsers: updateUsers,
    getMe: getMe,
    onError: onError
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
  var rtcConfig = {
    iceServers: [
      {urls: "stun:stun.l.google.com"}
    ]
  };
  var connection = {
    optional: [
      {'DtlsSrtpKeyAgreement': true},
      {'RtpDataChannels': true }
    ]
  };
  var constraints = {
    'mandatory':{
      'offerToReceiveAudio': false,
      'offerToReceiveVideo': false
    }
  }

  var Peer = function(username) {
    this.username = username;
    var conn = new RTCPeerConnection(rtcConfig, connection);
    conn.onicecandidate = handleIceCandidate;
    var dataChannel = conn.createDataChannel("test", {ordered: false, maxRetransmitTime: 3000});
    dataChannel.onopen = function(e) { console.log("opened channel!"); };
    conn.ondatachannel = handleDataChannel;
    this.connect = function() {
      conn.createOffer(onOfferCreated, App.onError, constraints);
    };
    this.connectFrom = function(offer) {
      console.log("offer received");
      console.log(offer);
      var remoteDescription = new RTCSessionDescription(offer);
      conn.setRemoteDescription(remoteDescription, function() {
        console.log("remote description set");
        conn.createAnswer(onAnswerCreated, App.onError, constraints);
      }, App.onError);
    }
    var onOfferCreated = function(offer) {
      console.log("offer created");
      console.log(offer);
      conn.setLocalDescription(offer, function() {
        console.log("local description created");
        ServerConnection.sendOffer(App.getMe().username, username, offer);
      }, App.onError);
    };
    var onAnswerCreated = function(answer) {
      console.log("answer created");
      console.log(answer);
      conn.setLocalDescription(answer, function() {
        console.log("local description set");
        ServerConnection.sendAnswer(App.getMe().username, username, answer);
      }, App.onError);
    }
    var handleIceCandidate = function(event) { // TODO: Figure out why this isn't being fired!
      console.log("handling ice candidate");
      console.log(event);
      if (event.candidate) {
        ServerConnection.sendIceCandidate(App.getMe().username, username, event.candidate);
      } else {
        return;
      }
    };
    var handleDataChannel = function(event) {
      alert("data channel created");
    };
    this.onIceCandidateReceived = function(candidateData) {
      var candidate = candidateData.candidate;
      var sdpMLineIndex = candidateData.sdpMLineIndex;
      console.log(sdpMLineIndex);
      var iceCandidate = new RTCIceCandidate({
        sdpMLineIndex: sdpMLineIndex,
        candidate: candidate
      });
      conn.addIceCandidate(iceCandidate);
    };
    this.onAnswerReceived = function(answer) {
      console.log("answer received " + answer);
      var remoteDescription = new RTCSessionDescription(answer);
      conn.setRemoteDescription(remoteDescription, function() {
        console.log("remote description set");
      }, App.onError);
    }
  }

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
    currentPeer = new Peer(username);
    currentPeer.connect();
  };

  var offerReceived = function(fromUsername, offer) {
    if (currentPeer != null)
      return;

    var peer = new Peer(fromUsername);
    peer.connectFrom(offer);
  };

  var answerReceived = function(fromUsername, answer) {
    if (fromUsername == currentPeer.username)
      currentPeer.onAnswerReceived(answer);
  };

  var iceCandidateReceived = function(fromUsername, candidate) {
    if (fromUsername == currentPeer.username)
      currentPeer.onIceCandidateReceived(candidate);
  }
  
  return {
    init: init,
    connectTo: connectTo,
    offerReceived: offerReceived,
    answerReceived: answerReceived,
    iceCandidateReceived: iceCandidateReceived
  };
})();

window.onload = App.init;
