require "./user"

class ActionHandler
  def initialize(settings)
    @settings = settings
  end

  def handle(ws, message)
    if message["action"] == "createUser"
      create_user(ws, message)
    end
  end

  def handle_close(ws)
    user = settings.sockets[ws]
    settings.sockets.delete(ws)
    settings.users.delete(user.username)
    broadcast_users
  end

  private

  attr_reader :settings

  def create_user(ws, message)
    user = User.new(message["username"])
    return nil if settings.users[user.username]
    settings.users[user.username] = user
    user.socket = ws
    settings.sockets[ws] = user
    broadcast_users
  end

  def broadcast_users
    users = settings.users.values
    users.each do |user|
      action = "updateUsers"
      send_data(user.socket, "updateUsers", users: (users - [user]))
    end
  end

  def send_data(ws, action, payload)
    message = {
      action: action,
    }.merge(payload)

    EM.next_tick { ws.send(message.to_json) }
  end
end
