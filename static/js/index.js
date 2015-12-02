var PeerChat = (function() {
  var me;
  var init = function() {
    var $userNameButton = $("#set-user-name");
    $userNameButton.on("click", createUserClick);
  }

  var createUserClick = function(e) {
    var newUsername = $("#user-name").val();
    $.post("/users", { username: newUsername }, createUserSuccess, "json");
  }

  var createUserSuccess = function(data) {
    $("#set-user-name").disable();
    $("user-name").disable();
    me = new User(data["username"]);
  }

  return {
    init: init
  }
})();

window.onload = PeerChat.init;
