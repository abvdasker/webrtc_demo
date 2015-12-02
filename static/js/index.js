var User = function(username) {
  this.username = username;
}

var PeerChat = (function() {
  var me;
  var init = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
    $("#chat-toggle").on("click", toggleChat);
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

  return {
    init: init
  }
})();

window.onload = PeerChat.init;
