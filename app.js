require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const path = require("path");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const crypto = require("crypto");

const { stringify } = require("querystring");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

app.use(
  session({
    secret: "Full stack project.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

const mongoURI = "mongodb://localhost:27017/egDB";

// connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// init gfs
let gfs;
conn.once("open", () => {
  // init stream
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads",
  });
});

// Storage
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        //const filename = buf.toString("hex") + path.extname(file.originalname);
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({
  storage,
});

//++++++++++++++++++++++++++++++++++++++ GET REQUESTS ++++++++++++++++++++++++++++++++++++++++++++++++++

//--------------------------------------HOME ROUTE: HOME PAGE GET REQUEST-------------------------------------
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

//--------------------------------------LOGIN ROUTE: LOGIN PAGE GET REQUEST-------------------------------------
app.get("/login", function (req, res) {
  res.render("login");
});

//--------------------------------------SIGNUP ROUTE: REGISTER PAGE GET REQUEST-------------------------------------
app.get("/register", function (req, res) {
  res.render("register");
});

//--------------------------------------USER ROUTE: FIRST PAGE AFTER LOGIN: GET REQUEST-------------------------------------
app.get("/user", function (req, res) {
  if (req.isAuthenticated()) {
    FilesNew.find(
      {
        // userId: req.user._id,
      },
      function (err, fileStats) {
        var temp = fileStats;
        temp.sort(function (a, b) {
          return a.downloadCount - b.downloadCount;
        });
        temp.reverse();
        console.log("USER TEMP FILES: " + temp);
        res.render("user", { filesSort: temp });
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/image/:filename", (req, res) => {
  // console.log('id', req.params.id)
  console.log(req.params);
  var dcount = 0;
  FilesNew.findOne(
    {
      fileName: req.params.filename,
    },
    function (err, file) {
      console.log("dc : NAME :: " + file.filename);
      dcount = file.downloadCount;
      dcount += 1;
      FilesNew.findOneAndUpdate(
        {
          fileName: req.params.filename,
        },
        {
          downloadCount: dcount,
        },
        function (err, results) {}
      );
    }
  );
  //---------------------------------------------------------------------------------------
  const file = gfs
    .find({
      filename: req.params.filename,
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist",
        });
      }
      gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    });
});

// app.get("/:coursename", (req, res) => {
//   if (req.isAuthenticated()) {
//     if (!gfs) {
//       console.log("some error occured, check connection to db");
//       res.send("some error occured, check connection to db");
//       process.exit(0);
//     }
//     gfs.find().toArray((err, files) => {
//       // check if files
//       if (!files || files.length === 0) {
//         return res.render("course1", {
//           files: false,
//           coursename: req.params.coursename,
//         });
//       } else {
//         const f = files
//           .map((file) => {
//             if (
//               file.contentType === "image/png" ||
//               file.contentType === "image/jpeg"
//             ) {
//               file.isImage = true;
//             } else {
//               file.isImage = false;
//             }
//             return file;
//           })
//           .sort((a, b) => {
//             return (
//               new Date(b["uploadDate"]).getTime() -
//               new Date(a["uploadDate"]).getTime()
//             );
//           });

//         return res.render("course1", {
//           files: f,
//           coursename: req.params.coursename,
//         });
//       }
//     });
//   } else {
//     res.redirect("/login");
//   }
// });

app.get("/course1", (req, res) => {
  if (req.isAuthenticated()) {
    FilesNew.find(
      {
        // userId: req.user._id,
      },
      function (err, fileStats) {
        var temp = fileStats;
        console.log("temp: " + temp);
        var dtemp = [];
        var ctemp = [];
        gfs.find().toArray((err, files) => {
          if (!files || files.length === 0) {
            res.render("course1", {
              files: false,
              coursename: "Course1",
            });
          } else {
            files.map((file) => {
              if (
                file.contentType === "image/jpeg" ||
                file.contentType === "image/png"
              ) {
                file.isImage = true;
              } else {
                file.isImage = false;
              }
            });
            temp.reverse();
            for (let i = 0; i < temp.length; i++) {
              console.log("temp[i]:" + temp[i]);
              if (temp[i].course == "course1") {
                console.log("temp[i].course:" + temp[i].course);
                ctemp.push(temp[i]);
                console.log("ctemp:" + ctemp);
              }
            }
            for (let i = 0; i < ctemp.length; i++) {
              for (let j = 0; j < files.length; j++) {
                console.log(
                  "files[j]._id:" +
                    files[j]._id +
                    " and " +
                    "ctemp[i].fileId: " +
                    ctemp[i].fileId
                );
                if (ctemp[i].fileId == files[j]._id) {
                  dtemp.push(files[j]);
                  console.log("dtemp: " + dtemp);
                }
              }
            }
            temp.reverse();

            ctemp.sort(function (a, b) {
              return (
                new Date(b["uploadDate"]).getTime() -
                new Date(a["uploadDate"]).getTime()
              );
            });
            ctemp.reverse();
            res.render("course1", {
              files: dtemp,
              coursename: "Course1",
              fileinfo: ctemp,
            });
          }
        });
      }
    );
  } else {
    res.redirect("login");
  }
});

app.get("/course3", (req, res) => {
  if (req.isAuthenticated()) {
    FilesNew.find(
      {
        // userId: req.user._id,
      },
      function (err, fileStats) {
        var temp = fileStats;
        console.log("temp: " + temp);
        var dtemp = [];
        var ctemp = [];
        gfs.find().toArray((err, files) => {
          if (!files || files.length === 0) {
            res.render("user", {
              files: false,
            });
          } else {
            files.map((file) => {
              if (
                file.contentType === "image/jpeg" ||
                file.contentType === "image/png"
              ) {
                file.isImage = true;
              } else {
                file.isImage = false;
              }
            });
            temp.reverse();
            for (let i = 0; i < temp.length; i++) {
              console.log("temp[i]:" + temp[i]);
              if (temp[i].course == "course3") {
                console.log("temp[i].course:" + temp[i].course);
                ctemp.push(temp[i]);
                console.log("ctemp:" + ctemp);
              }
            }
            for (let i = 0; i < ctemp.length; i++) {
              for (let j = 0; j < files.length; j++) {
                console.log(
                  "files[j]._id:" +
                    files[j]._id +
                    " and " +
                    "ctemp[i].fileId: " +
                    ctemp[i].fileId
                );
                if (ctemp[i].fileId == files[j]._id) {
                  dtemp.push(files[j]);
                  console.log("dtemp: " + dtemp);
                }
              }
            }
            temp.reverse();

            ctemp.sort(function (a, b) {
              return (
                new Date(b["uploadDate"]).getTime() -
                new Date(a["uploadDate"]).getTime()
              );
            });
            ctemp.reverse();
            res.render("course3", {
              files: dtemp,
              coursename: "Course3",
              fileinfo: ctemp,
            });
          }
        });
      }
    );
  } else {
    res.redirect("login");
  }
});

app.get("/course2", (req, res) => {
  if (req.isAuthenticated()) {
    FilesNew.find(
      {
        //userId: req.user._id,
      },
      function (err, fileStats) {
        var temp = fileStats;
        console.log("temp: " + temp);
        var dtemp = [];
        var ctemp = [];
        gfs.find().toArray((err, files) => {
          if (!files || files.length === 0) {
            res.render("user", {
              files: false,
            });
          } else {
            files.map((file) => {
              if (
                file.contentType === "image/jpeg" ||
                file.contentType === "image/png"
              ) {
                file.isImage = true;
              } else {
                file.isImage = false;
              }
            });
            temp.reverse();
            for (let i = 0; i < temp.length; i++) {
              console.log("temp[i]:" + temp[i]);
              if (temp[i].course == "course2") {
                console.log("temp[i].course:" + temp[i].course);
                ctemp.push(temp[i]);
                console.log("ctemp:" + ctemp);
              }
            }
            for (let i = 0; i < ctemp.length; i++) {
              for (let j = 0; j < files.length; j++) {
                console.log(
                  "files[j]._id:" +
                    files[j]._id +
                    " and " +
                    "ctemp[i].fileId: " +
                    ctemp[i].fileId
                );
                if (ctemp[i].fileId == files[j]._id) {
                  dtemp.push(files[j]);
                  console.log("dtemp: " + dtemp);
                }
              }
            }
            temp.reverse();

            ctemp.sort(function (a, b) {
              return (
                new Date(b["uploadDate"]).getTime() -
                new Date(a["uploadDate"]).getTime()
              );
            });
            ctemp.reverse();
            res.render("course2", {
              files: dtemp,
              coursename: "Course2",
              fileinfo: ctemp,
            });
          }
        });
      }
    );
  } else {
    res.redirect("login");
  }
});

app.get("/course4", (req, res) => {
  if (req.isAuthenticated()) {
    FilesNew.find(
      {
        // userId: req.user._id,
      },
      function (err, fileStats) {
        var temp = fileStats;
        console.log("temp: " + temp);
        var dtemp = [];
        var ctemp = [];
        gfs.find().toArray((err, files) => {
          if (!files || files.length === 0) {
            res.render("user", {
              files: false,
            });
          } else {
            files.map((file) => {
              if (
                file.contentType === "image/jpeg" ||
                file.contentType === "image/png"
              ) {
                file.isImage = true;
              } else {
                file.isImage = false;
              }
            });
            temp.reverse();
            for (let i = 0; i < temp.length; i++) {
              console.log("temp[i]:" + temp[i]);
              if (temp[i].course == "course4") {
                console.log("temp[i].course:" + temp[i].course);
                ctemp.push(temp[i]);
                console.log("ctemp:" + ctemp);
              }
            }
            for (let i = 0; i < ctemp.length; i++) {
              for (let j = 0; j < files.length; j++) {
                console.log(
                  "files[j]._id:" +
                    files[j]._id +
                    " and " +
                    "ctemp[i].fileId: " +
                    ctemp[i].fileId
                );
                if (ctemp[i].fileId == files[j]._id) {
                  dtemp.push(files[j]);
                  console.log("dtemp: " + dtemp);
                }
              }
            }
            temp.reverse();

            ctemp.sort(function (a, b) {
              return (
                new Date(b["uploadDate"]).getTime() -
                new Date(a["uploadDate"]).getTime()
              );
            });
            ctemp.reverse();
            res.render("course4", {
              files: dtemp,
              coursename: "Course4",
              fileinfo: ctemp,
            });
          }
        });
      }
    );
  } else {
    res.redirect("login");
  }
});
//============================================================================================================

app.post("/files/del/:id", (req, res) => {
  FilesNew.deleteOne({ fileId: req.params.id }, function (err) {
    if (err) return handleError(err);
    // deleted at most one tank document
  });
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) return res.status(404).json({ err: err.message });
    res.redirect("/course1");
  });
});

app.post("/files2/del/:id", (req, res) => {
  FilesNew.deleteOne({ fileId: req.params.id }, function (err) {
    if (err) return handleError(err);
    // deleted at most one tank document
  });
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) return res.status(404).json({ err: err.message });
    res.redirect("/course2");
  });
});

app.post("/files3/del/:id", (req, res) => {
  FilesNew.deleteOne({ fileId: req.params.id }, function (err) {
    if (err) return handleError(err);
    // deleted at most one tank document
  });
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) return res.status(404).json({ err: err.message });
    res.redirect("/course3");
  });
});

app.post("/files4/del/:id", (req, res) => {
  FilesNew.deleteOne({ fileId: req.params.id }, function (err) {
    if (err) return handleError(err);
    // deleted at most one tank document
  });
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) return res.status(404).json({ err: err.message });
    res.redirect("/course4");
  });
});
app.post("/upload1", upload.single("file"), (req, res) => {
  FilesNew.find(function (err, fileStat) {
    var temp = fileStat;
    gfs.find().toArray((err, files) => {
      var found = false;
      for (let i = 0; i < files.length; i++) {
        found = false;
        for (let j = 0; j < temp.length; j++) {
          if (files[i].filename === temp[j].fileName) {
            found = true;
          }
        }
        if (found === false) {
          const d = new FilesNew({
            fileName: files[i].filename,
            fileId: files[i]._id,
            course: req.body.course,
            userId: req.user._id,
            downloadCount: 0,
          });
          console.log(d);
          d.save();
          temp.push(d);
        }
      }
      res.redirect("/course1");
    });
  });
});
app.post("/upload2", upload.single("file"), (req, res) => {
  FilesNew.find(function (err, fileStat) {
    var temp = fileStat;
    gfs.find().toArray((err, files) => {
      var found = false;
      for (let i = 0; i < files.length; i++) {
        found = false;
        for (let j = 0; j < temp.length; j++) {
          if (files[i].filename === temp[j].fileName) {
            found = true;
          }
        }
        if (found === false) {
          const d = new FilesNew({
            fileName: files[i].filename,
            fileId: files[i]._id,
            course: req.body.course,
            userId: req.user._id,
            downloadCount: 0,
          });
          console.log(d);
          d.save();
          temp.push(d);
        }
      }
      res.redirect("/course2");
    });
  });
});

app.post("/upload3", upload.single("file"), (req, res) => {
  FilesNew.find(function (err, fileStat) {
    var temp = fileStat;
    gfs.find().toArray((err, files) => {
      var found = false;
      for (let i = 0; i < files.length; i++) {
        found = false;
        for (let j = 0; j < temp.length; j++) {
          if (files[i].filename === temp[j].fileName) {
            found = true;
          }
        }
        if (found === false) {
          const d = new FilesNew({
            fileName: files[i].filename,
            fileId: files[i]._id,
            course: req.body.course,
            userId: req.user._id,
            downloadCount: 0,
          });
          console.log(d);
          d.save();
          temp.push(d);
        }
      }
      res.redirect("/course3");
    });
  });
});

app.post("/upload4", upload.single("file"), (req, res) => {
  FilesNew.find(function (err, fileStat) {
    var temp = fileStat;
    gfs.find().toArray((err, files) => {
      var found = false;
      for (let i = 0; i < files.length; i++) {
        found = false;
        for (let j = 0; j < temp.length; j++) {
          if (files[i].filename === temp[j].fileName) {
            found = true;
          }
        }
        if (found === false) {
          const d = new FilesNew({
            fileName: files[i].filename,
            fileId: files[i]._id,
            course: req.body.course,
            userId: req.user._id,
            downloadCount: 0,
          });
          console.log(d);
          d.save();
          temp.push(d);
        }
      }
      res.redirect("/course4");
    });
  });
});

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
mongoose.connect("mongodb://localhost:27017/egDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);
//defining userSchema-----------------------------------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});
//userSchema plugins-------------------------------------------------------------------------------------------------
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//defining fileSchema--------------------------------------------------------------------------------------------------
const fileSchema = new mongoose.Schema({
  fileName: String,
  userId: String,
  fileId: String,
  downloadCount: Number,
  course: String,
});

const FilesNew = new mongoose.model("File", fileSchema);

passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/user");
      });
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/user");
      });
    }
  });
});

//------------------------------------------SERVER RUNNING ON PORT 3000----------------------------------------
app.listen(3000, function () {
  console.log("Server is up and Running!!!");
});
