/**
 * This is a simple Alexa Skill to hear funny news headlines from Fark.com
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask [App Name] for the headlines"
 *  Alexa: "..."
 */

var APP_ID = "";
var APP_NAME = "Funny News";

var FARK_RSS_URL = "http://www.fark.com/fark.rss";

var http = require('http');
var async = require('async');
var xml2js = require('xml2js').parseString;

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var MyApp = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MyApp.prototype = Object.create(AlexaSkill.prototype);
MyApp.prototype.constructor = MyApp;

MyApp.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MyApp onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MyApp.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MyApp onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleHeadlinesRequest(response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
MyApp.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MyApp onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MyApp.prototype.intentHandlers = {
    "GetHeadlinesIntent": function (intent, session, response) {
        handleHeadlinesRequest(response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("I can tell you some of the most recent funny news headlines from Fark.com. Would you like to hear them or would you like me to stop?");
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        response.tell("O.K.");
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        response.tell("O.K.");
    }
};

function handleHeadlinesRequest(response) {
    getHeadlines(function(err, result){
        response.tell(result);
    });
}

function getHeadlines(callback){
    async.waterfall([
        function(callback){
            // look up the company's ticker
            http.get(FARK_RSS_URL, function(res){
                var body = "";
        
                res.on('data', function (chunk) {
                    body += chunk;
                });
                
                res.on('end', function () {
                    callback(null, body);
                });
            }).on('error', function (e) {
                console.log("Got error: ", e);
                callback(e, null);
            });
        },
        function(xml, callback){
            // convert the xml to JSON for easier reading
            xml2js(xml, {
                "trim": true,
                "explicitArray": false
            }, callback);
        },
        function(json, callback){
            // get the most recent 5 headlines if the JSON is valid
            var speak_text = "";
            if(json && json.rss && json.rss.channel && json.rss.channel.item.length){
                for(var i = 0; i < json.rss.channel.item.length && i < 4; i++){
                    speak_text += json.rss.channel.item[i].title.replace(/\[(.+?)\]/g, "").replace("YOU'RE DOING IT WRONG", "you're doing it wrong").trim() + ".<break time=\"850ms\"/>";
                }
                callback(null, {
                    "speech": "<speak>Here are the most recent headlines:<break time=\"850ms\"/>" + speak_text + "</speak>",
                    "type": AlexaSkill.speechOutputType.SSML
                });
            }else{
                callback("Unable to parse stories", json);
            }
        }
    ], function(err, result){
        if(err){
            console.log(err);
            console.log(result);
        }
        callback(null, err ? "Sorry, I'm having trouble getting the news. Please try again later." : result);
    });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the MyApp skill.
    var skill = new MyApp();
    skill.execute(event, context);
};

