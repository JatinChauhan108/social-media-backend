const mongoose = require('mongoose');
const { loadEnvFile } = require('node:process');

if (process.env.NODE_ENV !== "production") {
  loadEnvFile();
}

mongoose.connect(process.env.MONGO_URL);

const userSchema = mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,
    profilepic: {
        type: String,
        default: "placeholder-profile-pic.jpg"
    },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post"}]
})

module.exports = mongoose.model('user', userSchema);