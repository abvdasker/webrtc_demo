require "sinatra"
require "json"

set :base, File.dirname(__FILE__)
set :public_folder, settings.base + "/static"

get "/" do
  File.new(settings.public_folder + "/index.html")
end

post "/users" do

end
