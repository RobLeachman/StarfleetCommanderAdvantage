/////////////////////////////////////////////////////////////////////////////////////////////
//
// Starfleet Commander Advantage - Sleepsave
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
// * One-click fleetsave for a specified duration, like when you're ready to go to sleep.
//
// KNOWN ISSUES
// - What if no Recyclers?
// - What if no fleets?
// - If it does hang up, need to auto-abort and not resume with surprise next time ships are shown
//
// GOOD IDEAS PILE
// - Recreate in 2015
//
// DONE
// - Module started
//
// VERSION HISTORY
//
// 0.7 - Keep going with better editor
//
// 0.5 - Coming along
//
// 0.3 - This shabby mess is starting to do things
//
// 0.1 - Revive from 2010 version.
//
//
// ==UserScript==
// @name         SFCA Sleepsave-Local
// @namespace    http://your.homepage/
// @version      0.7
// @description  One-click fleetsave
// @author       Robert Leachman
// @match        http://*.playstarfleet.com/*
// @match        http://*.playstarfleetextreme.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js
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

// Basic cookie getter, I don't need anything more than this sample code
// http://www.w3schools.com/js/js_cookies.asp
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
    messageBox.setAttribute('class', 'notice'); // class error is red, could be handy
    messageBox.innerHTML = quickLink;

    $(messageBox).appendTo('#flash_messages');
}

// this is inserted Javascript, not user script!
function toggleModuleEnabled_Sleepsave() {
    console.log("TOGGLE SLEEPSAVE ENABLE");
    document.cookie = "set_moduleEnabled_Sleepsave=toggle;path=/";
    location.reload();
}

// Display BOJ message on Profile screen
function insertProfileHeader($, moduleEnabled) {

    var isEnabled = '';
    var active = 'DISABLED';
    if (moduleEnabled) {
        isEnabled = 'checked';
        active = 'ACTIVE';
    }
    emitNotification($,
        '<input type="checkbox" ' + isEnabled + ' onClick="toggleModuleEnabled_Sleepsave();"> \
Starfleet Commander Advantage -  Sleepsave \
(version ' + GM_info.script.version + '): ' + active);
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
    var val = GM_getValue(uni + '-' + param, needDefault);
    //console.log('fetched '+uni+'-'+param+'='+val);
    if (val == needDefault)
        return def;
    else
        return val;
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

function addMyCSS() {

    myCSS += '#content.fleet #fleets_span {';
    myCSS += 'display: none;';
    myCSS += '}';


    myCSS += '.commander {';
    myCSS += 'display:none';
    myCSS += '}';


    myCSS += '#myFleets {';
    myCSS += 'margin-left: -10px;';
    myCSS += '}';


    addGlobalStyle(myCSS);
}

function doToggleFleets() {
    var toggleFleets = 'none';
    var e = document.getElementById("fleetWrapper");
    if (e.getAttribute("style") !== "display:block") {
        e.setAttribute('style', 'display:block');
        toggleFleets = 'block';
    } else {
        e.setAttribute('style', 'display:none');
    }
    document.cookie = 'set_toggleFleets=' + toggleFleets + ';path=/';
}


// Fix up a nicer fleet count, with a button to toggle the whole section...
function addMyFleetbar($) {
    // If we have fleets out...
    if ($('#fleets_span').length) {
        var toolbarDiv = document.createElement('div');
        toolbarDiv.setAttribute('id', 'myFleets');
        var theirFleets = $('#fleets_used').html();
        //console.log('their fleets',theirFleets);
        var fleetsOut = theirFleets.split('>')[1].split('<')[0];
        //console.log("their fleet out:",fleetsOut);
        var totalFleets = theirFleets.split('>')[2].split(' ')[0].split('/')[1];
        //console.log('tot fleets',totalFleets);
        var fleetCounts = 'Fleets: ' + fleetsOut + '/' + totalFleets;

        var theHTML = '<span>' + fleetCounts + '</span><span style="float:right">';
        theHTML += '<a id="myFleets" href="#">[Toggle]</a></span>';
        toolbarDiv.innerHTML = theHTML;
        $('#fleets_span').before(toolbarDiv);

        var setup = document.getElementById('myFleets');
        setup.addEventListener('click', function (e) {
            doToggleFleets();
        }, false);

        /*

         // No idea why a second button needs to be in it's own div but that's the way it seemed tonight! //TODO:???
         var toolbarDiv2 = document.createElement('div');
         toolbarDiv2.setAttribute('id','myFleets');
         //var theHTML2 = '<span><a id="myTimerButton" href="#">[TRY]</a></span>';
         var theHTML2 = '<span><a id="myTimerButton" href="#">[TRY]</a></span>';
         toolbarDiv2.innerHTML=theHTML2;
         $('#fleets_span').before(toolbarDiv2);

         $('#myTimerButton').click(function() {
         doTryTimer($);
         });

         */

    }
}

function stripCoordsFromPlanetRow($, row) {
    var planet = row.children('td').first();
    var coords = planet.children('div').first().next().find('.coords');
    var theirHTML = coords.html();
    return theirHTML.split('=')[2].split('&')[0]; // for /fleet?current_planet=34287
}

// Test the list of ships and see if there's any part of it that isn't a satellite
// NOTE: works beautifully but isn't used ATM, it's all about recyclers...
function fleetIsSatelliteOnly(shipList) {
    // remove all whitespace:
    shipList = shipList.replace(/\s/g, "");
    // inspect for satellite descriptor
    var div = /<divclass="ship"><spanclass="image"><imgalt="Icon_solar.*?\/div>/;
    div.test(shipList);
    // see if the list contains more than just a satellite

    /* TODO: WebStorm simplied this, I need to ask somebody about syntax
     if (RegExp.leftContext.length === 0 && RegExp.rightContext.length === 0) {
     return true;
     }
     return false;
     */
    return !!(RegExp.leftContext.length === 0 && RegExp.rightContext.length === 0);
}

// Test the list of ships and see if there's a recycler
function fleetHasRecycler(shipList) {
    // remove all whitespace:
    shipList = shipList.replace(/\s/g, "");
    // inspect a recycler descriptor.. easy peasy
    var dionysus = /dionysus_class/; // zagreus too
    var zagreus = /zagreus_class/;
    //console.log("DEBUG Dionysis:",dionysus.test(shipList));
    //console.log("DEBUG Zagreus:",zagreus.test(shipList));
    //console.log("DEBUG RECYCLER: ",dionysus.test(shipList) || zagreus.test(shipList));
    return (dionysus.test(shipList) || zagreus.test(shipList));
}

function sleepNextPlanet($) {
    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?

    // get the next planet to process, shift out the first one, mark it and sleep it, until the list is empty
    var sleepList = JSON.parse(myGMgetValue('autoSleepPlanets', '[]'));
    var sleepPlanet = sleepList.shift();
    if (sleepPlanet != undefined) {
        myGMsetValue('autoSleepPlanets', JSON.stringify(sleepList));
        //console.log("NEXT TO SLEEP:", sleepPlanet[0], sleepPlanet[1], sleepPlanet[2]);

        var logger = new Logger();
        logger.log('d', "Next to sleep=" + sleepPlanet[0] + ' ' + sleepPlanet[1] + ' ' + sleepPlanet[2]);

        // mark each we need to do
        markPlanetsToSave($);

        theName = $('#theirRow' + sleepPlanet[0] + ' > td').children().first().next().children().first();
        theName.html('<font color="yellow">' + sleepPlanet[2] + '</font>');

        // now sleepsave this planet
        do_setupSleep(sleepPlanet[1]); // element 1 is the planet number

    } else {
        emitNotification($, "Done, have a good night!");
        localStorage[universe + '-alreadyCheckedBuildComplete'] = "true";


        localStorage[universe + '-autoSleep'] = "false";

        console.log("HACK botstate return from autosleep");
        var thePlanet = gup('current_planet');
        var activatePlanet = gup('activate_planet');
        if (activatePlanet.length)
            thePlanet = activatePlanet;
        var universe = window.location.href.split('.')[0].split('/')[2];
        localStorage[universe + '-botState'] = "slept";
        // Must get back to fleets... already there if we had ships to send, else this is required.
        window.location.href = '/fleet?current_planet=' + thePlanet;
    }
}

function markPlanetsToSave($) {
    var sleepList = JSON.parse(myGMgetValue('autoSleepPlanets', '[]'));
    var sleepPlanet = sleepList.shift();
    while (sleepPlanet != undefined) {

        theName = $('#theirRow' + sleepPlanet[0] + ' > td').children().first().next().children().first();
        theName.html('<i>' + sleepPlanet[2] + '</i>');

        sleepPlanet = sleepList.shift();
    }

}

// Affect a single button that will cause all fleets to save when it's time to sleep
function doSetupAuto($) {
    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?

    // Process each ship row, add a sleep button... or something :)
    var saveState = [];
    var i = 0;
    while ($('#theirRow' + i).length) {
        //console.log($('#theirRow0').html());
        var p = stripCoordsFromPlanetRow($, $('#theirRow' + i));

        var ships = $('#theirRow' + i).children('td').first().next();
        var shipStr = ships.html();
        shipStr = shipStr.trim();

        // mark each planet that has ships with italics, and save it for processing
        if (shipStr.length > 0 && (fleetHasRecycler(shipStr))) {
            theName = $('#theirRow' + i + ' > td').children().first().next().children().first(); //TODO: really?
            var thisPlanet = [i, p, theName.html()]; // row, planet, name... should be sufficient

            // Discard any old status as we're about to get a new disposition
            localStorage.removeItem(this.universe + '-' + 'techStatus_' + thisPlanet);

            saveState.push(thisPlanet);
            theName.html('<i>' + theName.html() + '</i>');
        }
        i++;
    }
    var logger = new Logger();
    logger.log('d', "sleep list=" + JSON.stringify(saveState));
    myGMsetValue('autoSleepPlanets', JSON.stringify(saveState));

    localStorage[universe + '-autoSleep'] = "true";
    var tomorrowSecs = localStorage[universe + '-secondsUntilTomorrow'];
    logger.log('d', 'Sleep tomorrow seconds=' + tomorrowSecs);

    // sleep the first planet in the list...
    sleepNextPlanet($);
}


// this is inserted Javascript, not user script!
function do_setupSleep(planet) {
    // this cookie shit is hokey as hell                                   TODO: must fix
    document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

    //myGMsetValue('sleep_this_planet','true');                        // TODO: can't simply use GM because javascript...
    window.location.href = '/fleet?current_planet=' + planet;
}

/**
 * When the ships tab is displayed (an ajax event), process that screen...
 */
function displayingShips($) {
    // If we're in auto mode, offer abort and do next, else offer setup

    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?
    var aaa = localStorage[universe + '-autoSleep'];
    var autosleepActive = (aaa === 'true');

    if (!autosleepActive) {
        toolbarAutoSleep($, true);
    } else {
        toolbarAutoSleep($, false);
    }

    // Process each ship row, add a sleep button... or something :)
    var haveWork = false;
    var logger = new Logger();
    var i = -1;
    $('#overview_table > table > tbody  > tr').each(function () {
        if (i > -1) {
            $this = $(this);
            var theirRow = 'theirRow' + i;
            this.setAttribute('id', theirRow);
            //var value = $this.find(".planet").html();
            var value = $this.html();                                         // TODO: value is unused, right?!

            var ships = $this.children('td').first().next();
            var shipStr = ships.html();
            shipStr = shipStr.trim();
            //console.log("r",i,"l",shipStr.length,"s",shipStr);

            //fleetHasRecycler(shipStr); //TODO: wtf is this?! finally turned it off, now just delete...

            if (shipStr.length > 0 && (fleetHasRecycler(shipStr))) {
                haveWork = true;
                var planetNumber = stripCoordsFromPlanetRow($, $this);
                var myButton = '<div id="button" style="float:right">&nbsp;&nbsp;<input onClick="do_setupSleep(' + planetNumber + ');" type="button" value="Sleep this"></div>';

                // inject the button
                var planet = $this.children('td').first();
                var coords = planet.children('div').first().next().find('.coords');
                coords.html(coords.html() + myButton);

                //console.log("DEBUG: WORK", planetNumber);
            }
        }
        i++;
    });
    if (!haveWork) {
        var logger = new Logger();
        logger.log('i', "List is clear");

    }

    // If we're not already in auto-sleep mode, and the state says we're to be performing, go sleep all... or something
    if (!autosleepActive) {
        var universe = window.location.href.split('.')[0].split('/')[2];
        var botState = localStorage[universe + '-botState']; //TODO: when this is an object, all will be well and less of a hack?
        logger.log('d', "Auto setup, state=" + botState);
        if (botState === "sleeping") {
            doSetupAuto($);
        }
    }
}


function do_setAndSleep($) {
    console.log("Should be using objects here too!");
    var s = $('#solar_system').val();
    var p = $('#planet').val();
    var cs = $('#current_planet_solar_system').html();
    var cp = $('#current_planet_position').html();
    var sDist = Math.abs(parseInt(s, 10) - parseInt(cs, 10));
    var pDist = Math.abs(parseInt(p, 10) - parseInt(cp, 10));
    console.log('distance between systems', sDist, 'planets', pDist);
    var sleepDist = 0;
    if (sDist == 0)
        sleepDist = -pDist;
    else
        sleepDist = sDist;

    //sleepSpeed=$('#speed').options[setSleepSpeed.selectedIndex].value; //TODO: Gave up too early on jQuery?
    var speed = document.getElementById("speed");
    var speedOpt = speed.options[speed.selectedIndex].value;

    // When I said shit... really shitty  //TODO: find hackOpt and fix it and get rid of this shitty code
    // I'm tired and need to sleep, rather the point of this exercise... so here's some shit:
    var sleepSpeed;
    if (speedOpt == 10) sleepSpeed = 0;
    if (speedOpt == 9) sleepSpeed = 1;
    if (speedOpt == 8) sleepSpeed = 2;
    if (speedOpt == 7) sleepSpeed = 3;
    if (speedOpt == 6) sleepSpeed = 4;
    if (speedOpt == 5) sleepSpeed = 5;
    if (speedOpt == 4) sleepSpeed = 6;
    if (speedOpt == 3) sleepSpeed = 7;
    if (speedOpt == 2) sleepSpeed = 8;
    if (speedOpt == 1) sleepSpeed = 9;

    console.log('new dist', sleepDist, 'speed', sleepSpeed);
    myGMsetValue("SleepSpeed", sleepSpeed);
    myGMsetValue("SleepDist", sleepDist);
    do_sleepsave(sleepDist, sleepSpeed, true);
}

//TODO: doesn't work because we can't just set the botstate willy-nilly... and I didn't want to kludge one more flag
function do_sleepAllFromFleet($) {
    // I forget just what's going on here... some sort of bad idea?
    console.log("JUST DO IT");

    console.log("HACK just do sleep all");
    var universe = window.location.href.split('.')[0].split('/')[2];

    // Can't just set the bot state, because it is cleared with no matching event...
    //localStorage[universe + '-botState'] = "sleeping";

    localStorage[universe + '-autoSleep'] = 'false';

    // now invoke the AllPlanets function to get us to the ships overview
    displayAllTasks('ships');
}

function doBuildAndSleep($) {
    /**
     * DEVELOP/DEBUG: sets the build state to make more carmanors, then fires the fleets screen...
     *
     * When the shipyard screen is served, the build state tells the shipwright (in Testbed) to
     * build more carmanors.
     */
    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?

    //TODO: when SleepSave is refactored as an object, we won't need to do this part...
    var thePlanet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        thePlanet = activatePlanet;

    console.log("DEBUG build and sleep");
    localStorage[universe + '-build'] = "carmanor";
    window.location.href = "/buildings/shipyard?current_planet=" + thePlanet;

}


/**
 *  Get the number of Carmanor freight ships, return true if sufficient else... we'll want to build some more
 *
 *  updateScreen: display calculated result (so the "enough" test can be called multiple times, all logic on one place)
 **/
function enoughCarms($, updateScreen) {
    var logger = new Logger();

    var carmanors = 0;
    var fleetListHTML = $('.fleet_table> .fleet').html();
    if (typeof fleetListHTML === "string") {
        var fleetList = fleetListHTML.replace(/\s/g, "");
        var carms = fleetList.match(/CarmanorClassCargo.*/);

        if (carms instanceof Array) {

            ////** THIS IS IT ... select one of the indicated ship (for Gaia)
            //var shipID = fleetList.match(/HermesClassProbe.*/)[0].split('_')[2];
            //incrementWidget('ship_quantity_' + shipID, 1, 0, null);
            //console.log("CARMS HTML:",fleetList.match(/HermesClassProbe.*/)[0].split('_')[2]);

            carmanors = parseInt(fleetList.match(/CarmanorClassCargo.*/)[0].split('<')[6].split('>')[1], 10);
        } else {
            console.log("no carms");
        }
    }
    if (carmanors > 0) {
        var available = carmanors * 125000;
        var tot = parseInt($("#max_ore").val(), 10) + parseInt($("#max_crystal").val(), 10) + parseInt($("#max_hydrogen").val(), 10);
        //var loaded = (tot/available*100).toFixed(2);
        var loaded = (tot / available * 100).toFixed(0);
        if (updateScreen) {
            //logger.log('d','Cargo load='+loaded);
            var fleetListOut = fleetListHTML.replace(/Carmanor Class Cargo/g, "Carmanor Class Cargo (" + loaded + "% loaded)");
            $('.fleet_table > .fleet').html(fleetListOut);
        }

        return (loaded < 85);
    } else {
        // if no carms the fleet must be out, so don't build more just now //TODO: how do we get the very first one?!
        return true;
    }
}

// For colonization...
/**
 *  If we have a Gaia, select it so we can colonize...
 *
 *  updateScreen: display calculated result (so the "enough" test can be called multiple times, all logic on one place)
 **/
function haveGaia($) {
    var logger = new Logger();

    var fleetListHTML = $('.fleet_table> .fleet').html();
    if (typeof fleetListHTML === "string") {
        var fleetList = fleetListHTML.replace(/\s/g, "");
        var findGaia = fleetList.match(/GaiaClassColonyShip.*/);
        if (findGaia instanceof Array) {
            console.log("found a Gaia, let's send it!");

            var shipID = fleetList.match(/GaiaClassColonyShip.*/)[0].split('_')[2];
            incrementWidget('ship_quantity_' + shipID, 1, 0, null);

            //console.log("GAIA HTML:",fleetList.match(/HermesClassProbe.*/)[0].split('_')[2]);
        } else {
            console.log("no Gaia");
        }
    }
}



// Incomplete, and now I'm not even sure what I was thinking...
function calculateDurationFromInterval($, interval) {
    var logger = new Logger();
    logger.log('d', 'Calculating duration for interval ' + interval);

    logger.log('d', 'Sleep interval=' + interval);
    targetDist = 0;
    sleepSpeed = 10 - parseInt(interval, 10);
    if (sleepSpeed > 9) {
        logger.log('d', 'Tomorrow, always tomorrow');
        var sleepPicks = generateSleepPicks();

        var morningPick = 0;
        for (var k = 0; k < sleepPicks.length; k++) {
            morningPick = sleepPicks[k];
            console.log("TOMORROW ", sleepPicks[k], sleepPicks[k].split(':')[0]);
            if (sleepPicks[k].split(':')[0] == 4) {
                break;
            }
        }
        logger.log('d', 'Tomorrow return=' + morningPick);


        var opts = morningPick.split("~")[1];
        console.log("  opts=" + opts);
        var speedOpt = opts.split(";")[0];

        // I'm tired and need to sleep, rather the point of this exercise... so here's some shit:
        var sleepSpeed;
        if (speedOpt == 10) sleepSpeed = 0;
        if (speedOpt == 9) sleepSpeed = 1;
        if (speedOpt == 8) sleepSpeed = 2;
        if (speedOpt == 7) sleepSpeed = 3;
        if (speedOpt == 6) sleepSpeed = 4;
        if (speedOpt == 5) sleepSpeed = 5;
        if (speedOpt == 4) sleepSpeed = 6;
        if (speedOpt == 3) sleepSpeed = 7;
        if (speedOpt == 2) sleepSpeed = 8;
        if (speedOpt == 1) sleepSpeed = 9;

        var distOpt = opts.split(";")[1].split("(")[0];
        //console.log("PICK TIME: speedOpt=" + speedOpt + " sleepSpeed=" + sleepSpeed + " dist=" + distOpt);
        console.log("Selected speed=" + sleepSpeed + " dist=" + distOpt);


        targetDist = distOpt;

    }


    // would use object variables except this isn't an object
    var result = [7, 9];
    return result;

}


function initSleepsave($, manual) {
    var logger = new Logger();
    var fleetListHTML = $('.fleet_table> .fleet').html();
    if (typeof fleetListHTML !== "string" && !manual) {
        logger.log('e', "No ships!");
        doAutoAbort($);
    }

    // Distance: negative is # of planets away, positive is # of systems away, 0 is the home planet
    var targetDist = myGMgetValue('SleepDist', 1);
    // Speed: 0=100% 9=10%
    var sleepSpeed = myGMgetValue("SleepSpeed", 1);

    //console.log("HARDCODE DIST");
    //var targetDist=20;
    //var sleepSpeed=8;

    //console.log("DEBUG: sleep options dist", targetDist, "speed", sleepSpeed);

    if (manual) {
        var sleepPicks = generateSleepPicks();

        // Dupe code, but options screen is dumb so this is good //TODO: kill options, or fix dupe...
        var myHTML = 'Return time:&nbsp;';
        myHTML += '<select id="setPickTime" name="pickTime">';

        for (i = 0; i < sleepPicks.length; i++) {
            myHTML += '<option value="' + sleepPicks[i] + '">' + sleepPicks[i] + '</option>';
        }
        myHTML += '</select>&nbsp;';

        // replace the offer to buy a commander, with our button to execute the sleepsave manually...
        // NOTE: if the fleet is not in, this does nothing, because there's no notice to replace
        var buttonDiv = $('#hydro_commander_notice');
        if (buttonDiv.length) {
            buttonDiv.html('<div id="button" style="float:right">&nbsp;&nbsp;' +
                myHTML +
                '<input id="justDoIt" type="button" value="Just Do It">' +
                '<input id="buildAndSleep" type="button" value="Build & Sleep">' +
                '<input id="setAndSleep" type="button" value="Set & Sleep">' +
                '<input onClick="do_sleepsave(' + targetDist + ',' + sleepSpeed + ',true);"' +
                'type="button" value="Sleep!"></div>');

            $('#justDoIt').click(function () {
                do_sleepAllFromFleet($);
            });

            $('#setAndSleep').click(function () {
                do_setAndSleep($);
            });
            $('#buildAndSleep').click(function () {
                doBuildAndSleep($);
            });
            document.getElementById('setPickTime').addEventListener(
                'change',
                function () {
                    doSetField('setPickTime');
                },
                false
            );
        }


    } else {
        //TODO: when SleepSave is refactored as an object, we won't need to do this...
        var universe = window.location.href.split('.')[0].split('/')[2];
        var thePlanet = gup('current_planet');
        var activatePlanet = gup('activate_planet');
        if (activatePlanet.length)
            thePlanet = activatePlanet;

        // Be sure we have enough cargo, then send those ships out and sleep
        var enough = enoughCarms($, false);
        var didShipBuilder = localStorage[this.universe + '-didShipBuilder'];

        if (!enough && (typeof didShipBuilder == 'undefined')) {
            // This "one time only" logic was hard to place!
            localStorage[this.universe + '-didShipBuilder'] = 'only once per planet';

            logger.log('d', 'Must build more cargo');

            // restore the cookie so we'll come back and try again, then go do the build...
            document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

            // get some built, go to the shipyard page, the shipwright will send us back here (via fleets)...
            localStorage[universe + '-build'] = "carmanor";
            window.location.href = "/buildings/shipyard?current_planet=" + thePlanet;
        } else {

            // Cargo is handled, let's see about upgrading our buildings...

            //console.log("SKIP Builder...");localStorage[universe + '-goalieCounter'] = 'debugger-skip builder';
            var goalie = new Goalie($);
            var theGoal = goalie.getGoal(logger);
            var costed = goalie.goalCosted($, logger);
            var canAfford = goalie.checkResources($,logger);

            logger.log('d','Build goal='+theGoal);

            // The way this part was originally coded, we'd go on and on with tasks and screens. Instead:
            // Do ONE thing toward the goal, and then send the fleet.
            if (typeof localStorage[universe + '-goalieCounter'] !== 'undefined') {
                localStorage.removeItem(this.universe + '-didShipBuilder');
                localStorage.removeItem(universe + '-goalieCounter');
                localStorage.removeItem(universe + '-goalieActive');
                doAutoSleep($, thePlanet, targetDist, sleepSpeed);
            } else if (theGoal == "Undetermined") {
                logger.log('d', 'Goal task: get new goal');
                localStorage[universe + '-goalieActive'] = 'get a goal';
                localStorage[universe + '-goalieCounter'] = 'did goalie';

                // restore the cookie so we'll come back and try again, then go check Tech...
                // TODO: the next less-kludgy thing is to make this a local storage flag not a cookie
                document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

                window.location.href = "/technology?current_planet=" + thePlanet;

            } else if (!costed) {
                logger.log('d', 'Goal task: get costs for goal');
                localStorage[universe + '-goalieActive'] = 'get goal costs';
                localStorage[universe + '-goalieCounter'] = 'did goalie';

                // restore the cookie so we'll come back and try again, then go find the costs...
                document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

                window.location.href = "/buildings/home?current_planet=" + thePlanet;

            } else if (canAfford) {
                logger.log('d', 'Ready to build!');
                localStorage[universe + '-goalieActive'] = 1;
                localStorage[universe + '-goalieCounter'] = 'did goalie';

                // restore the cookie so we'll come back and try again, then go start the build...
                document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

                window.location.href = "/buildings/home?current_planet=" + thePlanet;
            } else if (theGoal == "UpgradeInProgress" &&
                typeof localStorage[universe + '-alreadyCheckedBuildComplete'] === 'undefined') {
                logger.log('d', 'Check if build is complete');

                localStorage[universe + '-goalieActive'] = 1;
                localStorage[universe + '-goalieCounter'] = 'did goalie';

                // restore the cookie so we'll come back and try again, then go start the build...
                document.cookie = 'set_sleep_cookie=crappyCookieIsSet;path=/';

                window.location.href = "/buildings/home?current_planet=" + thePlanet;
            } else {
                localStorage.removeItem(this.universe + '-didShipBuilder');
                localStorage.removeItem(universe + '-goalieCounter');
                localStorage.removeItem(universe + '-goalieActive');
                doAutoSleep($, thePlanet, targetDist, sleepSpeed);
            }
        }
    }
}

/**
 * Finally, do the sleepsave for this planet... this located nicely above until I needed a branch for cargo build
 *
 * @param $             jQuery
 * @param thePlanet     the current planet
 * @param targetDist    distance to travel
 * @param sleepSpeed    speed
 */
function doAutoSleep($, thePlanet, targetDist, sleepSpeed) {
    var logger = new Logger();
    var universe = window.location.href.split('.')[0].split('/')[2];  //TODO: when this is an object, all will be well and less of a hack?

    // Be sure to save some sort of status... it will likely either be in-process, or a building cost.
    var goalStatus = localStorage[universe + '-' + 'tech_' + thePlanet];
    localStorage[universe + '-' + 'techStatus_' + thePlanet] = goalStatus;
    // Now the point of this part, update the status with the unmet resource totals
    var goalie = new Goalie($);
    goalie.checkResources($,logger);

    logger.log('d', ">> Autosleep " + thePlanet);

    var speedField = document.getElementById('speed');
    console.log("HAVE SHIPS? test more...");
    if (speedField === null) { //TODO: got lazy here, null test always bad, fix
        logger.log('e', "ERROR no ships");
    }

    // We're performing a sleepsave, add a flag to the screen (for our fleet buttons widget function)
    /**
     * DEV NOTE: here's one way to manage communication between scripts, adding a hidden element...
     */
    var sleepFlag = document.createElement("div");
    //sleepFlag.setAttribute('style', 'display:none;'); //TODO: actually hide it
    sleepFlag.setAttribute('id', 'SFCA_sleep');
    //sleepFlag.setAttribute('class', 'hidden');
    sleepFlag.innerHTML = 'SFCA sleep flag';
    $('#current_planet_type').after(sleepFlag);


    var interval = localStorage[universe + '-fleetInterval'];
    if (typeof interval === 'undefined') {
        logger.log('w', 'WARN: no interval, must punt');
    } else {
        // As soon as it's ready, use this function:

        // var result = calculateDurationFromInterval($,interval);

        // sleepSpeed = result[0];
        // targetDist = result[1];
        // logger.log('d',"DEBUG calculated speed="+sleepSpeed+" distance="+targetDist);

        // <INSTEAD OF this:>

        logger.log('d', 'Sleep interval=' + interval);
        //sleepSpeed = 10 - parseInt(interval, 10);
        var theInterval = parseInt(interval, 10);
        if (theInterval > 9) {
            logger.log('d', 'Tomorrow, always tomorrow');
            var tomorrowSecs = localStorage[universe + '-secondsUntilTomorrow'];
            logger.log('d', 'Target secs=' + tomorrowSecs);
            if (typeof tomorrowSecs === 'undefined') {
                logger.log('w', 'There is no tomorrow');
            } else {

                var sleepPicks = generateSleepPicks();

                var morningPick = 0;
                for (var k = 0; k < sleepPicks.length; k++) {
                    morningPick = sleepPicks[k];
                    var sleepSecs = parseInt(morningPick.split("/")[1].split("~")[0], 10);
                    console.log("TOMORROW ", sleepPicks[k], sleepSecs);

                    if (sleepSecs > tomorrowSecs) {
                        break;
                    }
                }
                logger.log('d', 'Tomorrow return=' + morningPick);


                var opts = morningPick.split("~")[1];
                console.log("  opts=" + opts);
                var speedOpt = opts.split(";")[0];

                // I'm tired and need to sleep, rather the point of this exercise... so here's some shit:

                //sleepSpeed = 10 - speedOpt //TODO or something, fix this shitty code

                if (speedOpt == 10) sleepSpeed = 0;
                if (speedOpt == 9) sleepSpeed = 1;
                if (speedOpt == 8) sleepSpeed = 2;
                if (speedOpt == 7) sleepSpeed = 3;
                if (speedOpt == 6) sleepSpeed = 4;
                if (speedOpt == 5) sleepSpeed = 5;
                if (speedOpt == 4) sleepSpeed = 6;
                if (speedOpt == 3) sleepSpeed = 7;
                if (speedOpt == 2) sleepSpeed = 8;
                if (speedOpt == 1) sleepSpeed = 9;

                var distOpt = opts.split(";")[1].split("(")[0];
                //console.log("PICK TIME: speedOpt=" + speedOpt + " sleepSpeed=" + sleepSpeed + " dist=" + distOpt);

                targetDist = distOpt;
            }

        }
        // </INSTEAD>
    }

    logger.log('d', 'Sleepsave fires, speed=' + sleepSpeed + ' dist=' + targetDist);

    //console.log("DEBUG SKIP SLEEP");
    //return;

    do_sleepsave(targetDist, sleepSpeed, false);
}

// this is injected into the page, it's NOT userscript!
function do_sleepsave(targetDist, sleepSpeed, manual) {
    //console.log('DEBUG: Sleeping d', targetDist,'s', sleepSpeed);

    select_all_ships();

    try {
        var speedField = document.getElementById('speed');
        speedField.selectedIndex = sleepSpeed;
        speedField.options[sleepSpeed].selected = true
    } catch (err) {
        alert("No ships!");
        return false;
    }

    oFormObject = document.forms[1];

    //oFormObject.elements['solar_system'].value = 8;

    var cs = parseInt(get_inner_html('current_planet_solar_system'), 10);
    var cp = parseInt(get_inner_html('current_planet_position'), 10);
    var td = parseInt(targetDist, 10);
    var targetPlanet = 0;
    var targetSystem = 0;
    if (td > 0) {
        targetSystem = cs - td;
        if (targetSystem < 1) {
            targetSystem = cs + td;
        }
        oFormObject.elements['solar_system'].value = targetSystem;
    } else { //TODO: seems solid now, the alerts surely just lame cruft
        //alert("DEBUG Target distance="+td+" current=" + get_inner_html('current_planet_position'));
        targetPlanet = cp + td;
        //alert("DEBUG first try=" + targetPlanet);
        if (targetPlanet < 1) {
            targetPlanet = cp - td;
            //alert("DEBUG second, final answer=" + targetPlanet);
        }
        oFormObject.elements['planet'].value = targetPlanet;
    }


    // Click the radio to set the harvest option
    document.getElementById('mission_option_harvest').click();

    //2015: No clue what this was needed in 2010?
    update_fleet_info();
    select_max_cargo('ore');
    select_max_cargo('crystal');
    select_max_cargo('hydrogen');


    // Also compute the total cargo capacity of the ships on this planet

    /*
     <div class="ship_selector">
     <div class="max">
     <input onclick="assign_max_ships('ship_quantity_676893046');;" type="button" value="Max">
     </div>

     <div class="quantity">
     <div class="increment_widget">
     <a class="left_button" href="#" onclick="incrementWidget('ship_quantity_676893046', -1, 0, null); return false;"><img alt="<" src="/images/starfleet/layout/left_arrow.png?1439250916"></a>


     <input autocomplete="off" class="ship_quantity" id="ship_quantity_676893046" name="ship_quantities[676893046]" onclick="select_field('ship_quantity_676893046');" type="text" value="0">

     <a class="right_button" href="#" onclick="incrementWidget('ship_quantity_676893046', 1, 0, null); return false;"><img alt=">" src="/images/starfleet/layout/right_arrow.png?1439250916"></a>

     <div class="clear"></div>
     </div>

     </div>

     <div id="ship_quantity_676893046_group_defend_cost" class="hidden">
     1.0
     </div>
     <div id="ship_quantity_676893046_cargo_capacity" class="hidden">
     5000
     </div>
     <div id="ship_quantity_676893046_speed" class="hidden">
     20000
     </div>
     <div id="ship_quantity_676893046_fuel_consumption" class="hidden">
     20.0
     </div>
     <div id="ship_quantity_676893046_key" class="hidden">atlas_class</div>
     </div>
     */

    // Now let's see how it turned out... first, sum the outbound res+hydro cost to ship
    var spentH = document.getElementById('task_consumption').innerHTML;
    var savedO = $F('send_ore');
    var savedC = $F('send_crystal');
    var savedH = $F('send_hydrogen');
    var tot = parseInt(savedO, 10) + parseInt(savedC, 10) + parseInt(savedH, 10) + parseInt(spentH, 10);
    // ... and the quantity needing to be shipped
    var availableOre = $F('max_ore');
    var availableCrystal = $F('max_crystal');
    var availableHydrogen = $F('max_hydrogen');
    var avail = parseInt(availableOre, 10) + parseInt(availableCrystal, 10) + parseInt(availableHydrogen, 10);

    diff = avail - tot;
    if (diff > 0) { //TODO: refactor
        if (manual) {
            alert("Need to spend " + diff);
        } else {
            console.log("SLEEPSAVE AUTO: INSUFFICIENT!");
            document.cookie = 'set_didSleep=true;path=/';
            localStorage['YES'] = "surely";
            document.getElementById('assign_button').click(); // click launch and go back to the fleets screen
        }
    } else {
        if (manual) {
            if (confirm("Ready to sleep?") == true) {
                document.getElementById('assign_button').click();
            }
        } else {
            document.cookie = 'set_didSleep=true;path=/';
            localStorage['YES'] = "indeed";
            document.getElementById('assign_button').click();
        }
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////// old ///////////////////////////
// Sort by travel time, that's the order we like to select by...
function sortSleepPicksByTravelTime(sleepPicks) {
    /**
     // this insertion sort works fine, but of course is slow...
     var swapIt;
     for (var i = 1; i < sleepPicks.length; i++) {
        //myLog("PICK: " + i + " percent=" + sleepPicks[i].split("/")[1].split(";")[0]);
        var j = i;
        while (j > 0) {
            //var key1 = parseInt(sleepPicks[j].split("/"),10);
            //var key2 = parseInt(sleepPicks[j-1].split("/"),10);
            var key1 = parseInt(sleepPicks[j].split("/")[1].split("~")[0], 10);
            var key2 = parseInt(sleepPicks[j - 1].split("/")[1].split("~")[0], 10);
            if (key1 < key2) {
                swapIt = sleepPicks[j];
                sleepPicks[j] = sleepPicks[j - 1];
                sleepPicks[j - 1] = swapIt;
            }
            j--;
        }
    }
     **/




    sleepPicks.sort(function (a, b) {
        //console.log("A",a,"B",b);
        var keyA = parseInt(a.split("/")[1].split("~")[0], 10);
        var keyB = parseInt(b.split("/")[1].split("~")[0], 10);

        if (keyA > keyB) return 1;
        if (keyA < keyB) return -1;
        return 0;
    });


    return sleepPicks;
}

// Sort by return time and percentage, cull any duplicates
function sortSleepPicksByReturnAndPercentage(sleepPicks) {

    /**
     var swapIt;
     var speed1, key1;
     for (var i = 1; i < sleepPicks.length; i++) {
        //console.log("DEBUG Insertion sort", sleepPicks[i]);
        var j = i;
        while (j > 0) {
            speed1 = parseInt(sleepPicks[j].split("~")[1].split(";")[0], 10);
            var speed2 = parseInt(sleepPicks[j - 1].split("~")[1].split(";")[0], 10);
            key1 = parseInt(sleepPicks[j].split("/"), 10);
            var key2 = parseInt(sleepPicks[j - 1].split("/"), 10);
            if ((key1 < key2) || (key1 == key2 && speed1 < speed2)) {
                swapIt = sleepPicks[j];
                sleepPicks[j] = sleepPicks[j - 1];
                sleepPicks[j - 1] = swapIt;
            }
            j--;
        }
    }
     **/


    sleepPicks.sort(function (a, b) {
        //console.log("A",a,"B",b);
        var speedA = parseInt(a.split("~")[1].split(";")[0], 10);
        var speedB = parseInt(b.split("~")[1].split(";")[0], 10);
        var keyA = parseInt(a.split("/"), 10);
        var keyB = parseInt(b.split("/"), 10);

        if (keyA > keyB || keyA == keyB && speedA > speedB) return 1;
        if (keyA < keyB || keyA == keyB && speedA < speedB) return -1;
        return 0;
    });


//    for (var k=0;k<sleepPicks.length;k++) {
//        console.log("SORT ", sleepPicks[k]);
//    }


    // cull duplicates
    var dupeCount = 0;
    var newList = [];
    var prevKey = -999;
    var prevSpeed = -999;
    for (var i = 0; i < sleepPicks.length; i++) {
        speed1 = parseInt(sleepPicks[i].split("~")[1].split(";")[0], 10);
        key1 = parseInt(sleepPicks[i].split("/"), 10);
        //console.log("DEBUG Consider", sleepPicks[i], speed1, key1);
        if (speed1 == prevSpeed && key1 == prevKey) {
//            if (speed1 === '-10') {
//            console.log("Skip dupe", speed1, key1);
            dupeCount++;
//            }
        } else {
            if (speed1 === '-10') {
//                console.log("Notdupe", speed1, sleepPicks[i]);
            }
            newList[newList.length] = sleepPicks[i];
            prevKey = key1;
            prevSpeed = speed1;
        }
    }
//    console.log("DEBUG dupes=",dupeCount);


    // get best
    var bestList = [];
    prevKey = 0;
    for (var i = 0; i < newList.length; i++) {
        var key1 = parseInt(newList[i].split("/"), 10);
        if (key1 == prevKey) {
            //console.log("DEBUG Dupe, skip",newList[i]);
            //bestList[bestList.length] = newList[i] + "*";
        } else {
            bestList[bestList.length] = newList[i];
            prevKey = key1;
        }
    }

    return bestList;
}
function addTwoTimes(t1, t2, bDoubleT1) {
    if (t1 == "-")
        return ("-");
    //myLog("INPUT: t1 " + t1 + " t2 " + t2);
    //t2 = "22:02:02";

    var t1Hours = parseInt(t1.split(':')[0], 10);
    var t1Minutes = parseInt(t1.split(':')[1], 10);
    var t1Seconds = parseInt(t1.split(':')[2], 10);
    var t2Hours = parseInt(t2.split(':')[0], 10);
    var t2Minutes = parseInt(t2.split(':')[1], 10);
    var t2Seconds = parseInt(t2.split(':')[2], 10);
    result = ((t1Hours + t2Hours) * 3600) + ((t1Minutes + t2Minutes) * 60) + (t1Seconds + t2Seconds);
    if (bDoubleT1)
        result = result + ( t1Hours * 3600 ) + ( t1Minutes * 60 ) + t1Seconds;
    //myLog("RESULT: " + result);
    var h = Math.floor(result / 3600);
    if (h > 23) {
        h = h - 24;
        result = result - (24 * 3600);
    }
    var m = Math.floor((result - (h * 3600)) / 60);
    var s = Math.floor((result - (h * 3600) - (m * 60)));
    //myLog("RESULTTIME: " + h + ":" + m + ":" + s);
    if (m < 10)
        m = "0" + m;
    if (s < 10)
        s = "0" + s;
    return (h + ":" + m + ":" + s);

    return result;
}


// CRIB THEIR FUNCTIONS
// from their function update_distance()
function my_calc_distance(p, ss, g, tar_p, tar_ss, tar_g) {
    var distance = 0;
    /*
     var p = get_inner_html('current_planet_position');
     var ss = get_inner_html('current_planet_solar_system');
     var g = get_inner_html('current_planet_galaxy');

     var tar_p = get_value('planet');
     var tar_ss = get_value('solar_system');
     var tar_g = get_value('galaxy');
     */

    if (p == tar_p && ss == tar_ss && g == tar_g) {
        distance = 5
    }
    else if (ss == tar_ss && g == tar_g) {
        distance = 1000 + Math.abs(p - tar_p) * 5
    }
    else if (g == tar_g) {
        distance = 2700 + Math.abs(ss - tar_ss) * 95
    }
    else {
        distance = Math.abs(g - tar_g) * 20000
    }

    //  $('task_distance').innerHTML = distance;
    //myLog("Distance from [" + g + ":" + ss + ":" + p + "] to [" + tar_g + ":" + tar_ss + ":" + tar_p + "] is " + distance);
    return distance;
}

/**
 * Coded in 2010 and with sparse comments
 */
function generateSleepPicks() {

    //2015 analysis begins with seeing the date came in as a closure... was it UTC or local?
    var myDate = new Date();
    //var myHours = myDate.getUTCHours();
    //var myMinutes = myDate.getUTCMinutes();
    //var mySeconds = myDate.getUTCSeconds();
    //var myHours = myDate.getHours();
    //var myMinutes = myDate.getMinutes();
    //var mySeconds = myDate.getSeconds();

    var dionysusSpeed = 4800;

    // Determine all (good?) travel distances
    var sleepPicks = [];
    var speed, dist, duration, distCalc;
    var universe_speed = 1350; // the app gets this from a hidden field, I should too probably //todo fix


    // the times to other systems?
    for (speed = 1; speed < 11; speed++) {
        //for (dist = 1; dist < 25; dist++) {
        for (dist = 1; dist < 40; dist++) {
            distCalc = my_calc_distance(1, 1, 1, 1, dist + 1, 1);
            duration = Math.ceil((35000.0 / speed) * Math.sqrt((distCalc * 10) / dionysusSpeed) + 10); // seconds to target

            // out and back
            duration = duration * 2;

            // double-speed universe!!
            duration *= universe_speed / 3600.0;


            if (duration < 84600) {
                //console.log("system pick", speed, dist);
                sleepPicks[sleepPicks.length] = duration + "/" + speed + ";" + dist;
            }
        }
    }


    // the times to other planets in local system?
    for (speed = 1; speed < 11; speed++) {
        for (dist = 0; dist < 8; dist++) {
            distCalc = my_calc_distance(1, 1, 1, 1 + dist, 1, 1);
            duration = Math.ceil((35000.0 / speed) * Math.sqrt((distCalc * 10) / dionysusSpeed) + 10); // seconds to target
            duration = duration * 2;

            // double-speed universe!!
            duration *= universe_speed / 3600.0;

            if (duration < 84600) {
                //console.log("planet pick", duration, speed, dist);
                sleepPicks[sleepPicks.length] = duration + "/" + speed + ";-" + dist;
            }
        }
    }


    var minute_duration, second_duration, h, m;
    for (var i = 0; i < sleepPicks.length; i++) {
        duration = parseInt(sleepPicks[i].split("/"), 10);

        h = Math.floor(duration / 3600);
        minute_duration = duration - h * 3600;

        m = Math.floor(minute_duration / 60);
        if (m < 10)
            m = "0" + m;
        second_duration = minute_duration - m * 60;
        if (second_duration < 10)
            second_duration = "0" + second_duration;

        sleepPicks[i] = sleepPicks[i] + "(" + h + ":" + m + ":" + second_duration + ")";
    }


    // We've got all the possibilities, now round and make them into times
    var myHours = myDate.getHours();
    var myMinutes = myDate.getMinutes();
    var mySeconds = myDate.getSeconds();

    var nowMinutes = parseInt(myMinutes / 5, 10) * 5;

    var timeDuration;

    var roundIt = 5;
    var roundSecs = (24 * 60) / roundIt;
    var dur1, dur2, dur3;

    for (i = 0; i < sleepPicks.length; i++) {
        //console.log("pick it: " + sleepPicks[i]);
        var durationRaw = parseInt(sleepPicks[i].split("/"), 10);


        dur1 = durationRaw / 84600 * roundSecs;
        dur2 = Math.round(dur1);
        dur3 = dur2 / roundSecs;
        duration = dur3 * (24 * 60 * 60);


        // No clue what that calc did, and it's just wrong!! //TODO: this is the WTF that I have been looking for
        //duration = durationRaw;

        h = Math.floor(duration / 3600);
        minute_duration = duration - h * 3600;

        m = Math.floor(minute_duration / 60);
        if (m < 10)
            m = "0" + m;
        second_duration = minute_duration - m * 60;
        if (second_duration < 10)
            second_duration = "0" + second_duration;

        timeDuration = h + ":" + m + ":" + second_duration;

        //console.log("ADDING: in=" +durationRaw +" dur=" + duration + " out=" + timeDuration);
        var result1 = addTwoTimes(timeDuration, myDate.getHours() + ":" + nowMinutes + ":" + myDate.getSeconds(), false);

        // Now we have the time we need, but make it back into seconds
        var result2 = parseInt(result1.split(":")[0], 10) * 3600 + parseInt(result1.split(":")[1], 10) * 60 + parseInt(result1.split(":")[2], 10);
        var pickAsTime = result2 + "/" + durationRaw + "~" + sleepPicks[i].split("/")[1];
        //console.log("RESULT in=" + sleepPicks[i] + " result1=" + result1 + " out=" + result2);
        //console.log("ASTIME in=" + sleepPicks[i] + " out=" + pickAsTime);
        sleepPicks[i] = pickAsTime;
    }

    sleepPicks = sortSleepPicksByReturnAndPercentage(sleepPicks);
    for (var i = 0; i < sleepPicks.length; i++) {
        //myLog("SORTEDPICK: " + sleepPicks[i]);
    }
    sleepPicks = sortSleepPicksByTravelTime(sleepPicks);

//    for (var k = 0; k < sleepPicks.length; k++) {
//        console.log("SORT ", sleepPicks[k]);
//    }


    // Now make the seconds into hh:mm and we're good
    for (var i = 0; i < sleepPicks.length; i++) {
        duration = parseInt(sleepPicks[i].split("/"), 10);

        var h = Math.floor(duration / 3600);
        minute_duration = duration - h * 3600;
        var m = Math.floor(minute_duration / 60);
        if (m < 10)
            m = "0" + m;
        second_duration = minute_duration - m * 60;
        if (second_duration < 10)
            second_duration = "0" + second_duration;
        timeDuration = h + ":" + m + ":" + second_duration;

        // FORMAT appears to be [Fleet Return Time]/[Raw Duration Debug]~[Speed];[Distance]([Travel Time])
        //  if distance is negative it means the number of planets away in current system, else number of systems to travel
        sleepPicks[i] = timeDuration + "/" + sleepPicks[i].split("/")[1];
    }
    return sleepPicks;
}


function getOptionsHTML() {
    var sleepPicks = generateSleepPicks();

    /*
     var activePlayerAlert = myGMgetValue('AlertActive', false);
     var longInactiveAlert = myGMgetValue('AlertLongInactive', false);
     var minimumRankToAlert = myGMgetValue('AlertMinRank', 999999);
     var alertEveryInactiveDiplomat = myGMgetValue('AlertIND', false);
     var alertInHeader = myGMgetValue('AlertHeader', true);
     var reProbeCount = myGMgetValue('ReProbeCount', 1);
     var theirCount = document.getElementById("current_user_default_espionage_amount").value;
     if (theirCount == "")
     theirCount=1;
     //myLog("Our count = " + reProbeCount + " theirs=" + theirCount);
     reProbeCount=theirCount;
     myGMsetValue('ReProbeCount', reProbeCount);
     var optSleepDist = myGMgetValue('SleepDist', 1);
     var optSleepSpeed = myGMgetValue('SleepSpeed', 1);
     var optSideHeader = GM_getValue('SideHeader', 0);
     var loudKlaxonURL = GM_getValue('LoudKlaxonURL', 'http://www.bitblaster.com/downloadMyCoolioScripts/supportLib/384280_SOUNDDOGS__to.mp3');
     var quietKlaxonURL = GM_getValue('QuietKlaxonURL', 'http://www.bitblaster.com/downloadMyCoolioScripts/supportLib/15788__beatbed__long_gone_siren.mp3');

     //if (quietKlaxonURL.length == 0)
     //   quietKlaxonURL = 'http://www.bitblaster.com/downloadMyCoolioScripts/supportLib/phone-calling-1.mp3';

     var loudKlaxonLoop = GM_getValue('LoudKlaxonLoop', false);
     var quietKlaxonLoop = GM_getValue('QuietKlaxonLoop', false);

     activePlayerAlert = (activePlayerAlert?'Yes':'No');
     longInactiveAlert = (longInactiveAlert?'Yes':'No');
     alertEveryInactiveDiplomat = (alertEveryInactiveDiplomat?'Yes':'No');
     alertInHeader = (alertInHeader?'Yes':'No');

     var alertRankSetting = 'Minimum ranking for alert: <a href="#" id="setAlertMinRank">{' + minimumRankToAlert + '}</a>';
     var alertActivitySetting = 'Alert on active players: <a href="#" id="setAlertActivity">{' + activePlayerAlert + '}</a>';
     var alertLongInactiveSetting = 'Alert on long-inactive players (I and i): <a href="#" id="setAlertLongInactive">{' + longInactiveAlert + '}</a>';
     var alertIndSetting  = 'Alert for every inactive diplomat regardless of rank: <a href="#" id="setAlertIND">{' + alertEveryInactiveDiplomat + '}</a>';
     var alertHeaderSetting  = 'Display alert message at top of page: <a href="#" id="setAlertHeader">{' + alertInHeader + '}</a>';
     var reProbeSetting  = 'How many probes to send on repeat espionage: ' + reProbeCount + '<br>(UPDATED: we use the game\'s count now, enable default and set value below)';

     var klaxonURLSetting_loud = 'Loud Klaxon URL: <input id="loudURL" size=65 value="' + loudKlaxonURL + '">&nbsp;<input id="loudBtn" type="submit" value="Set">';
     var klaxonLoop_loud = '&nbsp;Loop: ';
     klaxonLoop_loud += '<input id="loop_loud_checkbox" type="checkbox"';
     if (loudKlaxonLoop)
     klaxonLoop_loud += ' checked ';
     klaxonLoop_loud += ' />';
     var klaxonURLSetting_quiet = 'Quiet Klaxon URL: <input id="quietURL" size=65 value="' + quietKlaxonURL + '">&nbsp;<input id="quietBtn" type="submit" value="Set">';
     var klaxonLoop_quiet = '&nbsp;Loop: ';
     klaxonLoop_quiet += '<input id="loop_quiet_checkbox" type="checkbox"';
     if (quietKlaxonLoop)
     klaxonLoop_quiet += ' checked ';
     klaxonLoop_quiet += ' />';
     var klaxonSimulatedAttack = 'Test Klaxon Settings: <input id="simulateAttack" type="submit" value="Launch Attack Simulation">';

     var set_SideHeader  = 'Enable Side Header: ';
     set_SideHeader += '<input class="SetSideHeader_checkbox" id="set_SideHeader_checkbox" type="checkbox"';
     if (optSideHeader == 1)
     set_SideHeader += ' checked ';
     set_SideHeader += ' />';
     */

    var optSleepDist = myGMgetValue('SleepDist', 1);
    var optSleepSpeed = myGMgetValue('SleepSpeed', 1);
    var set_SleepDist = 'How far to travel for fleet/res save auto-setup option: <a href="#" id="setSleepDist">{' + optSleepDist + '}</a>';
    var set_SleepSpeed = 'How fast to travel for fleet/res save auto-setup option:';
    set_SleepSpeed += '&nbsp;<select id="setSleepSpeed" name="speed">';

    var hackOpt = 0;
    for (var k = 10; k > 0; k--) {
        set_SleepSpeed += '<option ';
        if (hackOpt == optSleepSpeed)
            set_SleepSpeed += ' selected ';
        set_SleepSpeed += 'value="' + hackOpt + '">' + k + '0%</option>';
        hackOpt++;
    }
    set_SleepSpeed += '</select>';


    var prefsBox = document.createElement('div');
    var myHTML = '<div class="myPrefs">';

    /*
     myHTML +=   '<p>' + alertRankSetting + '</p>';
     myHTML +=   '<p>' + alertActivitySetting + '</p>';
     myHTML +=   '<p>' + alertLongInactiveSetting + '</p>';
     myHTML +=   '<p>' + alertIndSetting + '</p>';
     myHTML +=   '<p>' + alertHeaderSetting + '</p>';
     myHTML +=   '<span id="reProbeSetting"><p>' + reProbeSetting + '</p></span>';
     */

    myHTML += '<span id="setSleepDist"><p>' + set_SleepDist + '</p></span>';
    myHTML += '<span><p>' + set_SleepSpeed + '</p></span>';
    myHTML += '<span><p>Pick-A-Time for fleet/res save auto-setup option:&nbsp;';
    myHTML += '<select id="setPickTime" name="pickTime">';

    for (i = 0; i < sleepPicks.length; i++) {

        //2015: looks like this was all obsolete...
        //
        //var durationRaw = String(sleepPicks[i].split("/"));
        //myLog("SIGH: " +durationRaw);
        //var nowMinutes = myDate.getMinutes();
        //nowMinutes = parseInt(nowMinutes/5,10) * 5;
        //myLog("MINUTES duration: " + m + " now down: " + nowMinutes);
        //var result1 = addTwoTimes(timeDuration, myDate.getHours() + ":" + nowMinutes + ":" + myDate.getSeconds(), false);
        //
        //var displayPickPercent = sleepPicks[i].split("/")[1].split(";")[0] + "0%";
        //myHTML +=   '<option value="' + sleepPicks[i] + '">' + durationRaw.split(":")[0] + ":" + durationRaw.split(":")[1] + " - " + displayPickPercent + '</option>';

        myHTML += '<option value="' + sleepPicks[i] + '">' + sleepPicks[i] + '</option>';

    }
    myHTML += '</select>';
    myHTML += '</p></span>';

    /*
     myHTML +=   '<span id="setSideHeader"><p>' + set_SideHeader + '</p></span>';
     myHTML +=   '<span><p>' + klaxonURLSetting_loud;
     myHTML +=   klaxonLoop_loud + '</p></span>';
     myHTML +=   '<span><p>' + klaxonURLSetting_quiet;
     myHTML +=   klaxonLoop_quiet + '</p></span>';
     myHTML +=   '<span><p>' + klaxonSimulatedAttack + '</p></span>';
     */

    myHTML += '</div>';

    prefsBox.innerHTML = myHTML;
    return prefsBox;
}

function doSetPickTime() {
    console.log("SET PICK TIME");
    var setPickTimeOption = document.getElementById("setPickTime");
    var theOption = setPickTimeOption.options[setPickTimeOption.selectedIndex].value;
    var opts = theOption.split("~")[1];
    console.log("  opts=" + opts);
    var speedOpt = opts.split(";")[0];

    // I'm tired and need to sleep, rather the point of this exercise... so here's some shit:
    var sleepSpeed;
    if (speedOpt == 10) sleepSpeed = 0;
    if (speedOpt == 9) sleepSpeed = 1;
    if (speedOpt == 8) sleepSpeed = 2;
    if (speedOpt == 7) sleepSpeed = 3;
    if (speedOpt == 6) sleepSpeed = 4;
    if (speedOpt == 5) sleepSpeed = 5;
    if (speedOpt == 4) sleepSpeed = 6;
    if (speedOpt == 3) sleepSpeed = 7;
    if (speedOpt == 2) sleepSpeed = 8;
    if (speedOpt == 1) sleepSpeed = 9;

    var distOpt = opts.split(";")[1].split("(")[0];
    //console.log("PICK TIME: speedOpt=" + speedOpt + " sleepSpeed=" + sleepSpeed + " dist=" + distOpt);
    console.log("Selected speed=" + sleepSpeed + " dist=" + distOpt);
    myGMsetValue('SleepDist', distOpt);
    myGMsetValue("SleepSpeed", sleepSpeed);
}


function doSetSleepDist() {
    var optSleepDist = prompt("Travel how many solar systems when doing auto-setup of fleet/res save?", "");
    myGMsetValue('SleepDist', optSleepDist);
    var fixSleepDist = document.getElementById('setSleepDist');
    var fixedSleepDist = document.createElement('span');
    var set_SleepDist = 'How far to travel for fleet/res save auto-setup option: <a href="#" id="setSleepDist">{' + optSleepDist + '}</a>';
    var myHTML = "";
    myHTML += '<span id="setSleepDist"><p>' + set_SleepDist + '</p></span>';
    fixedSleepDist.innerHTML = myHTML;
    fixSleepDist.parentNode.replaceChild(fixedSleepDist, fixSleepDist);

    var setSleepDist =
        document.getElementById('setSleepDist');
    setSleepDist.addEventListener('click', function (e) {
        doSetSleepDist();
    }, false);
}

function doSetSleepSpeed() {
    console.log("SET SLEEP SPEED");
    var setSleepSpeed = document.getElementById("setSleepSpeed");
    myGMsetValue("SleepSpeed", setSleepSpeed.options[setSleepSpeed.selectedIndex].value);
}

function doSetField(field) {
    console.log('TWO: ', field);
    switch (field) {
        case 'setSleepDist':
            var optSleepDist = prompt("Travel how many solar systems when doing auto-setup of fleet/res save?", "");
            myGMsetValue('SleepDist', optSleepDist);
            var fixSleepDist = document.getElementById('setSleepDist');
            var fixedSleepDist = document.createElement('span');
            var set_SleepDist = 'How far to travel for fleet/res save auto-setup option: <a href="#" id="setSleepDist">{' + optSleepDist + '}</a>';
            var myHTML = "";
            myHTML += '<span id="setSleepDist"><p>' + set_SleepDist + '</p></span>';
            fixedSleepDist.innerHTML = myHTML;
            fixSleepDist.parentNode.replaceChild(fixedSleepDist, fixSleepDist);

            var setSleepDist =
                document.getElementById('setSleepDist');
            setSleepDist.addEventListener('click', function (e) {
                doSetSleepDist();
            }, false);
            break;
        case 'setPickTime':
            console.log('setPickTime');
            console.log("SET PICK TIME");
            var setPickTimeOption = document.getElementById("setPickTime");
            var theOption = setPickTimeOption.options[setPickTimeOption.selectedIndex].value;
            var opts = theOption.split("~")[1];
            console.log("  opts=" + opts);
            var speedOpt = opts.split(";")[0];

            // I'm tired and need to sleep, rather the point of this exercise... so here's some shit:
            var sleepSpeed;
            if (speedOpt == 10) sleepSpeed = 0;
            if (speedOpt == 9) sleepSpeed = 1;
            if (speedOpt == 8) sleepSpeed = 2;
            if (speedOpt == 7) sleepSpeed = 3;
            if (speedOpt == 6) sleepSpeed = 4;
            if (speedOpt == 5) sleepSpeed = 5;
            if (speedOpt == 4) sleepSpeed = 6;
            if (speedOpt == 3) sleepSpeed = 7;
            if (speedOpt == 2) sleepSpeed = 8;
            if (speedOpt == 1) sleepSpeed = 9;

            var distOpt = opts.split(";")[1].split("(")[0];
            //console.log("PICK TIME: speedOpt=" + speedOpt + " sleepSpeed=" + sleepSpeed + " dist=" + distOpt);
            console.log("Selected speed=" + sleepSpeed + " dist=" + distOpt);
            myGMsetValue('SleepDist', distOpt);
            myGMsetValue("SleepSpeed", sleepSpeed);
            break;
        case 'setSleepSpeed':
            var setSleepSpeed = document.getElementById("setSleepSpeed");
            myGMsetValue("SleepSpeed", setSleepSpeed.options[setSleepSpeed.selectedIndex].value);
            console.log('DEBUG setSleepSpeed', setSleepSpeed.options[setSleepSpeed.selectedIndex].value);
            break;
        default:
            console.log("NO FIELD", field);
    }
}


function addOptionsButtonListeners($) {

    /* ARGH couldn't get the jQuery way to work, and I need to move on for now........                    FIX
     $('#setPickTime').on('change', function() {
     doSetPickTime;
     });
     */
    /*
     document.getElementById('setPickTime').addEventListener(
     'change',
     function() {doSetPickTime();},
     false
     );
     */

    var setSleepDist = document.getElementById('setSleepDist');
    setSleepDist.addEventListener('click', function (e) {
        doSetField('setSleepDist');
    }, false);

    document.getElementById('setPickTime').addEventListener(
        'change',
        function () {
            doSetField('setPickTime');
        },
        false
    );
    document.getElementById('setSleepSpeed').addEventListener(
        'change',
        function () {
            doSetField('setSleepSpeed');
        },
        false
    );

    /*
     var setSleepSpeed =
     document.getElementById('setSleepSpeed');
     setSleepSpeed.addEventListener('click', function(e) {
     doSetSleepSpeed();
     },false);
     */

    // 2010:
    //document.getElementById('setPickTime').addEventListener('click', function(e) {
    //   doSetPickTime();
    //},false);


    /******************************* other button listeners *********************

     // listen for a click on the link to change prefs
     var setMinRank = document.getElementById('setAlertMinRank');
     setMinRank.addEventListener('click', function(e) {
		doSetMinRank();
 	},false);
     var setMaxActive = document.getElementById('setAlertActivity');
     setMaxActive.addEventListener('click', function(e) {
		doSetMaxActive();
 	},false);
     document.getElementById('setAlertLongInactive').addEventListener('click', function(e) {
	   doSetLongInactive();
 	},false);
     document.getElementById('setAlertIND').addEventListener('click', function(e) {
	   doSetAlertIND();
 	},false);
     var setAlertHeader = document.getElementById('setAlertHeader');
     setAlertHeader.addEventListener('click', function(e) {
		doSetAlertHeader();
 	},false);

     //var setReProbeCount =
     //document.getElementById('setReProbeCount');
     //                             setReProbeCount.addEventListener('click', function(e) {
	//                       doSetReProbeCount();
 	//},false);

     var setSleepDist =
     document.getElementById('setSleepDist');
     setSleepDist.addEventListener('click', function(e) {
	                       doSetSleepDist();
 	},false);
     var set_SideHeader_checkbox =
     document.getElementById('set_SideHeader_checkbox');
     set_SideHeader_checkbox.addEventListener('click', function(e) {
	                       doSetSideHeader();
 	},false);


     var loudBtn =
     document.getElementById('loudBtn');
     loudBtn.addEventListener('click', function(e) {
	                       doLoudBtn();
 	},false);
     var loop_loud_checkbox =
     document.getElementById('loop_loud_checkbox');
     loop_loud_checkbox.addEventListener('click', function(e) {
	                       doLoopLoudCheckbox();
 	},false);
     var quietBtn =
     document.getElementById('quietBtn');
     quietBtn.addEventListener('click', function(e) {
	                       doQuietBtn();
 	},false);
     var loop_quiet_checkbox =
     document.getElementById('loop_quiet_checkbox');
     loop_quiet_checkbox.addEventListener('click', function(e) {
	                       doLoopQuietCheckbox();
 	},false);

     document.getElementById('simulateAttack').addEventListener('click', function(e) {
	   doAttackSimulation();
 	},false);

     ******************************* /other button listeners *********************/

}


function doOptionsPage($) {
    var myDate = new Date();
    var myHours = myDate.getUTCHours();
    var myMinutes = myDate.getUTCMinutes();
    var mySeconds = myDate.getUTCSeconds();

    var opt = '<h3>Status Report App Options</h3>';
    var myOptionsDiv = document.createElement('div');
    myOptionsDiv.innerHTML = opt;

    var planet_order = document.getElementById('default_esp');              // where was this before?
    planet_order.parentNode.insertBefore(myOptionsDiv, planet_order);

    /** I forget what this was about. I recall developing an interface between
     * userscripts and Java applets... and I don't think there was more happening?
     if (Gagent_state == 1) {
	   doLoadApplet();

	   opt = '<p>';
	   opt += 'Setter: <a id="mySetterButton">call applet to set</a>';
	   opt += '</p>';

	   myOptionsDiv = document.createElement('div');
	   myOptionsDiv.innerHTML=opt;

	   var planet_order = document.getElementById('planet_order');
	   planet_order.parentNode.insertBefore(myOptionsDiv, planet_order);

	   var setterButton = document.getElementById('mySetterButton');
	       setterButton.addEventListener('click', function(e) {
	         		doMySetterButton();
 	       },false);
	}
     **/

    var prefsBox = getOptionsHTML();
    var planet_order = document.getElementById('default_esp');           // where was this before?
    planet_order.parentNode.insertBefore(prefsBox, planet_order);

    addOptionsButtonListeners($);
}

function doAutoAbort($) {
    // Must clear the list of planets to save
    var saveState = [];
    myGMsetValue('autoSleepPlanets', JSON.stringify(saveState));

    // less sure about this... //TODO: figure it out!
    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?
    localStorage[universe + '-autoSleep'] = "false";

    emitNotification($, "Aborted");
}


function toolbarAutoSleep($, offerSleepSetup) {
    var universe = window.location.href.split('.')[0].split('/')[2];
    var botState = localStorage[universe + '-botState']; //TODO: when this is an object, all will be well and less of a hack?

    if (offerSleepSetup) {
        var theHTML = 'Auto: <a href="#" id="setupSleepButton">[Do All Now]</a> <a id="calcButton">[Calc Duration]</a>' + ' State:' + botState;
        emitNotification($, theHTML);
        document.getElementById('setupSleepButton').addEventListener('click', function (e) {
            // For the moment we're not testing intervals from the button we use to manually put the fleet out at EOD
            var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?
            var logger = new Logger();
            logger.log('w', 'EOD sleep, skipping interval logic');
            localStorage.removeItem(universe + '-fleetInterval');
            doSetupAuto($);
        }, false);

        // Just calc a duration, log it and done.
        $('#calcButton').click(function () {
            var universe = window.location.href.split('.')[0].split('/')[2];  //TODO: when this is an object, all will be well and less of a hack?
            var interval = localStorage[universe + '-fleetInterval'];

            var result = calculateDurationFromInterval($, interval);
            var logger = new Logger();
            logger.log('d', "DEBUG calc speed=" + result[0] + " distance=" + result[1]);
        });

    } else {

        // this used to be a cookie //TODO: still mostly crappy, fix it!
        var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?
        var aaa = localStorage[universe + '-autoSleep'];
        var autosleepActive = (aaa === 'true');

        if (autosleepActive) {
            var theHTML = 'Auto: <span id="toolbarAuto_functions_abort"><a href="#" id="abortAuto">[Abort]</a></span>';
            emitNotification($, theHTML);
            document.getElementById('abortAuto').addEventListener('click', function (e) {
                doAutoAbort($);
            }, false);
        }
    }
}


/**
 * A building upgrade was requested and a new div was added in response. Tell the Goalie to update with the indicated
 * status, clear the flag (we've done all we can do for now) then go back to fleets.
 *
 * @param $ - jQuery
 * @param triggerElement - the new div
 */
function buildRequestExecuted($,triggerElement) {
    // An example error:
    // <span class="error_text">That does not belong to you.</span>
    var findErr = triggerElement.html().indexOf('error_text');
    if (findErr > -1) {

        var errText = triggerElement.html().slice(findErr);
        var part = errText.match(/>.+</g);
        console.log("BUILD FAILED error=", part[0]);

        var goalie=new Goalie($)
        goalie.flagGoal(part[0]);
    } else {
        console.log('success tremendous, now go back to fleets');
        var goalie=new Goalie($)
        goalie.buildRequestSuccess();
    }

    // The build is done, return to fleets
    // TODO: I don't even know how this universe/planet shit would be done elsewhere, in this case...
    var universe = window.location.href.split('.')[0].split('/')[2];
    var thePlanet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        thePlanet = activatePlanet;

    // Start in with the primordial grow mode...
    var growing = false;
    var growFlag = localStorage[universe + '-growMode'];
    if (typeof growFlag !== 'undefined') {
        console.log("GROWING");
        growing = true;
    }

    localStorage.removeItem(universe + '-goalieActive');
    if (growing) {
        //window.location.href = "/fleet?current_planet=" + thePlanet;
        console.log("Growing, stay on build...");
    } else {
        window.location.href = "/fleet?current_planet=" + thePlanet;
    }
}


/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             M A I N L I N E
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
jQuery(document).ready(function ($) {
    var universe = window.location.href.split('.')[0].split('/')[2]; //TODO: when this is an object, all will be well and less of a hack?
    var thePlanet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        thePlanet = activatePlanet;

    // <enabled>
    var m = myGMgetValue('enabled_Sleepsave', 'true');
    var moduleEnabled = (m === 'true');
    var doToggle = getCookie('set_moduleEnabled_Sleepsave');
    if (doToggle === 'toggle') {
        document.cookie = "set_moduleEnabled_Sleepsave=; expires=Sun, 04 Jul 1976 00:00:00 UTC";
        if (moduleEnabled) {
            myGMsetValue('enabled_Sleepsave', 'false');
            moduleEnabled = false;
        } else {
            myGMsetValue('enabled_Sleepsave', 'true');
            moduleEnabled = true;
        }
    }
    var displayEnabled = 'DISABLED';
    if (moduleEnabled)
        displayEnabled = 'enabled';

    var logger = new Logger();
    //logger.log('d','Sleepsave version ' + GM_info.script.version + " " + displayEnabled);
    // </enabled>

    // Check for cloak
    var cloaked = false;
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
                if (evt[4] == "Cloak")
                    cloaked = true;
            }
        }
    }
    var disabled = false;
    if (cloaked) {
        console.log("DEBUG: sleepsave disabled, cloaked");
        disabled = true;
    }

    // The active goal builder overrides all else until that task is done
    var goalieActive = localStorage[universe + '-goalieActive'];
    if (typeof goalieActive !== 'undefined') {
        disabled = true;
    }

    // Need a way to abort automatic sleep state
    toolbarAutoSleep($, false);

    var menu = myGMgetValue('sfcaMenu_register', '');                              // TODO: WTF is this?!
    var pos = menu.search(/Fleet dispatched to harvest/);
    if (pos > -1) {
        console.log('Sleepsave: Menu registered');
    }


    //// OLD ///
    /**
     // Calculate drift... their clock might not match ours, probably won't... and add a friend into the mix and we really need this!
     var myDate = new Date();
     var myHours = myDate.getUTCHours();
     var myMinutes = myDate.getUTCMinutes();
     var mySeconds = myDate.getUTCSeconds();

     var theirTime=$x("/html/body/div[2]/div/div/div[3]/div[2]/table/tbody/tr/td[2]", XPathResult.FIRST_ORDERED_NODE_TYPE);
     theirTime = theirTime.innerHTML;
     var myTime = myHours + ":" + myMinutes + ":" + mySeconds;
     //myLog("My time:    " + myTime);
     var theirHours = parseInt(theirTime.split(':')[0],10);
     var theirMinutes = parseInt(theirTime.split(':')[1],10);
     var theirSeconds = parseInt(theirTime.split(':')[2],10);
     var theirTime = theirHours + ":" + theirMinutes + ":" + theirSeconds;
     //myLog("Their time: " + theirTime);
     GclockDrift = ((myHours - theirHours) * 3600) + ((myMinutes - theirMinutes) * 60) + (mySeconds - theirSeconds);
     //myLog("Clock drift: " + GclockDrift);
     **/

    // Watch for the Ships overview... the Resolve object starts a sleepsave by setting flags and requesting Ships
    waitForKeyElements($, "th.ships.alt", displayingShips);

    // Toggle to show/hide any fleets in flight...
    var toggleFleetDisplay = myGMgetValue('fleetDisplay', 'block');
    var setToggleFleets = getCookie('set_toggleFleets');
    if (setToggleFleets.length) {
        myGMsetValue('fleetDisplay', setToggleFleets);
        document.cookie = "set_toggleFleets=; expires=Sun, 04 Jul 1976 00:00:00 UTC";
        toggleFleetDisplay = setToggleFleets;
    }

    // On the fleet screen, display the toggle option and handle any errors
    if ($('#content.fleet.index').length) {

        // Display cargo load percentage
        enoughCarms($, true);
        haveGaia($);

        // Wrap the table in a div for easier hide                                       //TODO:Do we really need this?
        $("#tasks").wrap("<div id='fleetWrapper' style='display:" + toggleFleetDisplay + "'></div>");
        addMyFleetbar($);

        var error = $('.error').first();
        if (error.length) {
            console.log("ERROR!");
            logger.log('e', "ERROR" + $('.error').first().html());

            var aaa = localStorage[universe + '-autoSleep'];
            var autoSleepActive = (aaa === 'true'); //TODO: we can do better than this!

            if (autoSleepActive) {

                localStorage[universe + '-autoSleep'] = "false";

                document.cookie = "set_didSleep=; expires=Sun, 04 Jul 1976 00:00:00 UTC";
                emitNotification($, "Aborted on error");
            }
        }
    }

    // On the fleet screen, if not cloaked or busy, do automated events...
    if ($('#content.fleet.index').length) {
        if (!disabled) {

            // if we got here from the ships overview, handle the request to sleepsave this fleet
            var doSleep = getCookie('set_sleep_cookie');
            if (doSleep.length) {
                // Ready to perform an automated sleep save, but first let's see if we need more cargo...
                //logger.log('d', 'DO SLEEP...');

                // do the automated sleepsave...
                document.cookie = "set_sleep_cookie=; expires=Sun, 04 Jul 1976 00:00:00 UTC";
                initSleepsave($, false);

            } else {
                // add a button to the fleet screen to offer the feature
                initSleepsave($, true);
            }

            // Watch for an acknowledgement that our harvest mission was sent. When it appears,
            // if we've just completed an automated sleep request, to back to that screen for more
            var sleepAck = $('.notice').first();
            if (sleepAck.length) {
                var notice = sleepAck.html();
                var pos = notice.search(/Fleet dispatched to harvest/);
                if (pos > -1) {
                    // We saw a notice that a fleet was sent to harvest, if from auto go to overview
                    var didSleep = getCookie('set_didSleep');
                    if (didSleep.length) {
                        //logger.log('d', 'Good sleep');
                        document.cookie = "set_didSleep=; expires=Sun, 04 Jul 1976 00:00:00 UTC";

                        sleepNextPlanet($);
                    }
                }
                else {
                    var pos = notice.search(/toolbarAuto_functions_abort/);
                    if (pos > -1) {
                        //console.log("DEBUG ignore our abort notice");
                    } else {
                        logger.log('w', "NOTICE " + notice);
                        var didSleep = getCookie('set_didSleep');
                        if (didSleep.length) {
                            logger.log('w', "There may have been trouble?!");
                        }
                    }
                }
            }
        } else {
            console.log("DEBUG sleepsave disabled");
        }
    }

    // TODO: Simplify!
    var growing = false;
    // The active goal builder overrides all else until that task is done
    var growFlag = localStorage[universe + '-growMode'];
    if (typeof growFlag !== 'undefined') {
        console.log("GROWING");
        growing = true;
    }

    /**
     * Before sending the fleet out on a sleepsave, do the tasks required to find
     * a building upgrade goal and initiate when the resources are sufficient.
     */
    // On the Tech screen, take note of the goal
    if ($('.technology.index').length) {
        var goalie = new Goalie($);
        goalie.determineRecommendation($);

        if (goalieActive) {
            // we interrupted Fleet sleepsave action to get the goal, now we're done, clear flag and go back
            localStorage.removeItem(universe + '-goalieActive');
            window.location.href = "/fleet?current_planet=" + thePlanet;
        }

        if (growing) {
            logger.log('d','grow by building new goal');
            window.location.href = "/buildings/home?current_planet=" + thePlanet;
        }
    }

    // On the Buildings screen, get the costs for the goal or just build it when we can
    if ($('.buildings.home.index').length) {

        //console.log("TEST0 go"); goalieActive = true;

        var goalie = new Goalie($);
        var costed = goalie.goalCosted($, logger);
        if (!costed) {
            goalie.setCosts($, logger);
        }

        // Always check available resources and calculate any shortage
        goalie.checkResources($, logger);

        var getFresh = false;
        if (goalieActive || growing) {
            if (goalie.testUpgradeInProgress($, logger)) {
                logger.log('d', 'already building an upgrade');
            } else if (goalie.upgradeComplete(logger)) {
                logger.log('d', 'need a fresh goal!!');
                getFresh = true;
            } else if (goalie.checkResources($, logger)) {
                logger.log('d', "Ready to build!");

                // SO this goes down one of three ways: the builder refuses to build, or the request fails, or it works.
                // In every case, we need to get back to the fleets screen. Handle the first case here, and the other
                // two will be caught when the new div is displayed after the request is executed.
                waitForKeyElements($, ".in_progress", buildRequestExecuted);
                waitForKeyElements($, ".error", buildRequestExecuted);
                if (!goalie.buildTheUpgrade($, logger, thePlanet)) {
                    // should probably clear the recommendation and try again but for the moment just block it
                    goalie.flagGoal("could not start");
                } else {
                    goalieActive = false; // don't jump back from here, but instead in the key element listener
                }
            }
        }

        //console.log("TEST0 end"); goalieActive = false;

        if (goalieActive || growing) {
            if (getFresh) {
                window.location.href = "/technology?current_planet=" + thePlanet;

            } else {
                if (growing) {
                    console.log("Stay right here...");
                } else {
                    // we interrupted Fleet sleepsave action to get the goal, now we're done, clear flag and go back
                    localStorage.removeItem(universe + '-goalieActive');
                    window.location.href = "/fleet?current_planet=" + thePlanet;
                }
            }
        }
    }

    // Display BOJ message with version on Profile screen
    if ($('#content.options.index').length) {
        insertProfileHeader($, moduleEnabled);
        doOptionsPage($);
    }
});

addMyCSS();
myAttachIt(toggleModuleEnabled_Sleepsave);
myAttachIt(do_setupSleep);
myAttachIt(do_sleepsave);
myAttachIt(my_calc_distance);
myAttachIt(addTwoTimes);
