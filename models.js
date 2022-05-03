const mongoose = require('mongoose');

const PollsSchema = new mongoose.Schema({
  author: String,
  question: String,
  options: Object,
  by: String
});
const Polls = mongoose.model('Polls', PollsSchema);

const UsersSchema = new mongoose.Schema({
  username: String,
  password: String,
  polls: [PollsSchema]
});
const Users = mongoose.model('Users', UsersSchema);

exports.Users = Users;
exports.Polls = Polls;