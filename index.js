var express = require("express");
var app = express();
let bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
const RequestIp = require("@supercharge/request-ip");
let cred = { username: "admin", password: "00000000" };

let blockedIps = [];

let failedAttempts = {};

function checkIfUserIsValid(username, password) {
  if (username == cred.username && password == cred.password) return true;

  return false;
}

app.get("/logout", function (req, res) {
  res.cookie("user", "", { maxAge: 10800 }).render("login");
});

app.get("/", function (req, res) {
  if (req.cookie) {
    let cookieData = JSON.parse(req.cookie);

    if (checkIfUserIsValid(cookieData.username, cookieData.password))
      res.sendFile("./welcome.html", { root: __dirname });
  } else {
    res.render("login");
  }
});

function sendBlacklistingMessage(res) {
  console.log(blockedIps, failedAttempts);
  res.send("You have been blocked! you can retry after 5 minutes");
}

function removeFromArray(array, element) {
  const index = array.indexOf(element);
  if (index > -1) {
    array.splice(index, 1);
  }
}

app.post("/login", function (req, res) {
  var ip = RequestIp.getClientIp(req);
  if (blockedIps.includes(ip)) return sendBlacklistingMessage(res);

  console.log(ip);
  var username = req.body.username;
  var password = req.body.password;

  if (checkIfUserIsValid(username, password)) {
    if (req.body.remember) {
      return res
        .cookie("user", JSON.stringify(req.body), { maxAge: 10800 })
        .sendFile("./welcome.html", { root: __dirname });
    }

    return res.sendFile("./welcome.html", { root: __dirname });
  } else {
    if (failedAttempts[ip]) {
      if (failedAttempts[ip] >= 3) {
        blockedIps.push(ip);
        setTimeout(() => {
          removeFromArray(blockedIps, ip);
          failedAttempts[ip] = 0;
        }, 1000 * 60 * 5);
        return sendBlacklistingMessage(res);
      }
    }
    if (!failedAttempts[ip]) failedAttempts[ip] = 1;
    failedAttempts[ip]++;

    res.render("login", { error: "Invalid login or password" });
    //send login page with error
  }
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server Has Started @ http://localhost:3000");
});
