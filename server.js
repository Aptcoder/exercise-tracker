const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const _ = require('lodash')
var multer = require('multer');
var upload = multer();
const cors = require("cors");
const shortid = require('shortid')
var mongoose = require("mongoose");
var { ObjectID } = require("mongodb");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useUnifiedTopology: true,useNewUrlParser: true 
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.Promise = global.Promise;

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

var exerciseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  date: {
    type: Date,
    default: new Date()
  }
});

var userSchema = mongoose.Schema({
  _id : {
    type : String,
    unique : true,
    default : shortid.generate
  },
  username: {
    type: String,
    required: true
  }
});

//model defined
var User = mongoose.model("User", userSchema);
var Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/exercise/new-user",upload.none(), (req, res) => {
  console.log(req.body);
  var newUser = new User({
    username : req.body.username
  })
  newUser.save().then((user) => {
    res.send({
      "username" : user.username,
      "_id" : user._id
    })
  }).catch((err) => {
    res.status(401).send({
      "Error" : err
    })
  })
});

app.get("/api/exercise/users", (req,res) => {
  User.find({})
    .then(users => {
      // console.log(JSON.stringify(users))
      res.send(users);
    })
    .catch((err) => console.log("A error occurred!" + err));
});

//add exercise 
app.post('/api/exercise/add',upload.none(),(req,res) => {
  let newExercise = new Exercise({
    userId : req.body.userId,
    description : req.body.description,
    duration : req.body.duration,
    date : req.body.date || new Date()
  })
  
  newExercise.save().then((exe) => {
      User.findById(exe.userId).then((user) => {
        console.log(user)
        res.send({
          "username" : user.username,
          "description": exe.description,
          "duration" : exe.duration ,
          "_id" : user._id,
          "date" : exe.date.toDateString()
        })
      }).catch((err) => console.log(err))
    }).catch((err) => {
      console.log(err)
      res.send({
        "error" : err
      })
    })
  // })
  // new formidable.IncomingForm().parse(req,(err,fields,forms) => {
  //   if(err) throw err
  //   console.log(fields.userId)
  //   let exercise = new Exercise({
  //     userId : fields.userId,
  //     description : fields.description,
  //     duration : fields.duration,
  //     date : fields.date || new Date()
  //   }) 
  //   exercise.save().then((exe) => {
  //     User.findById(exe.userId).then((user) => {
  //       console.log(user)
  //       res.send({
  //         "username" : user.username,
  //         "description": exe.description,
  //         "duration" : exe.duration ,
  //         "_id" : user._id,
  //         "date" : exe.date.toDateString()
  //       })
  //     }).catch((err) => console.log(err))
  //   }).catch((err) => {
  //     console.log(err)
  //     res.send({
  //       "error" : err
  //     })
  //   })
  // })
})

//get logs
app.get('/api/exercise/log',(req,res) => {
  console.log(req.query)
  User.findById(req.query.userId).then((user) => {
    if(req.query.from && req.query.to){
      Exercise.find({$and : [{userId : user._id},{date :{$gte : new Date(req.query.from)}},{date :{$lte : new Date(req.query.to)}}]})
      .limit(Number(req.query.limit) || 100)
      .then((exercises) => {
      console.log(exercises)
      var newExecs = exercises.map((exe) => {
        var execs = _.pick(exe,['description','duration','date'])
        execs.date = execs.date.toDateString();
        return execs
      })
      res.status(200).send({
        "_id" : user._id,
        "username" : user.username,
        "count" : exercises.length,
        "log" : newExecs
      })
    }).catch((err) => console.log(err))
    }
    else{
      Exercise.find({userId : user._id}).limit(Number(req.query.limit) || 100).then((exercises) => {
      console.log(exercises)
      var newExecs = exercises.map((exe) => {
        var execs = _.pick(exe,['description','duration','date'])
        execs.date = execs.date.toDateString();
        return execs
      })
      res.status(200).send({
        "_id" : user._id,
        "username" : user.username,
        "count" : exercises.length,
        "log" : newExecs
      })
    }).catch((err) => console.log(err))
    }
  }).catch((err) => {
    console.log(err)
  })
})





// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});
// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

