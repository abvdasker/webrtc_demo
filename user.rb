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
