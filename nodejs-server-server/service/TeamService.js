'use strict';
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://admin:admin@cluster0.pilql.mongodb.net/greenhero?retryWrites=true&w=majority";
var ObjectId = require('mongodb').ObjectId;
var Character = require('../service/CharacterService');
var Application = require('../service/ApplicationService');
var User = require('../service/UserService');
var Event = require('../service/EventService');

/**
 * Create a new team
 *
 * body Team To create a new team
 * no response value expected for this operation
 **/
exports.createTeam = function (body) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      var myteamMembers = new Array();
      if (body.teamMembers != undefined) {
        for (var i = 0; i < body.teamMembers.length; i++) {
          myteamMembers.push(ObjectId(body.teamMembers[i]))
        }
      }
      if (err) throw err;
      var dbo = db.db("greenhero");
      var myobj = {
        "teamName": body.teamName,
        "avatar": body.avatar,
        "event_id": ObjectId(body.event_id),
        "teamLeader": ObjectId(body.teamLeader),
        "teamMembers": myteamMembers,
        "completed": body.completed,
        "applications": body.applications
      };
      dbo.collection("Team").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("successful");
        resolve(res);
        db.close();
      });
    });
  });
}


/**
 * Delete team
 * To delete a team
 *
 * teamName String The name of the team that needs to be deleted
 * no response value expected for this operation
 **/
exports.deleteTeamByTeamName = function (teamName) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var whereStr = { "teamName": teamName };  // condition
      dbo.collection("Team").deleteOne(whereStr, function (err, obj) {
        if (err) throw err;
        console.log("successful");
        resolve();
        db.close();
      });
    });
  });
}


/**
 * Get teams
 * See the available teams
 *
 * returns List
 **/
function getAllTeams () {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      dbo.collection("Team").find().toArray(async function (err, result) {
        if (err) throw err;
        for (let team of result) {
          if (team.teamLeader) {
            team.teamLeader = await Character.getCharacterById(team.teamLeader);
          }
          if (team.teamMembers) {
            for (let i = 0; i < team.teamMembers.length; i++) {
              const member = team.teamMembers[i];
              team.teamMembers[i] = await Character.getCharacterById(member);
            }
          }
          if (team.applications) {
            for (let i = 0; i < team.applications.length; i++) {
              const application = team.applications[i];
              team.applications[i] = await Application.getApplicationById(application);
            }
          }
        }
        resolve(result);
        db.close();
      });
    });
    var examples = {};
    examples['application/json'] = [{
      "teamName": "teamName",
      "event_id": "event_id",
      "_id": "_id",
      "avatar": "avatar",
      "teamLeader": "teamLeader",
      "teamMembers": ["teamMembers", "teamMembers"]
    }, {
      "teamName": "teamName",
      "event_id": "event_id",
      "_id": "_id",
      "avatar": "avatar",
      "teamLeader": "teamLeader",
      "teamMembers": ["teamMembers", "teamMembers"]
    }];
  });
}

exports.getAllTeams = getAllTeams;

/**
 * Get number of people by profession
 *
 * returns List
 **/
exports.getNumberOfPeople = function (profession) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var num = 0;
      dbo.collection("Team").find().toArray(async function (err, result) {
        if (err) throw err;
        for (let team of result) {
          if (team.teamLeader) {
            var character = await Character.getCharacterById(team.teamLeader);
            var user = await User.getUser(character.user_id)
            if (user.personalInfo.occupation === profession) {
              num += 1;
            }
          }
          if (team.teamMembers) {
            for (let i = 0; i < team.teamMembers.length; i++) {
              const member = team.teamMembers[i];
              var character = await Character.getCharacterById(member);
              var user = await User.getUser(character.user_id)
              if (user.personalInfo.occupation === profession) {
                num += 1;
              }
            }
          }
        }
        resolve({ total: num });
        db.close();
      });
    });
  });
}

/**
 * Get number of people 
 *
 * returns List
 **/
exports.getAllNumberOfPeople = function () {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var num = 0;
      dbo.collection("Team").find().toArray(async function (err, result) {
        if (err) throw err;
        let user = []
        for (let team of result) {
          if (team.teamLeader) {
            if (!user.includes(team.teamLeader.user_id)) {
              user.push(team.teamLeader.user_id);
            }
          }
          if (team.teamMembers) {
            for (let mem of team.teamMembers) {
              if (!user.includes(mem.user_id)) {
                user.push(mem.user_id);
              }
            }
          }
        }
        num = user.length
        let total_user = await User.getAllUsers()
        let total = total_user.length
        let res = Math.round(num / total * 100)
        resolve({ total: res });
        db.close();
      });
    });
  });
}

/**
 * Get number of event completed 
 *
 * returns List
 **/
exports.getNumberofCompletedEvent = function (date) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var num = 0;
      dbo.collection("Team").find({
        "completed": true
      }).toArray(async function (err, result) {
        if (err) throw err;
        for (let event of result) {
          let eve = (await Event.getEventById(event.event_id))[0];
          if (eve.openDate.getTime() > date.getTime()) {
            num += 1;
          }
        }
        let total_teams = await getAllTeams();
        let total = total_teams.length
        let res = Math.round(num / total * 100)
        resolve({ total: res });
        db.close();
      });
    });
  });
}


/**
 * Modify team
 * To modify a team
 *
 * body Team Updated team object
 * no response value expected for this operation
 **/
exports.modifyTeam = function (body) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      var myteamMembers = new Array();
      if (body.teamMembers != undefined) {
        for (var i = 0; i < body.teamMembers.length; i++) {
          myteamMembers.push(ObjectId(body.teamMembers[i]))
        }
      }
      if (err) throw err;
      var dbo = db.db("greenhero");
      var whereStr = { "userName": userName };  // condition
      var updateStr = {
        $set: {
          "teamName": body.teamName,
          "avatar": body.avatar,
          "event_id": ObjectId(body.event_id),
          "teamLeader": ObjectId(body.teamLeader),
          "teamMembers": myteamMembers,
          "completed": body.completed
        }
      };
      dbo.collection("Team").updateOne(whereStr, updateStr, function (err, res) {
        if (err) throw err;
        console.log("successful");
        db.close();
      });
    });
    resolve();
  });
}


/**
 * Modify team's turns
 * To modify a team's turns
 *
 * team_id string Team ID
 * turns List Turns
 * no response value expected for this operation
 **/
exports.updateTeamTurns = function (team_id, turns) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var whereStr = { "_id": new ObjectId(team_id) };  // condition
      var updateStr = {
        $set: {
          "turnOrder": turns
        }
      };
      dbo.collection("Team").updateOne(whereStr, updateStr, function (err, res) {
        if (err) throw err;
        console.log("successful");
        db.close();
      });
    });
    resolve();
  });
}



exports.getTeamByEventIdAndUserId = function (event_id, user_id) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, async function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      const characters = await Character.getCharacterByUserId(user_id);
      let team;
      for(let char of characters) {
        var whereStr = {
          $or: [{ "event_id": ObjectId(event_id), "teamLeader": ObjectId(char._id) },
          { "event_id": ObjectId(event_id), "teamMembers": { $elemMatch: { $eq: ObjectId(char._id) } } }
          ]
        };
        team = await new Promise((mini_resolve, mini_reject) => {
          dbo.collection("Team").findOne(whereStr).then(function (result) {
            if (err) throw err;
            mini_resolve(result);
            db.close();
          });
        });
        if(team) {
          break;
        }
      }
      if(team) {
        team.teamLeader = await Character.getCharacterById(team.teamLeader);
        if(team.teamMembers) {
          for(let i = 0; i < team.teamMembers.length; i++) {
            team.teamMembers[i] = await Character.getCharacterById(team.teamMembers[i]);
          }
        }
        if (team.applications) {
          for (let i = 0; i < team.applications.length; i++) {
            const application = team.applications[i];
            team.applications[i] = await Application.getApplicationById(application);
          }
        }
      }
      resolve(team); 
    });
  });
}

exports.getTeamByEventIdAndTeamName = function (event_id, teamName) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      if (err) throw err;
      var dbo = db.db("greenhero");
      var whereStr = {"event_id":ObjectId(event_id)};
      if(teamName) {
        whereStr["teamName"] = teamName;
      }
      dbo.collection("Team").find(whereStr).toArray(async function(err, result) { 
          if (err) throw err;
          for(let team of result) {
            team.teamLeader = await Character.getCharacterById(team.teamLeader);
            if(team.teamMembers) {
              for(let i = 0; i < team.teamMembers.length; i++) {
                team.teamMembers[i] = await Character.getCharacterById(team.teamMembers[i]);
              }
            }
            if (team.applications) {
              for (let i = 0; i < team.applications.length; i++) {
                const application = team.applications[i];
                team.applications[i] = await Application.getApplicationById(application);
              }
            }
          }
          resolve(result); 
          db.close();
      });
    });
  });
}

exports.modifyTeamById = function (_id, body) {
  return new Promise(function (resolve, reject) {
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
      var myteamMembers = new Array();
      if (body.teamMembers != undefined) {
        for (var i = 0; i < body.teamMembers.length; i++) {
          myteamMembers.push(ObjectId(body.teamMembers[i]))
        }
      }
      if (err) throw err;
      var dbo = db.db("greenhero");
      var whereStr = {"_id":ObjectId(_id)};  // condition
      var updateStr = {$set: { "teamName" : body.teamName,
                                "avatar" :body.avatar,
                                "event_id" : ObjectId(body.event_id),
                                "teamLeader" : ObjectId(body.teamLeader),
                                "teamMembers": myteamMembers,
                                "applications": body.applications,
                                "completed": body.completed}};
      dbo.collection("Team").updateOne(whereStr, updateStr, function(err, res) {
          if (err) throw err;
          console.log("successful");
          db.close();
      });
    });
    resolve();
  });
}