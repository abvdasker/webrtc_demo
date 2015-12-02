var User = function(username) {
  this.username = username;
}

var PeerChat = (function() {
  var init = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
  }

  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    $.post("/users", JSON.stringify({ username: newUsername }), createUserSuccess, "json");
  }

  var createUserSuccess = function(data) {
    var me = new User(data["username"]);
    $("#set-user-name").remove();
    $("#user-name").remove();
    $("#set-user-name-label").remove();
    $("body").prepend("<h2>Welcome " + me.username + "</h2>");
    $("#main-app").removeClass("hidden");
    startWebSocket(me);
  }

  var startWebSocket = function(me) {
    var socket = new WebSocket("ws://127.0.0.1:4567/users");
    socket.onopen = function() {
      console.log("connection open");
      socket.send(JSON.stringify(me));
      console.log("getting users...");
    }
    socket.onmessage = function(msg) {
      userList = JSON.parse(msg.data);
      updateUsers(userList);
      console.log(userList);
    }
  }

  var updateUsers = function(userList) {
    var $userList = $("#user-list");
    $userList.empty();
    for (var i in userList) {
      var user = userList[i];
      $userList.append("<div>" + user.username + "</div>");
    }
  }

  return {
    init: init
  }
})();

window.onload = PeerChat.init;
