require "./user"

class ActionHandler
  def initialize(settings)
    @settings = settings
  end

  def handle(ws, message)
    case message["action"]
    when "createUser"
      create_user(ws, message)
    when "sendOffer"
      receive_offer(ws, message)
    when "sendAnswer"
      receive_answer(ws, message)
    when "sendIceCandidate"
      receive_ice_candidate(ws, message)
    else
      raise "could not perform action #{message['action']}"
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

  def receive_offer(ws, message)
    to_user = settings.users[message["to"]]
    send_offer(to_user, message)
  end

  def send_offer(user, message)
    message.delete("action")
    send_data(user.socket, "receiveOffer", message)
  end

  def receive_answer(ws, message)
    to_user = settings.users[message["to"]]
    send_answer(to_user, message)
  end

  def send_answer(user, message)
    message.delete("action")
    send_data(user.socket, "receiveAnswer", message)
  end

  def receive_ice_candidate(ws, message)
    to_user = settings.users[message["to"]]
    send_ice_candidate(to_user, message)
  end

  def send_ice_candidate(user, message)
    message.delete("action")
    send_data(user.socket, "receiveIceCandidate", message);
  end
  
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
