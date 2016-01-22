/////////////////////////////////////////////////////////////////////////////////////////////
//
// Starfleet Commander Advantage - Resolve
// Copyright (c) Robert Leachman
//
// ------------------------------------------------------------------------------------------
//
// This is a Tampermonkey script, tested for use with Chrome.
// (TODO: Expand on this instruction)
//
// Install Chrome, then Tampermonkey, then this script.
//
// ------------------------------------------------------------------------------------------
//
// USAGE:
//
// * TBD
//
// KNOWN ISSUES
// - Everything.
//
// GOOD IDEAS PILE
// - Could try for a roadmap
//
// DONE
// - Module started
//
// VERSION HISTORY
//
// 0.1  - Yet another script, this one likely will never be published
//
//
// ==UserScript==
// @name         SFCA-Resolve-Local
// @namespace    http://your.homepage/
// @version      0.1
// @description  Resolve to never lose a ship
// @author       Robert Leachman
// @match        http://*.playstarfleet.com/*
// @match        http://*.playstarfleetextreme.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js
// @grant        none
// @grant GM_setValue
// @grant GM_getValue
//
// ==/UserScript==
/////////////////////////////////////////////////////////////////////////////////////////////


/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             U S E R S C R I P T  F U N C T I O N S
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
// per https://learn.jquery.com/using-jquery-core/avoid-conflicts-other-libraries/
jQuery.noConflict();

// from Dive Into Greasemonkey (2010)
// http://diveintogreasemonkey.org/patterns/add-css.html
function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) {
        return;
    }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

// Get parameters from current HREF
// http://www.netlobo.com/url_query_string_javascript.html
function gup(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null)
        return "";
    else
        return results[1];
}

// From https://gist.githubusercontent.com/raw/2625891/waitForKeyElements.js
// Hacked to use noConflict jQuery

/*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
 that detects and handles AJAXed content.

 Usage example:

 waitForKeyElements (
 "div.comments"
 , commentCallbackFunction
 );

 //--- Page-specific function to do what we want when the node is found.
 function commentCallbackFunction (jNode) {
 jNode.text ("This comment changed by waitForKeyElements().");
 }

 IMPORTANT: This function requires your script to have loaded jQuery.
 */
function waitForKeyElements($,
                            selectorTxt, /* Required: The jQuery selector string that
                             specifies the desired element(s).
                             */
                            actionFunction, /* Required: The code to run when elements are
                             found. It is passed a jNode to the matched
                             element.
                             */
                            bWaitOnce, /* Optional: If false, will continue to scan for
                             new elements even after the first match is
                             found.
                             */
                            iframeSelector  /* Optional: If set, identifies the iframe to
                             search.
                             */) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
        targetNodes = $(selectorTxt);
    else
        targetNodes = $(iframeSelector).contents()
            .find(selectorTxt);
    if (targetNodes && targetNodes.length > 0) {
        btargetsFound = true;
        /*--- Found target node(s).  Go through each and act if they
         are new.
         */
        targetNodes.each(function () {
            var jThis = $(this);
            var alreadyFound = jThis.data('alreadyFound') || false;

            if (!alreadyFound) {
                //--- Call the payload function.
                var cancelFound = actionFunction($, jThis);
                if (cancelFound)
                    btargetsFound = false;
                else
                    jThis.data('alreadyFound', true);
            }
        });
    }
    else {
        btargetsFound = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj = waitForKeyElements.controlObj || {};
    var controlKey = selectorTxt.replace(/[^\w]/g, "_");
    var timeControl = controlObj [controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound && bWaitOnce && timeControl) {
        //--- The only condition where we need to clear the timer.
        clearInterval(timeControl);
        delete controlObj [controlKey]
    }
    else {
        //--- Set a timer, if needed.
        if (!timeControl) {
            timeControl = setInterval(function () {
                    waitForKeyElements($,
                        selectorTxt,
                        actionFunction,
                        bWaitOnce,
                        iframeSelector
                    );
                },
                300
            );
            controlObj [controlKey] = timeControl;
        }
    }
    waitForKeyElements.controlObj = controlObj;


}


/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 * MY FUNCTIONS:
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
// Display a nice status or error message box
function emitNotification($, quickLink) {
    var messageBox = document.createElement("div");
    messageBox.setAttribute('class', 'notice');
    messageBox.innerHTML = quickLink;

    $(messageBox).appendTo('#flash_messages');
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

// Extend the base function to provide separation between the differnet versions...
function myGMsetValue(param, value) {
    var uni = window.location.href.split('.')[0].split('/')[2];
    //console.log('Setting '+uni+'-'+param+'='+value);
    GM_setValue(uni + '-' + param, value);
}

function myGMgetValue(param, def) {
    var uni = window.location.href.split('.')[0].split('/')[2];
    var needDefault = "NoSuchValueStoredHere";
    //console.log('fetching '+uni+'-'+param);
    var val = GM_getValue(uni + '-' + param, needDefault);
    if (val == needDefault)
        return def;
    else
        return val;
}

function addMyCSS() {
    // Status messages...
    myCSS = ".myLessFancyStatusBox {";
    myCSS += "color: white;";
    //myCSS += "background-image:url(/images/starfleet/layout/transparent_grey_bg.png);";
    myCSS += "border:1px solid #006C82;";
    myCSS += "padding:10px;";
    myCSS += " margin-bottom:1em;";
    myCSS += "}";

    myCSS += '#myStuff {';
    //myCSS += 'background-image: url(/images/starfleet/layout/transparent_grey_bg.png);';
    myCSS += 'border: 1px solid yellow;';
    myCSS += 'margin-left: -10px;';
    myCSS += 'margin-bottom: 5px;';
    myCSS += 'padding: 10px 10px 10px 20px;';
    myCSS += '}';

    addGlobalStyle(myCSS);
}


function myAttachIt(theFunction) {

    var script = document.createElement("script");
    script.type = "application/javascript";

    //anonymous function, fires on load:
    //script.textContent = "(" + myScript + ")();";

    //we just want it available for later:
    script.textContent = theFunction;

    document.body.appendChild(script);
}

//////////////////////////////////// THIS SCRIPT //////////////////////////////////////////////////
//TODO: find a better way to connect...
function do_offerAdHocTimer($) {
    //console.log("Need a hook into the object...");
    var r = new Resolve(false);
    r.offerAdHocTimer($);
}

// for debugging, remove related items...
function do_purgeState($) {
    console.log("Purging everything");
    var stores = new Stores();
    var evtCount = stores.getEventCount();

    var universe = window.location.href.split('.')[0].split('/')[2];


    var dataKey = "E";
    dataKey = universe + '-' + dataKey;
    for (var i = 0; i < evtCount; i++) {
        localStorage.removeItem(dataKey + i);
    }
    localStorage.removeItem([dataKey + 'C']);
    localStorage.removeItem(universe + '-botState');
    localStorage.removeItem(universe + '-fleetInterval');

    //a good time to purge old logs... for now
    //var logger = new Logger(universe);
    //logger.purge();

    localStorage.removeItem(universe + '-alreadyCheckedBuildComplete');
}

function do_addAdHoc($, theTimer) {
    var r = new Resolve(false);
    var newEvent = r.addTimerEvent($, theTimer);
    //console.log("Added", newEvent);
    r.emitTimerFleetRow($, newEvent);
}


// http://wiki.greasespot.net/XPath_Helper
function $x() {
    var x = '';
    var node = document;
    var type = 0;
    var fix = true;
    var i = 0;
    var cur;

    function toArray(xp) {
        var final = [], next;
        while (next = xp.iterateNext()) {
            final.push(next);
        }
        return final;
    }

    while (cur = arguments[i++]) {
        switch (typeof cur) {
            case "string":
                x += (x == '') ? cur : " | " + cur;
                continue;
            case "number":
                type = cur;
                continue;
            case "object":
                node = cur;
                continue;
            case "boolean":
                fix = cur;
                continue;
        }
    }

    if (fix) {
        if (type == 6) type = 4;
        if (type == 7) type = 5;
    }

    // selection mistake helper
    if (!/^\//.test(x)) x = "//" + x;

    // context mistake helper
    if (node != document && !/^\./.test(x)) x = "." + x;

    var result = document.evaluate(x, node, null, type, null);
    if (fix) {
        // automatically return special type
        switch (type) {
            case 1:
                return result.numberValue;
            case 2:
                return result.stringValue;
            case 3:
                return result.booleanValue;
            case 8:
            case 9:
                return result.singleNodeValue;
        }
    }

    return fix ? toArray(result) : result;
}


function Resolve($, mainline) {
    // Where are we?
    this.universe = window.location.href.split('.')[0].split('/')[2];
    var logger = new Logger(this.universe);
    currentPlanet = this.gup('current_planet');
    activatePlanet = this.gup('activate_planet');
    if (activatePlanet)
        this.nextPlanet = activatePlanet;
    else
        this.nextPlanet = currentPlanet;

    // What time is it?
    var myDate = new Date();
    var now = myDate.getTime();
    this.clockNow = (now - 1266788464836) / 1000;                        //TODO: what did this mean?
    this.clockNow = Math.round(this.clockNow);

    // What mode are we in?
    this.botState = this.getState($);
    //console.log("BOJ state:", this.botState);
    if (typeof this.botState == "undefined") {
        logger.log('i', "---- Resolve init ----");
        localStorage[this.universe + '-fleetInterval'] = 0;
        this.setState($, 'run');
    }

    this.cheating = false;
    this.botCloak = false; // if true, no bot AI events can fire
    var watching = false;
    var running = false;
    var foundSunset = false;
    this.hyperactive = false;
    var foundShadow = false; //TODO: the others aren't object properties but just state variables like this one

    if (mainline) {
        //console.log("Resolve BOJ, state=" + this.botState);
        // Find unexpired events...
        var stores = new Stores();
        var evtCount = stores.getEventCount();
        // for every event not logically deleted, if it hasn't expired...
        for (var i = 0; i < evtCount; i++) {
            var evt = stores.getEvent(i);
            if (evt[6] != 1) {
                var eElapsed = parseInt(this.clockNow - evt[0], 10);
                var eEnd = (evt[2] - eElapsed);
                if (eEnd < 0) {
                    evt[6] = 1;
                    //console.log("  expired, needs update");
                    stores.saveEvents(false);
                } else {
                    //console.log("DEBUG: live event  type: " + evt[4] + " end: " + eEnd);
                    if (evt[4] == "Klaxon")
                        this.cheating = true;

                    if (evt[4] == "Cloak")
                        this.botCloak = true;
                    if (evt[4] == "Watch")
                        watching = true;
                    if (evt[4] == "Resolve")
                        running = true;
                    if (evt[4] == "Shadow") {
                        foundShadow = true;
                    }

                    if (evt[4] == "Tomorrow") {
                        // the event end is when it expires, or in this case it's when our fleets need to come in after //TODO: hardly clear to even me as I type it...
                        localStorage[this.universe + '-secondsUntilTomorrow'] = eEnd;
                    }
                    if (evt[4] == "Sunset") {
                        foundSunset = true;
                    }

                    if (evt[4] == "Hyper")
                        this.hyperactive = true;

                }
            }
        }

        // If the cloak is active, no matter what we don't want to create anything new...
        // If we're not running, don't start //TODO: need a way to start!
        if (this.botCloak) {
            console.log("Cloaked, suppressing all else until it expires...");
        } else if (!running) {
            if (this.botState !== 'off') {
                logger.log('i', "Turning bot off...");
                this.setState($, 'off');
            }
        } else {
            if (foundSunset) {
                console.log("The sun is shining");
            } else {
                console.log("The sun is down, we need to sleep now until tomorrow...");
                localStorage[this.universe + '-fleetInterval'] = 99;
            }
            //console.log("Keeping your ships alive...");
            // If there's no watcher on duty, make a new one...
            if (!watching) {
                if (this.botState === 'run') { // if the watcher expires after a fresh init... just make a new one.
                    logger.log('i', "** Watching fleets *************");
                    this.setState($, 'watch');
                } else if (this.botState === 'watch') { // if the watch period times out, go again but a bit longer...
                    logger.log('i', "** Create fresh watcher...");

                    // next time we need it a bit longer
                    localStorage[this.universe + '-fleetInterval'] = parseInt(localStorage[this.universe + '-fleetInterval'], 10) + 1;

                    this.setState($, 'watch');
                } else {
                    logger.log('w', 'WARN: watcher missing!'); // impossible, but be sure...
                    this.setState($, 'watch');
                }
            } else {
                if (!foundShadow) {
                    // Shadow the next event
                    logger.log('i', "Performing auto sleepsave...");
                    var evtFlag = this.addTimerEvent($, 'shadow'); //TODO: is this a tightly coupled control flag? I think so
                    if (evtFlag > -1) {
                        this.doBotSleepsave($);
                    } else {
                        logger.log('e', 'NO HEARTBEAT?!');
                    }
                } else {
                    //console.log("Performing sleepsave? Testing? Not doing anything more...");
                }
            }
            // All events have been created and auto sleep's or whatever are done... reset state if required
            if (this.botState === 'slept') {
                logger.log('i', "Resuming...");
                this.setState($, 'resume');
            }
        }
    }
    //console.log("Steel resolve! state=" + this.botState, "botCloak=" + this.botCloak);
}

Resolve.prototype = {
    constructor: Resolve, // ESSENTIAL else would be MyObject.prototype itself.
    // SHARED FUNCTIONS? //TODO: refactor?
    /**
     * Get parameters from current HREF
     * http://www.netlobo.com/url_query_string_javascript.html
     *
     * @param name
     * @returns value of named parameter from current HREF, or "" if not found
     */
    gup: function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return "";
        else
            return results[1];
    },

    // coded properly, all init events would be here... //TODO: that mainline flag in constructor is bullshit
    doBOJ: function () {
        //console.log("Resolve BOJ");
    },
    getState: function ($) {
        //console.log("BOT STATE: uni=" + this.universe + " state=" + localStorage[this.universe + '-botState']);
        return localStorage[this.universe + '-botState'];
    },
    setState: function ($, newState) {
        var logger = new Logger(this.universe);
        logger.log('d', "Set state:" + newState);
        if (newState === "off") {
            console.log("Bot off, cloak up?");
            //this.addTimerEvent($, '5:00,cloak');
        } else if (newState === "run") {
            console.log("  Not running, let's start!");
            this.addTimerEvent($, '18:00:00,run');
            //this.addTimerEvent($, '1:00:00,sunset');
            this.addTimerEvent($, 'shadow');
            logger.log('d', "NEW WATCHER: setstate=run");
            //this.addTimerEvent($, 'watch');
            //this.addTimerEvent($, 'sunset');

            /*
             var d = new Date();
             d.setHours(23,30,0,0);
             logger.log('d','Goof date:' + d);
             var myDate = new Date();
             var now = myDate.getTime();
             logger.log('d','Now  date:'+myDate);
             */

            this.addTimerEvent($, '18:00:00,watch');
            this.addTimerEvent($, '18:00:00,sunset');


        } else if (newState === "cloak") { //unused
            console.log("  Cloak up!");
            this.addTimerEvent($, '1:00,cloak');
        } else if (newState === "watch") {
            this.addTimerEvent($, 'shadow');
            logger.log('d', "NEW WATCHER: setstate=watch");
            this.addTimerEvent($, 'watch');
        } else if (newState === 'sleeping') {
            console.log("la la la have a good sleep...");
        } else if (newState === 'resume') {
            console.log("Back to watching... be sure most recent");
            this.addTimerEvent($, 'shadow');
            newState = "watch";
        }
        localStorage[this.universe + '-botState'] = newState;
        this.botState = newState;

    },
    doBotSleepsave: function ($) {
        var interval = localStorage[this.universe + '-fleetInterval'];
        var logger = new Logger(this.universe);
        logger.log('d', 'Performing sleepsave, interval=' + interval);

        this.setState($, 'sleeping');

        // now invoke the AllPlanets function to get us to the ships overview
        displayAllTasks('ships');
    },
    // Display BOJ message on Profile screen
    insertProfileHeader: function ($) {
        emitNotification($, 'Starfleet Commander Advantage -  Resolve (version ' + GM_info.script.version + '): ACTIVE!');
    },
    // Emit a simple toolbar with a button so we can test...
    timerToolbar: function ($) {
        //TODO: using this javascript way here and also in AllPlanets... fix it up
        var theHTML = '<a id="testTimerButton">[Test Timer]</a>' +
            ' <a id="purgeEventsButton">[Purge State]</a>' +
            ' <a id="purgeLogButton">[Purge Log]</a>' +
            ' <a id="dumpLogButton">[Dump Log]</a>' +
            ' State:' + this.botState;
        //emitNotification($, theHTML);

        var toolbarDiv = document.createElement('div');
        toolbarDiv.setAttribute('id', 'myToolbar');
        //    myStuffDiv.innerHTML='All: <a href="/overview?current_planet=34287">[ All Tasks ]</a>';

        toolbarDiv.innerHTML = theHTML;

        $('#flash_messages').before(toolbarDiv);


        //// Javascript way no more, we're using jQuery =)                          TODO: find and replace all
        $('#testTimerButton').click(function () {
            do_offerAdHocTimer($);
        });
        $('#purgeEventsButton').click(function () {
            do_purgeState($);
        });
        $('#purgeLogButton').click(function () {
            var universe = window.location.href.split('.')[0].split('/')[2];
            var logger = new Logger(universe);
            logger.purge();
        });
        $('#dumpLogButton').click(function () {
            var universe = window.location.href.split('.')[0].split('/')[2];
            var logger = new Logger(universe);
            logger.dump();
        });
        /*
         document.getElementById('testTimerButton').addEventListener('click', function (e) {
         do_offerAdHocTimer($);
         }, false);
         */
    },
    // Emit an input for an ad-hoc test timer...
    offerAdHocTimer: function ($) {
        var adhocDiv = document.createElement("div");
        adhocDiv.setAttribute("class", "description");
        adhocDiv.innerHTML = '<div id="ad-hoc-pastebox">Ad-hoc event: <input id="adhocPasteBox"' +
            'size=30 value="1:00,tomorrow,sunset=1:00;tomorrow=6:00">&nbsp;<input id="adHocBtn" type="submit" value="Add event"><br>&nbsp<br></div>';
        $('#fleets_span').before(adhocDiv);

        $('#adHocBtn').on("click", function () {
            do_addAdHoc($, document.getElementById("adhocPasteBox").value);
        });

        /*
         var adHocBtn = document.getElementById('adHocBtn'); // listen for my button's click, baby! //TODO: find and kill
         adHocBtn.addEventListener('click', function (e) {
         do_addAdHoc($, document.getElementById("adhocPasteBox").value);
         }, false);
         */
    },
    // Another gem that I'm not using, this one pulled the planet number from a destination fleet... but it's
    // not the target planet, but instead just the current planet... useless.
    stripPlanetNumberFromFleetRow: function ($, row) {
        var dest = row.find('.destination').html();

        var planet = String(dest.match(/current_planet.+?;/));
        return planet.split('=')[1].split('&')[0];
    },
    /***
     * Add a timer event...
     *
     * Regression test cases:
     *    436548,-2769,6313    Copy an existing timer element
     *    150            Seconds-only blank timer
     *    2:30            Minute-seconds blank timer
     *    1:02:30            Hours-minutes-seconds blank timer
     *      10,1:1:1            Galaxy view 1:1:1 after 10 seconds
     *    10,chain        Chain events fleet view
     *    10,cloak        Bot cloak
     *      10,simulation        Simulated attack
     *    10,hyper            Hyperspastic respawn of chain events
     *      1:00,slow,59:59:59,1    Delayed probe group-add join -- http://forum.playstarfleet.com/viewtopic.php?f=18&t=3802
     *      1:00,probe,59:59:59     Timed probe
     *
     * returns the new event number, for the rare case where we're adding a adHoc event (testing & debugging)
     **/
    addTimerEvent: function ($, adhoc) {
        var logger = new Logger();
        logger.log('d', "new ad hoc event=" + adhoc);

        var myTime;
        var myStart;
        var myEnd;
        var callback = "null";
        var missionType = "Ad-hoc";
        var missionDest = "";
        var missionOrigin = "<i>Chonky!</i>";
        var missionInfo = "";
        var viewGal, viewSys, viewPlanet, viewTarget;

        var fleetStart, fleetEnd;

        var setSeconds = 0, setMinutes = 0, setHours = 0, newTime = 0;
        var decode = adhoc.split(',');

        var timerRegEx = /makeTimer.+?;/;
        if (decode.length == 1) {
            if (decode[0] === 'shadow') {

                // need to shadow the first event...
                console.log('DEBUG shadowing first event'); //TODO: should be next harvest event

                /**
                 * First must delete any prior shadow... //TODO: more hacks
                 */
                var stores = new Stores();
                for (var i = 0; i < stores.getEventCount(); i++) {
                    var evt = stores.getEvent(i);
                    if (evt[6] != 1) {
                        if (evt[4] == "Shadow") {
                            console.log("Shadow exists!!!");
                            stores.expireEvent(i);
                        }
                    }
                }

                var firstRow = ""; //TODO: rename this

                // The shadow needs to fire after a return event... not the first event...
                // So find an event with a << marker on it, in the first column.
                $('#tasks > tbody > tr').each(function (idx) {
                    if (idx > 0) {

                        var thisRow = $(this).children('td').eq(2);
                        if (thisRow.length === 0) {
                            logger.log('w', 'found no timers to shadow');
                            return false;
                        }
                        var thisTypeCol = thisRow.html().trim();

                        //var checkType = thisTypeCol.match(timerRegEx)); //TODO: dupe code!

                        var thisType = thisTypeCol.split('>')[1].split('<')[0];
                        if (!(thisType === "Harvest" || thisType === "Espionage" || thisType === "Transport" || thisType === "Attack")) {
                            firstRow = $(this);
                            return false;
                        }
                    }
                });

                //console.log("DEBUG found match ", firstRow.length);
                if (firstRow.length) {
                    var firstTimer = firstRow.html();

                    var timerData = String(firstTimer.match(timerRegEx)); //TODO: dupe code!

                    //console.log("DEBUG timer data: " + timerData);
                    fleetStart = parseInt(timerData.split(',')[1], 10);
                    fleetEnd = parseInt(timerData.split(',')[2], 10);

                    myTime = this.clockNow;
                    myStart = fleetStart;

                    myEnd = fleetEnd; // for testing
                    //TODO: provide debugging flag for this!
                    //console.log("** Are you a bot?"); myEnd = fleetEnd+30;
                    myEnd = fleetEnd + 300; // add a little so we don't look like a bot =)


                } else {
                    newTime = 60; // in a minute we can try again...
                    console.log("are you a bot waiting for an event?");
                    //myLog("hr=" + setHours + " min=" + setMinutes + " sec=" + setSeconds + " time=" + newTime);
                    //myTime = rightNow;
                    myTime = this.clockNow;
                    myStart = 0;
                    myEnd = newTime;
                }
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Shadow";
                missionInfo = "Heartbeat";
                missionDest = '<a href="fleet?current_planet=' + this.nextPlanet + '">(fleet view)</a>';


                //too simple:
                //var firstRow = $('#tasks > tbody > tr').first().next();

                // If we're not on the fleet screen, skip making the event now and it will be created later
                //TODO: when does a shadow row get created but not on the fleet screen?!

                /*
                 if (firstRow.length) {
                 var firstTimer = firstRow.html();

                 var timerData = String(firstTimer.match(timerRegEx)); //TODO: dupe code!

                 //console.log("DEBUG timer data: " + timerData);
                 fleetStart = parseInt(timerData.split(',')[1], 10);
                 fleetEnd = parseInt(timerData.split(',')[2], 10);

                 myTime = this.clockNow;
                 myStart = fleetStart;
                 myEnd = fleetEnd; // for testing
                 console.log("** Are you a bot?");
                 myEnd = fleetEnd + 150; // add a little so we don't look like a bot =)

                 //myEnd = 10;


                 } else {
                 //TODO: I think "will be created later" is true but... our heartbeat is what keeps us alive!!
                 var logger = new Logger();
                 logger.log('e',"DEBUG: can't add shadow!!!!!");
                 return -1;
                 }
                 */


            } else if (decode[0] === 'watch') {
                //var firstTimer = $('#tasks > tbody > tr').first().next().html();
                var lastTimer = $('#tasks > tbody > tr').last().html();

                try {
                    var lastTime = String(lastTimer.match(timerRegEx)); //TODO: dupe code!
                    //console.log("TIMER DATA: " + timerData);
                    fleetStart = parseInt(lastTime.split(',')[1], 10);
                    fleetEnd = parseInt(lastTime.split(',')[2], 10);
                } catch (err) {
                    logger.log('w', "No timer (no fleets?) for watch");

                    fleetStart = 0;
                    fleetEnd = 120;
                }

                myTime = this.clockNow;
                myStart = fleetStart;

                myEnd = fleetEnd;

                // We used to be more paranoid about bot checking, so had longer delay
                console.log("** Are you a bot?");
                myEnd = fleetEnd + 30;
                //myEnd = fleetEnd + 60;

                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Watch";
                missionInfo = "Watching";
                //missionDest = '<a href="fleet?current_planet=' + this.nextPlanet + '">(fleet view)</a>';
                missionDest = "Waiting " + localStorage[this.universe + '-fleetInterval'];
                console.log("The bot is watching for your imminent, delayed return to the game...");
            } else if (decode[0] === 'sunset') {
                // WRONG WRONG WRONG TODO: what's better? Not sure when we want sunset but probably not here...

                //var firstTimer = $('#tasks > tbody > tr').first().next().html();
                var lastTimer = $('#tasks > tbody > tr').last().html();

                try {
                    var lastTime = String(lastTimer.match(timerRegEx)); //TODO: dupe code!
                    //console.log("TIMER DATA: " + timerData);
                    fleetStart = parseInt(lastTime.split(',')[1], 10);
                    fleetEnd = parseInt(lastTime.split(',')[2], 10);
                } catch (err) {
                    logger.log('w', "No timer (no fleets?) for sunset");

                    fleetStart = 0;
                    fleetEnd = 120;
                }

                myTime = this.clockNow;
                myStart = fleetStart;
                myEnd = fleetEnd;
                console.log("** Are you a bot?");
                //myEnd = fleetEnd + 60;

                // </wrong>


                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Sunset";
                missionInfo = "It will be dark soon";
                missionDest = "The night";
                console.log("No vampires here");

            } else {
                // do nothing but create a new timer...
                newTime = this.getAdHocTime(adhoc);
                //myLog("hr=" + setHours + " min=" + setMinutes + " sec=" + setSeconds + " time=" + newTime);
                //myTime = rightNow;
                myTime = this.clockNow;
                myStart = 0;
                myEnd = newTime;
            }
        }
        else if (decode.length == 2) {
            var twoParms = adhoc.split(',');
            adhoc = twoParms[0]; // the time

            newTime = this.getAdHocTime(adhoc);

            //myLog("TIME: " + newTime);
            //myLog("hr=" + setHours + " min=" + setMinutes + " sec=" + setSeconds + " time=" + newTime);
            //myTime = rightNow;
            myTime = this.clockNow;
            myStart = 0;
            myEnd = newTime;

            viewTarget = twoParms[1];

            if (viewTarget == "tomorrow") {
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Tomorrow";
                missionInfo = "Tomorrow is now";
                missionDest = "The future";
                console.log("Today's troubles are sufficient");

            } else if (viewTarget == "sunset") {
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Sunset";
                missionInfo = "It will be dark soon";
                missionDest = "The night";
                console.log("No vampires here, time specified=" + adhoc);

            } else if (viewTarget == "chain") {
                //myLog("Adding chained event...");
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Klaxon";
                missionInfo = "Chain";
                missionDest = "\n\n<a href=\"/fleet?current_planet=" + this.nextPlanet + ">(fleet view)</a>";

            } else if (viewTarget == "cloak") {
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Cloak";
                missionInfo = "Bot Cloak";
                missionDest = '<a href="fleet?current_planet=' + this.nextPlanet + '">(fleet view)</a>';
                //console.log("The bots are cloaked, for now...");

            } else if (viewTarget == "watch") { // for debugging only, now scheduled as last //TODO: delete?
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Watch";
                missionInfo = "Watching";
                //missionDest = '<a href="fleet?current_planet=' + this.nextPlanet + '">(fleet view)</a>';
                missionDest = "Waiting 10";
                console.log("The AI is watching for your immiment, delayed return to the game...");

            } else if (viewTarget == "run") {
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Resolve";
                missionInfo = "Resolve";
                missionDest = '<a href="fleet?current_planet=' + this.nextPlanet + '">(fleet view)</a>';


            } else if (viewTarget == "hyper") {
                //myLog("Adding hyper event...");
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Hyper";
                missionInfo = "Hyper (refresh?)";
                missionDest = "\n\n<a href=\"/fleet?current_planet=" + this.nextPlanet + ">(fleet view)</a>";
            } else if (viewTarget == "simulation") {
                //myLog("Adding attack simulation...");
                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Attack!";
                missionInfo = "Simulation";
                missionDest = "\n\n<span class='targetedLinkage'><a href=\"/fleet?current_planet=" + this.nextPlanet + ">[YOUR SHIT]</a></span>";
            } else {
                // Default is galaxy view observation
                viewGal = viewTarget.split(':')[0];
                viewSys = viewTarget.split(':')[1];
                if (typeof viewSys == "undefined") {
                    console.log("BUG!");
                    throw new Error("Bad target! " + decode[0] + " " + decode[1]);
                }

                callback = "function() { window.location = '/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "'; }";
                missionType = "Observe";
                missionInfo = "Galaxy View";
                missionDest = "\n\n<span class='targetedLinkage'><a href='/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "'>[" + viewTarget + "]</a></span>";
            }
        }
        else if (decode.length == 3) {
            // TODO: much the same as above, create function?
            var threeParms = adhoc.split(',');
            adhoc = threeParms[0]; // the time
            newTime = this.getAdHocTime(adhoc);

            myTime = this.clockNow;
            myStart = 0;
            myEnd = newTime;

            viewTarget = threeParms[1];
            var additional = threeParms[2];
            if (viewTarget === 'tomorrow') {
                logger.log('d', 'set new tomorrow and the one after that too!');
                // 1:00,tomorrow,sunset=5:00;tomorrow=6:00
                var splitNext = additional.split(';');
                var nextSunset = splitNext[0];
                var nextTomorrow = splitNext[1];
                logger.log('d', 'next sunset=' + nextSunset + ' next tomorrow=' + nextTomorrow);

                var sunset = nextSunset.split('=')[1];

                this.addTimerEvent($, nextSunset.split('=')[1] + ',sunset');

                callback = "function() { window.location = '/fleet?current_planet=" + this.nextPlanet + "'; }";
                missionType = "Tomorrow";
                missionInfo = "Tomorrow is coming";
                missionDest = "See into the future";
                console.log("The day after tomorrow...");


            } else {
                logger.log('e', "Don't know what to do with " + adhoc);
                return;
            }
        }

        else {
            console.log("TOO MANY!");
            return;
            /******************

             else if (decode.length == 3) {
            myLog("ADHOC3");
//       1:00,probe,59:59:59     Timed probe
            var decode2 = decode[1];
            myLog("decode2: " + decode2);
            if (decode2 == "probe") {
                missionType = "Probe";
                myLog("do newprobe code");

                var probeDist = my_calc_distance(Gcurrent_planet_position, Gcurrent_planet_solar_system, Gcurrent_planet_galaxy, decode[2].split(':')[2], decode[2].split(':')[1], decode[2].split(':')[0]);
                myLog("PROBE DIST: " + probeDist);

                var probeEngineSpeedField = document.getElementById("ship_quantity_950199677_speed");
                if (probeEngineSpeedField == null) {
                    myLog("ERROR no probes!");
                    emitErrorMessage("No probes on this planet!");
                    return;
                }
                var probeEngineSpeed = parseInt(probeEngineSpeedField.innerHTML);
                myLog("Probe engine speed:" + probeEngineSpeed);

                var universeSpeed = 3600;
                if (window.location.href.split('.')[0] == "http://playstarfleetextreme")
                    universeSpeed = 1800;

                var tripDuration1 = calc_duration(probeEngineSpeed, probeDist, universeSpeed, 10);
                myLog("Duration1: " + tripDuration1);

                var espLink = '/espionage/espionage?coords=' + String(decode[2].replace(/\:/g, '.')) + '&amp;current_planet=' + this.nextPlanet + '&amp;ship_quantities%5B950199677%5D=' + 1 + '&amp;speed=10';
                myLog("LINK:" + espLink);
                callback = "function() { window.location = '" + espLink + "'; }";

                var launchTime = getAdHocTime(decode[0]);
                myTime = rightNow;
                myStart = 0;
                myEnd = launchTime;
                //missionDest="\n\n<span class='slowLinkage'><a href=\"/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "\">[" + viewTarget + "]</a></span>";
                viewGal = decode[2].split(':')[0];
                viewSys = decode[2].split(':')[1];
                missionDest = "\n\n<a href=\"/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "\">[" + decode[2] + "]</a>";
            } else {
                // ad-hoc copy event, with no drift parm... probably obsolete
                myTime = parseInt(decode[0], 10);
                myStart = parseInt(decode[1], 10);
                myEnd = parseInt(decode[2], 10);
                myLog("myTime= " + myTime + " myStart=" + myStart + " myEnd=" + myEnd);
            }
        }
             else if (decode.length == 4) {
            var type = decode[1];
            if (type == "slow" || type == "attackprobe") {

                viewTarget = decode[2];
                var probeSpeed = decode[0];

                viewGal = viewTarget.split(':')[0];
                viewSys = viewTarget.split(':')[1];
                viewPlanet = viewTarget.split(':')[2];
                var targetPlanet = viewGal + "." + viewSys + "." + viewPlanet;
                var slowDist = my_calc_distance(Gcurrent_planet_position, Gcurrent_planet_solar_system, Gcurrent_planet_galaxy, viewPlanet, viewSys, viewGal);

                var universeSpeed = 3600;
                if (window.location.href.split('.')[0] == "http://playstarfleetextreme")
                    universeSpeed = 1800;
                var parms = 'ship_quantities[950199677]=1&distance=' + slowDist + '&universe_speed=' + universeSpeed + '&speed=' + probeSpeed;
                //myLog("PROBE SLOW: distance=" + slowDist + " universe speed=" + universeSpeed + " targetPlanet=" + targetPlanet + " parms=" + parms);

                var probeEngineSpeedField = document.getElementById("ship_quantity_950199677_speed");
                if (probeEngineSpeedField == null) {
                    myLog("ERROR no probes!");
                    emitErrorMessage("No probes on this planet!");
                    return;
                }
                var probeEngineSpeed = probeEngineSpeedField.innerHTML;
                //myLog("PROBE ENGINE SPEED: " + probeEngineSpeed);
                newTime = getAdHocTime(decode[0]);

                //var tripDuration10 = calc_duration(probeEngineSpeed, slowDist, universeSpeed, 10);
                //var tripDuration9 = calc_duration(probeEngineSpeed, slowDist, universeSpeed, 9);
                var tripDuration1 = calc_duration(probeEngineSpeed, slowDist, universeSpeed, probeSpeed);
                //myLog("SLOW DURATION: 10=" + tripDuration10 + " 9=" + tripDuration9 + " 1=" + tripDuration1);
                var less = 15;
                var slowLaunch = Math.round(tripDuration1 / 1.3) + less; // need to launch slow probe when just this much time remains before the attack
                var slowAmount = Math.round(tripDuration1 * .3) - less;

                var formation = decode[3];
                if (formation < 1) {
                    formation = getFormationData(viewTarget, 1);
                    if (formation < 1) {
                        myLog("ERROR no formation");
                        emitErrorMessage("No formation!");
                        return;
                    }
                }

                var attackTime = getFormationData(formation, 2);
                //myLog("ATTACK TIME: " + attackTime);
                if (attackTime < 1) {
                    myLog("ERROR too late, timer expired");
                    emitErrorMessage("Attack time expired, we already attacked!");
                    return;
                }

                if (type == "slow") {
                    newTime = attackTime - slowLaunch;
                    if (newTime < 1) {
                        myLog("ERROR too late, timer expired");
                        emitErrorMessage("Too late, max slow launch opportunity expired!");
                        return;
                    }
                    var slowMins = 0;
                    if (slowAmount > 60)
                        slowMins = Math.floor(slowAmount / 60);
                    var slowSecs = slowAmount - slowMins * 60;
                    if (slowSecs < 10)
                        slowSecs = "0" + slowSecs;
                    var slowTime = slowMins + ":" + slowSecs;
                    emitStatusMessage("Will slow the attack by about " + slowTime + " (will be less).", false);
                    missionInfo = "Will slow ~" + slowTime;
                    var r = 'new Ajax.Request(\'/group_attack/join/' + formation + '?current_planet=' + this.nextPlanet + '&amp;target_planet=' + targetPlanet + '\', {asynchronous:true, evalscripts:true, ';
                    r += 'parameters: \'' + parms + '\' } ); ';
                    r += ';return false; ';

                    callback = "function() { " + r + " }";
                    missionType = "Slow";
                    missionDest = "\n\n<span class='slowLinkage'><a href=\"/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "\">[" + viewTarget + "]</a></span>";
                    missionOrigin = "<a href=\"/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + Gcurrent_planet_galaxy + "&solar_system=" + Gcurrent_planet_solar_system + "\">[" + Gcurrent_planet_galaxy + ":" + Gcurrent_planet_solar_system + ":" + Gcurrent_planet_position + "]</a>";
                    //myLog("SLOW ORIGIN: " + missionOrigin);

                }
                // else we're doing the attackprobe
                else {
                    var espLink = '/espionage/espionage?coords=' + String(decode[2].replace(/\:/g, '.')) + '&amp;current_planet=' + this.nextPlanet + '&amp;ship_quantities%5B950199677%5D=' + 1 + '&amp;speed=10';
                    myLog("LINK:" + espLink);
                    callback = "function() { window.location = '" + espLink + "'; }";
                    newTime = attackTime - tripDuration1;
                    viewGal = decode[2].split(':')[0];
                    viewSys = decode[2].split(':')[1];
                    missionDest = "\n\n<a href=\"/galaxy/show?current_planet=" + this.nextPlanet + "&galaxy=" + viewGal + "&solar_system=" + viewSys + "\">[" + decode[2] + "]</a>";

                }
                myTime = rightNow;
                myStart = 0;
                myEnd = newTime;


            } else {
                myTime = parseInt(decode[0], 10);
                myStart = parseInt(decode[1], 10);
                myEnd = parseInt(decode[2], 10);
                myDrift = parseInt(decode[3], 10);
                myLog("myTime= " + myTime + " myStart=" + myStart + " myEnd=" + myEnd + " myDrift=" + myDrift);
                // Need to worry about drift... their clock might not match ours, probably won't... and add a friend into the mix and we really must have a solution!
                //var driftDiff = myDrift - GclockDrift;
                //rightNow -= driftDiff;
            }
 *********           */
        }

        console.log("DEBUGGER saveTimedEvent");
        var evtCount = this.saveTimedEvent($, myTime, myStart, myEnd, callback, missionType, missionDest, missionOrigin, missionInfo);
        return evtCount;
    },
    /**
     * Given new event specifics, adds to store and returns the new event number.
     *
     * @param $
     * @param time
     * @param start
     * @param end
     * @param callback
     * @param type
     * @param dest
     * @param origin
     * @param info
     * @returns new event number
     */
    saveTimedEvent: function ($, time, start, end, callback, type, dest, origin, info) {
        var argsDump = 'args=';
        for (var k = 0; k < arguments.length; k++) {
            argsDump += k + '=' + arguments[k] + ' ';
        }
        var logger = new Logger();
        //logger.log('d','event args='+arguments.length+' '+argsDump);
        var stores = new Stores();
        return stores.appendEvent($, time, start, end, callback, type, dest, origin, info);
    },
    emitEvents: function ($) {

        var stores = new Stores();
        var evtCount = stores.getEventCount();
        //console.log("DEBUG: event count=", evtCount);
        // for every event not logically deleted, if it hasn't expired emit it, else mark to delete
        for (var i = 0; i < evtCount; i++) {
            var evt = stores.getEvent(i);
            if (evt[6] != 1) {
                var eElapsed = parseInt(this.clockNow - evt[0], 10);
                var eEnd = (evt[2] - eElapsed);
                if (eEnd < 0) {
                    evt[6] = 1;
                } else {
                    this.emitTimerFleetRow($, i);
                }
            }
        }
    },
    emitEntire: function ($, createRow) {
        console.log("Gotta create whole table");

        /*
         var table = $('<table></table>').addClass('compact');
         for(i=0; i<3; i++){
         var row = $('<tr></tr>').addClass('bar').text('result ' + i);
         table.append(row);
         }

         $('#here_table').append(table);
         */

        /***
         var content = "<table>"
         for(i=0; i<3; i++){
                content += '<tr><td>' + 'result ' +  i + '</td></tr>';
            }
         content += "</table>"

         $('#here_table').append(content);
         */


        var t = '<div id="fleets_span"></div>';
        t += "<table id='tasks' class='compact'>";
        t += "<tr>";
        t += "<th class='warning'></th>";
        t += "<th class='time'>Evt Time</th>";
        t += "<th class='mission_type'>Type</th>";
        t += "<th class='origin'>Origin</th>";
        t += "<th class='destination'>Destination</th>";
        t += "<th class='fleet'></th>";
        t += "<th class='actions'>Actions</th>";
        t += "</tr>";
        t += createRow;
        t += "</table>";

        //$('#flash_messages').after(t);
        $('#flash_messages').append(t);

    },
    /**
     * Emit my timer: the row on the screen, and the actual timer hook into the app
     * @param eventNumber
     */
    emitTimerFleetRow: function ($, eventNumber) {

        var stores = new Stores();
        var evt = stores.getEvent(eventNumber);
        var myTime = evt[0];
        var myStart = evt[1];
        var myEnd = evt[2];
        var callback = evt[3];
        var missionType = evt[4];
        var missionDest = evt[5];
        var missionOrigin = evt[7];
        var missionInfo = evt[8];

        //console.log("DEBUG emit row: type=" + missionType);
        // Now we can calculate the timer stats and actually emit the event
        elapsed = parseInt(this.clockNow - myTime, 10);
        calcStart = (elapsed + myStart);
        calcEnd = myEnd - elapsed;
        //myLog("Emit timer: start=" + calcStart + " end=" + calcEnd);
        if (calcEnd < 0)
            return;

        // need to determine a unique timer ID
        var timerID = 999;
        var bFindUnique = true;
        while (bFindUnique) {
            var testTimerID = document.getElementById(timerID + '_progress');
            if (testTimerID == null) {
                //myLog("No timer " + timerID);
                bFindUnique = false;
            } else
                timerID++;
        }

        /*
         <tr class="local  task harvest">
         <td class="warning"></td>

         <td class="time">
         <table class="task_timer_table">
         <tbody><tr class="friendly">
         <td>
         <div class="task_timer" title="">
         <div class="additional_content">
         </div>
         <div class="label">
         <span class="text">         </span>
         <span class="name">        </span>
         </div>
         <div id="31638370" class="js_timer">
         <div id="31638370_bar" class="bar">
         <div id="31638370_progress" class="progress" style="width: 11%;"></div>
         <div id="31638370_timer_text" class="timer_text">
         <span id="31638370_percent" class="percent">11%</span>
         <span class="percent">(</span><span id="31638370_countdown" class="countdown">00:01:38</span><span class="percent">)</span>
         </div>
         </div>
         </div>
         <div class="below_content">
         </div>
         <script type="text/javascript">
         makeTimer('31638370', 2, 110, null, true);
         </script>
         </div>
         </td>
         <td class="quantity">
         </td>
         </tr>
         </tbody></table>
         </td>

         <td class="mission_type">
         <a href="#" title="0 ore, 0 crystal, and 0 hydrogen. ">Harvest</a>
         </td>

         <td class="origin current"> //TODO: be sure my galaxy/show matches...
         Chonkston <a href="/galaxy/show?current_planet=34397&amp;galaxy=1&amp;solar_system=346">&lrm;[1:346:4]</a>
         </td>

         <td class="destination">
         Debris Field <a href="/galaxy/show?current_planet=34397&amp;galaxy=1&amp;solar_system=346">&lrm;[1:346:4]</a>
         </td>

         <td class="fleet">
         <div class="ship">
         <img alt="Icon_zagreus_class" src="/images/starfleet/ship_templates/icon_zagreus_class.png?1439250916" title="Zagreus Class Recycler">x1
         </div>
         <div class="clear"></div>
         </td>

         <td class="actions">
         <a href="/harvest/cancel/31638370?current_planet=34397">Recall</a>
         </td>


         </tr>
         */

        var t = "<tr class='local  task transport alt'>";
        t += "  <td class='warning'></td>";

        t += "  <td class='time'>";
        t += "      <table class='task_timer_table'>";
        t += "        <tr class=''>";
        t += "	 <td>";
        t += "          <div class='task_timer'>";
        t += "            <div class='additional_content'></div>";

        t += "            <div class='label'><span class='text'></span><span class='name'></span></div>";

        t += "            <div id='" + timerID + "' class='js_timer'>";
        t += "              <div id='" + timerID + "' class='bar'>";
        t += "                <div id='" + timerID + "_progress' class='progress' style='width: 47%;'></div>";
        t += "                <div id='" + timerID + "_timer_text' class='timer_text'>";
        t += "                  <span id='" + timerID + "_percent' class='percent'>99%</span>";
        t += "                  <span class='percent'>(</span><span id='" + timerID + "_countdown' class='countdown'>";
        t += "                    00:40:34";
        t += "                  </span><span class='percent'>)</span>";
        t += "                </div>";
        t += "              </div>";
        t += "            </div>";

        t += "            <div class='below_content'></div>";

        t += "            <script type='text/javascript'>";
        // so our timer is on line 49 like theirs:                                 //TODO: what is this about?!
        t += "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";

        t += "              makeTimer('" + timerID + "', " + calcStart + ", " + calcEnd + ", " + callback + " );";
        //t+="alert('DEBUG: Inserted');";

        t += "            </script>";
        t += "          </div>";
        t += "         </td>";
        t += "         <td class='quantity'></td>";
        t += "        </tr>";
        t += "      </table>";
        t += "  </td>";

        t += "  <td class='mission_type'><a onClick=\"alert('Good hunting!');return true;\" href=\"#\" title=\"Good hunting!\">" + missionType + "</a></td>";
        t += "  <td class='origin current'>" + missionOrigin + "</td>";

        t += "  <td class='destination'>" + missionDest + "</td>";
        t += "  <td class='fleet'>";
        var klaxLevel = GM_getValue("klaxLevel", "off");
        if (missionType == "Klaxon") {
            t += "        <div class='ship'><i>Klaxon set to " + klaxLevel + ".</i></div>";
        } else if (missionType == "Hyper") {
            t += "        <div class='ship'><i>Don't hyperventilate, we're just testing!</i></div>";


        } else if (missionType == "Cloak") {
            t += "        <div class='ship'><i>Bot cloak is active!</i></div>";

        } else if (missionType == "Watch") {
            t += "        <div class='ship'><i>Where are you?</i></div>";

        } else if (missionType == "Resolve") {
            t += "        <div class='ship'><i>Steel resolution!</i></div>";

        } else if (missionType == "Attack!") {
            t += "        <div class='ship'><i>Simulated attack (";
            if (klaxLevel == "off") {
                t += "klaxon off, feeling lucky?)";
            } else if (klaxLevel == "quiet") {
                t += "quiet klaxon)";
            } else { // loud
                t += "loud klaxon)";
            }
            t += "<i></div>";
        } else if (missionInfo.length > 0) {
            t += "        <div class='ship'>" + missionInfo + "</div>";
        } else {
            t += "        <div class='ship'>Chonky\'s ad-hoc</div>";
        }
        t += "    <div class='clear'></div>";
        t += "  </td>";

        t += ' <td class="actions"><a id="adHoc_' + timerID + '" myEvent="' + eventNumber + '">Dismiss</a></td>';
        t += "</tr>";

        //console.log("DEBUG ENTIRE");
        //this.emitEntire($,t);
        //return;

        var timerRegEx = /makeTimer.+?\;/;
        var foundTable = false;
        var bInserted = false;
        // Find the row before which this one belongs
        $('#tasks > tbody > tr').each(function (idx) {
            foundTable = true;
            if (idx > 0) {
                //$this = $(this);
                //this.setAttribute('id', 'theirRow' + (idx-1));

                //var thisTypeCol = $(this).children('td').eq(0).html().trim();
                //console.log("FLEET TYPE:", thisTypeCol.length, thisTypeCol);

                thisTimerCol = $(this).children('td').eq(1).html();
                if (typeof thisTimerCol != 'undefined') {
                    //console.log("TIMER COL: " + thisTimerCol);
                    var timerData = String(thisTimerCol.match(timerRegEx));
                    //console.log("TIMER DATA: " + timerData);
                    fleetStart = parseInt(timerData.split(',')[1], 10);
                    fleetEnd = parseInt(timerData.split(',')[2], 10);
                    //console.log('DEBUG: event start', fleetStart, 'end', fleetEnd);
                    // insert the event, note we did so, and break out of the rows loop
                    if (fleetEnd > calcEnd) {
                        $(this).before(t);
                        //calcEnd = 9999999; // TODO: why was this here?
                        bInserted = true;
                        return false;
                    }
                }

            }
        });

        // if the row wasn't inserted in the middle, add it to the bottom... or make a new table and show it there
        if (!bInserted) {
            if (foundTable) {
                $('#tasks > tbody:last').append(t);
            } else {
                var logger = new Logger();
                logger.log('e', "ERROR: No fleets! Must emit the whole table!");
                this.emitEntire($, t);
                //throw new Error("DEBUG: No fleets! Must emit the whole table!");
            }
        }

        // Dismiss button
        $('#adHoc_' + timerID).on("click", function () {
            var stores = new Stores();
            stores.expireEvent($(this).attr('myEvent'));
            $(this).closest('tr').remove();
        });
    },
    getAdHocTime: function (timeIn) {
        var setSeconds = 0, setMinutes = 0, setHours = 0;
        var setTime = timeIn.split(':');
        if (setTime.length == 1) {
            setSeconds = setTime[0];
        } else if (setTime.length == 2) {
            setMinutes = setTime[0];
            setSeconds = setTime[1];
        } else if (setTime.length == 3) {
            setHours = setTime[0];
            setMinutes = setTime[1];
            setSeconds = setTime[2];
        }
        return (parseInt(setHours, 10) * 3600) + (parseInt(setMinutes, 10) * 60) + parseInt(setSeconds, 10);
    }
};

/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             M A I N L I N E
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
jQuery(document).ready(function ($) {
    var uni = window.location.href.split('.')[0].split('/')[2];

    var logger = new Logger(uni);
    //logger.log('d','Resolve version ' + GM_info.script.version);

    // With steel resolution to never lose a ship or bit of resources, we init BOJ
    var r = new Resolve($, true);
    r.doBOJ();

    // Display BOJ message on Profile screen
    if ($('#content.options.index').length) {
        r.insertProfileHeader($);
    }
    if ($('#content.fleet.index').length) {
        var haveFleets = $('#fleets_span');
        if (haveFleets.length === 0) {
            r.emitEntire($, '');
        }

        r.timerToolbar($);
        r.emitEvents($);
    }
});

//console.log("BOJ Testbed");
addMyCSS();
