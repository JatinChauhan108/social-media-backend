const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const upload = require('./config/multerconfig');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.render("index");
});

app.get('/login', (req, res) => {
    res.render("login");
})

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render('profile', {user});    
})

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate('user');

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect('/profile');

})

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id});    
    
    // post.user is object type and user.userid is string type, so type matching won't work
    if(post.user == req.user.userid){
        res.render('edit', {post});
    }
    else{
        res.status(401).send("Unauthorized access");
    }
})

app.get('/profile/upload', (req, res) => {
    res.render("profileupload");
})

app.post('/register', async (req, res) => {
    let {email, name, username, age, password} = req.body;

    let user = await userModel.findOne({email});
    
    if(user) return res.status(500).send("User already registered");
    
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash)=>{
            user = await userModel.create({
                username, 
                email,
                age,
                name,
                password: hash
            })

            let token = jwt.sign({email, userid: user._id}, "shhhh");
            res.cookie("token", token);
            res.send("user registered");
        });

    })
})

app.post('/login', async (req, res) => {
    let {email, password} = req.body;
    
    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(password, user.password, (err, result) => {
        if(result){
            let token = jwt.sign({email, userid: user._id}, "shhhh");
            res.cookie("token", token);
            res.status(200).redirect('/profile');
        } 
        else res.redirect("/login");
    })
})

app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    let post = await postModel.create({
        user: user._id,
        content: req.body.content,
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.post('/update/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
    res.redirect('/profile');
})

app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("profile");
})

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})


// middleware for protecting routes
function isLoggedIn(req, res, next) {
    let token = req.cookies.token;
    if(token === "") res.redirect('/login');
    else{
        let data = jwt.verify(token, "shhhh");
        req.user = data;
        next();
    }
}

app.listen(3000);