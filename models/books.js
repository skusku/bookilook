var mongoose = require("mongoose");

var Book = mongoose.Schema({
  id: String,
  title: String,
  subtitle: String,
  authors: Array,
  description: String,
  thumbnail: String
})

module.exports = { Book: mongoose.model("Book", Book), Trade: mongoose.model("Trade", Book)}
