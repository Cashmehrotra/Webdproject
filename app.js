var express=require("express");
var mongoose=require("mongoose");
var methodOverride=require("method-override");
var bodyParser=require("body-parser");
var flash=require("connect-flash");
var app=express();
mongoose.connect("mongodb://localhost/Blog_app",{useNewUrlParser:true});
app.use(flash());
//======================================
var passport=require("passport");
var LocalStrategy=require("passport-local");
var passportLocalMongoose=require("passport-local-mongoose");
// ========================================
// AUTHENTICATION PROCESS
var userSchema=new mongoose.Schema({
    username:String,
    password:String
});
userSchema.plugin(passportLocalMongoose);
var User=mongoose.model("User",userSchema);
app.use(require("express-session")({
    secret:"Blog_app",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// ========================================
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));

var commentSchema=new mongoose.Schema({
    text:String,
    author: String,
    created:{type:Date,  default:Date.now}
});
var comment=mongoose.model("comment",commentSchema);
var blogSchema=new mongoose.Schema({
    title:String,
    person:String,
    blogType:String,
    image: {type:String, default:""},
    body: String,
    created: {type:Date,default:Date.now},
    comments: [
        {
        type:mongoose.Schema.Types.ObjectId,
        ref:"comment"
        }
    ]
});
var blog=mongoose.model("blog",blogSchema);

//==============================================
app.use(function(req,res,next){
    res.locals.currentUser=req.user;
    res.locals.error=req.flash("error");
    res.locals.success=req.flash("success");
    next();
});
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
    req.flash("error","You must be Logged In first");
    res.redirect('/blogs/register');
    }
};

//==============================================

app.get("/",function(req,res){
    res.render("home.ejs");
});
app.get("/blogs",function(req,res){
    blog.find({},function(err,blogs){
        if(err){
            console.log(err);
        }else{
            res.render("index.ejs",{blog:blogs});
        }
    });
    
});
//=====================================================
//AUTHENTICATION ROUTES

app.get("/blogs/register",function(req,res){
    res.render("register.ejs");
});
app.post("/blogs/register",function(req,res){
    var newUser=new User({username:req.body.username});
    User.register(newUser,req.body.password,function(err,user){
        if(err){
            console.log(err);
            req.flash("error",err.message);
            return res.render("register.ejs");
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success","Successfully Signed In!!!");
            res.redirect("/blogs");
        });
    });
});
app.post("/blogs/register/login",passport.authenticate("local",{
    successRedirect:"/blogs",
    failureRedirect:"/blogs/register"
    }),function(req,res){}
);
app.get("/blogs/register/logout",function(req,res){
    req.logout();
    req.flash("success","Successfully Logged Out!!!")
    res.redirect("/");
});

//======================================================

app.get("/blogs/new",isLoggedIn,function(req,res){
    res.render("new.ejs");
});
app.get("/blogs/:type",function(req,res){
    blog.find({blogType:req.params.type},function(err,blogs){
        if(err){
            console.log(err);
        }else{
            res.render("index.ejs",{blog:blogs});
        }
    });
    
});
app.get("/blogs/:type/:id",isLoggedIn,function(req,res){
    blog.findById(req.params.id).populate("comments").exec(function(err,foundBlog){
        if(err){
            console.log(err);
        }else{
            res.render('show.ejs',{blog:foundBlog});
        }
    });
});
app.post("/blogs/newblog",function(req,res){
    var nBlog={
        title:req.body.title,
        person:req.user.username,
        image:req.body.image,
        blogType:req.body.blogType,
        body:req.body.body
    };
    blog.create(nBlog,function(err,newBlog){
       if(err){
           console.log(err);
       }else{
           req.flash("success","Thanks for contributing " + req.user.username);
           res.redirect("/blogs/"+req.body.blogType);
       }
    });
});
app.get("/blogs/:type/:id/edit",function(req,res){
    blog.findById(req.params.id,function(err,eBlog){
        if(err){
            console.log.og(err);
        }else{
            res.render("edit.ejs",{blog:eBlog});
        }
    });
});
app.put("/blogs/:type/:id",function(req,res){
    var editBlog={
        title:req.body.title,
        image:req.body.image,
        blogType:req.body.blogType,
        body:req.body.body
    };
    blog.findByIdAndUpdate(req.params.id,editBlog,function(err,fblog){
        if(err){
            console.log(err);
        }else{
            res.redirect("/blogs/"+req.params.type+"/"+req.params.id);
        }
    });
});
//==================================================
//DELETE BLOG
app.delete("/blogs/:type/:id",function(req,res){
    blog.findByIdAndRemove(req.params.id,function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Successfully Deleted!!!")
            res.redirect("/blogs/"+req.params.type);
        }
    });
});
//DELETE BLOG COMMENT
app.delete("/blogs/:type/:id/del/:comment_id",function(req,res){
    comment.findByIdAndRemove(req.params.comment_id,function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Successfully Deleted your comment");
            res.redirect("/blogs/"+req.params.type+"/"+ req.params.id);
        }

    });
});
//=======================================================
  

//ADD NEW COMMENT
app.post("/blogs/:type/:id/comments/new",isLoggedIn,function(req,res){
    blog.findById(req.params.id,function(err,Blog){
        if(err){
            console.log(err);
        }else{
            var com={
                text:req.body.text,
                author:req.user.username
            };
            comment.create(com,function(err,Comment){
                if(err){
                    console.log(err);
                }else{
                    Blog.comments.push(Comment);
                    Blog.save();
                    res.redirect("/blogs/"+req.params.type+"/"+req.params.id);
                }
            });
        }
    });
});




app.get('*',function(req,res){
    res.redirect("/");
});
app.listen(process.env.PORT||3000,process.env.URL,function(req,res){
    console.log("Server Started!!!");
});