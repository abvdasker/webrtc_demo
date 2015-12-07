require "sinatra"
require "sinatra-websocket"
require "json"
require "pry"

require "./action_handler"

set :server, 'thin'
set :base, File.dirname(__FILE__)
set :public_folder, settings.base + "/static"
set :users, {}
set :sockets, {}

handler = ActionHandler.new(settings)

get "/" do
  File.new(settings.public_folder + "/index.html")
end

get "/socket" do
  request.websocket do |ws|
    #ws.onopen do
    #end
    ws.onmessage do |raw|
      message = JSON.parse(raw)
      handler.handle(ws, message)
    end
    ws.onclose do
      handler.handle_close(ws)
    end
  end
end
