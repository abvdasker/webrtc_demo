require "sinatra"
require "sinatra-websocket"
require "json"
require "pry"

set :server, 'thin'
set :base, File.dirname(__FILE__)
set :public_folder, settings.base + "/static"
set :users, {}
set :sockets, {}

class User
  attr_reader :username
  attr_accessor :socket

  def initialize(username)
    @username = username
  end

  def to_json(options = {})
    {
      username: username
    }.to_json
  end
end

def broadcast_users
  users = settings.users.values
  users.each do |user|
    user.socket.send((users - [user]).to_json)
  end
end

get "/" do
  File.new(settings.public_folder + "/index.html")
end

post "/users" do
  content_type :json
  user_json = JSON.parse(request.body.read)
  user = User.new(user_json["username"])
  return nil if settings.users[user.username]

  settings.users[user.username] = user
  user.to_json
end

get "/users" do
  request.websocket do |ws|
    ws.onmessage do |msg|
      user_json = JSON.parse(msg)
      current_user = settings.users[user_json["username"]]
      current_user.socket = ws
      settings.sockets[ws] = current_user
      EM.next_tick { broadcast_users }
    end
    ws.onclose do
      current_user = settings.sockets[ws]
      settings.sockets.delete(ws)
      settings.users.delete(current_user.username)
      EM.next_tick { broadcast_users }
    end
  end
end
