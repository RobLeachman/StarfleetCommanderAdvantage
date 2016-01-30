/////////////////////////////////////////////////////////////////////////////////////////////
//
// Starfleet Commander Advantage - Logger
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
// * This file contains the objects needed by the driving functions. Originally it was just
//   logger functions... now supplemented by the event storage object, goal builder, and
//   building location.
//
//
// KNOWN ISSUES
// - None, it is perfect
//
// GOOD IDEAS PILE
// - Write to local filesystem
//
// DONE
// - Object moved to it's own script
//
// VERSION HISTORY
//
// 0.1 - Move from testbed.
//
//
// ==UserScript==
// @name         SFCA Logger-Dev
// @namespace    http://your.homepage/
// @version      0.3
// @description  Logger object for SFCA
// @author       Robert Leachman
// @match        http://*.playstarfleet.com/*
// @match        http://*.playstarfleetextreme.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js
// @grant        none
//
// ==/UserScript==
/////////////////////////////////////////////////////////////////////////////////////////////
// per https://learn.jquery.com/using-jquery-core/avoid-conflicts-other-libraries/
jQuery.noConflict();

function Logger(universe) {
    this.universe = "big";
    this.count=0;
    /**
     * DEV NOTE: how to refuse to construct an object? //TODO: find out
     */
    if (typeof universe == "undefined") {
        // In production we probably want this specified each time... for now, just debug without it //TODO: prod?
        //console.log("ERROR: The big bang has not occurred yet");
        this.universe = window.location.href.split('.')[0].split('/')[2];

    } else {
        this.universe = universe;
    }

    this.count = localStorage[this.universe+'-logger_count'];
    if (typeof this.count == "undefined") {
        localStorage[this.universe+'-logger_count'] = 0;
        this.count=0;
    }
}

Logger.prototype = {
    constructor: Logger,
    /**
     * Add a log event
     *
     * @param level /todo: perhaps D)ebug I)nfo W)arning E)rror
     * @param evtText
     */
    log: function(level, evtText) {
        var d = new Date();

        var evt = (d.toString().split(' ')[1])+" "+ this.pad((d.getDate()))+" "+ this.pad(d.getHours()) +
            ":" + this.pad(d.getMinutes())+":"+ this.pad(d.getSeconds())
            +" "+'[' + level + '] ' + evtText;

        localStorage[this.universe+'-logger_'+this.count] = evt;
        localStorage[this.universe+'-logger_count'] = ++this.count;

        console.log(evtText);


    },
    pad: function(n) {
        if (n<10) {
            return "0"+n;
        } else {
            return n;
        }

    },
    dump: function() {
        console.log("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
        for (var i= 0;i<this.count;i++) {
            var evt = localStorage[this.universe+'-logger_'+i];
            console.log(evt);
        }
    },
    purge: function() {
        console.log("DEBUG purging", this.count, "log lines");
        for (var i= 0;i<this.count;i++) {
            localStorage.removeItem(this.universe+'-logger_'+i);

        }
        this.count = 0;
        localStorage[this.universe+'-logger_count'] = 0;


    }
};

function Stores() {
    this.universe = window.location.href.split('.')[0].split('/')[2];

    // Get the events
    var dataKey = "E";
    dataKey = this.universe + '-' + dataKey;
    //this.evtCount = GM_getValue(dataKey + 'C', 0);

    this.evtCount = localStorage[dataKey + 'C'];
    if (typeof this.evtCount !== 'string') {
        this.evtCount = 0;
    } else
        this.evtCount = parseInt(this.evtCount, 10);
    this.evt = [];
    for (var y = 0; y < this.evtCount; y++) {

        var theEvent = localStorage[dataKey + y];
        if (typeof theEvent !== 'string') {
            console.log("Missing event!", dataKey + y);
        } else {
            this.evt[y] = JSON.parse(theEvent);

            // fix the numbers...
            this.evt[y][0] = parseInt(this.evt[y][0], 10);
            this.evt[y][1] = parseInt(this.evt[y][1], 10);
            this.evt[y][2] = parseInt(this.evt[y][2], 10);
            this.evt[y][6] = parseInt(this.evt[y][6], 10); // 6=deleted/expired

            //console.log("DEBUG: load evt " + y + " time=" + this.evt[y][0] + " start=" + this.evt[y][1] + " end=" + this.evt[y][2] + " deleted=" + this.evt[y][6] + " dest=" + this.evt[y][5]);
        }
    }
}

Stores.prototype = {
    constructor: Stores,
    getEventCount: function () {
        return this.evtCount;
    },
    appendEvent: function ($, referenceTime, eventStart, eventEnd, eventCallback, eventMissionType, eventMissionDest, eventMissionOrigin, eventDestinationInfo) {
        var newEventNumber = this.evtCount;
        this.evt[newEventNumber] = [];
        this.evt[newEventNumber][0] = referenceTime;
        this.evt[newEventNumber][1] = eventStart;
        this.evt[newEventNumber][2] = eventEnd;
        this.evt[newEventNumber][3] = eventCallback;
        this.evt[newEventNumber][4] = eventMissionType;
        this.evt[newEventNumber][5] = eventMissionDest;
        this.evt[newEventNumber][6] = 0; //eventLogicallyDeleted
        this.evt[newEventNumber][7] = eventMissionOrigin;
        this.evt[newEventNumber][8] = eventDestinationInfo;
        this.evtCount++;
        this.saveEvents(false);
        return newEventNumber;
    },
    getEvent: function (eventNumber) {
        return this.evt[eventNumber];
    },
    expireEvent: function (eventNumber) {
        this.evt[eventNumber][6] = 1;
        this.saveEvents(false);
    },
    /**
     * Save the event array. Usually with a recent update.
     *
     * @param purge // true if safe to purge old events; almost always, unless two items are added at the same time
     */
    saveEvents: function (purge) {
        //console.log("DEBUG: saving event array, purge=", purge);
        // Get the events
        var dataKey = "E";
        dataKey = this.universe + '-' + dataKey;

        var bDeletedEvent = false;

        var savedEvtCount = this.evtCount; //TODO: analyze this, could be gold or shit (probably shit)
        var eventCounter = 0;
        var GbPurgeEvents = false; // TODO: why ever store them? I think it's lingering 2010 madness
        //console.log("DEBUG: purge expired events=", GbPurgeEvents);
        for (var y = 0; y < this.evtCount; y++) {
            if (this.evt[y][6] == 1 && GbPurgeEvents) {
                savedEvtCount--;
                eventCounter--;
                bDeletedEvent = true;
            } else {

                //console.log("DEBUG: save evt " + y + " time=" + this.evt[y][0] + " start=" + this.evt[y][1] + " end=" + this.evt[y][2] + " deleted=" + this.evt[y][6] + " dest=" + this.evt[y][5]);
                //myGMsetValue(dataKey + eventCounter, JSON.stringify(this.evt[y]));
                localStorage[dataKey + eventCounter] = JSON.stringify(this.evt[y]);


                /** 2010 novice code... //TODO hunt down all of this sort of thing...
                 * so cute
                 *
                 *
                 //myLog("Saving event: " + y + " time=" + evt[y][0] + " start=" + evt[y][1] + " end=" + evt[y][2] + " status=" + evt[y][6] + " dest=" + evt[y][5]);
                 var serializedReportData = this.evt[y][0] + this.delimiter;

                 for (var j = 1; j < _EVTFACTS - 1; j++) {
                    serializedReportData = serializedReportData + evt[y][j] + evtDelim;
                }
                 serializedReportData = serializedReportData + evt[y][_EVTFACTS - 1];
                 //myLog("Save event for " + y + " " + serializedReportData);
                 GM_setValue(dataKey + eventCounter, serializedReportData);
                 */
            }
            eventCounter++;
        }
        //console.log("DEBUG: Saved events count: " + savedEvtCount);
        localStorage[dataKey + 'C'] = savedEvtCount;

        // In 2010 it seemed important to refresh the memory state if the array changed. //TODO: be sure it doesn't matter
        /*
         if (bDeletedEvent) {
         console.log("DEBUG: deleted events, time will tell...");
         //getArrayFromPersisted();
         } else {
         console.log("DEBUG: no delete, good to go, time will tell...");
         }
         */
    }
};


function Location(e) {
    var locationNameHTML = e.find('.name').html();
    var linkText = /(>)(.*)(<)/;
    var searchName = linkText.exec(locationNameHTML);
    this.name = searchName[2];

    this.buildingNumber = -1;
    var buttonHTML = e.find('.action_link').html();
    //console.log("Bzzt", buttonHTML);
    if (typeof buttonHTML === 'string') {
        buttonHTML = buttonHTML.replace(/\s+/g, '');
        var buildingNumber = /(build\/)(.*)(\?)/;
        var searchNumber = buildingNumber.exec(buttonHTML);
        this.buildingNumber = searchNumber[2];

        // flag the buildings that can't be built
        var enabledButton = /(enabled)(.*?)(>)/;
        var searchEnabled = enabledButton.exec(buttonHTML);
        //console.log("enabled", searchEnabled[2]);
        if (searchEnabled[2] !== '"') {
            this.buildingNumber *= -1;
        }
    }

    /*
     var buttonHTML = e.find('.action_link').html().replace(/\s+/g, '');
     var buildingNumber = /(build\/)(.*)(\?)/;
     var searchNumber = buildingNumber.exec(buttonHTML);
     this.buildingNumber = searchNumber[2];
     */





    this.level = 0;
    var level = linkText.exec(e.find('.level').html());
    if (level instanceof Array) {
        this.level = level[0].slice(1, -1);
    }

    this.oCost = this.upgradeCost(e.find('.row.ore.cost').children().first().next().html());
    this.cCost = this.upgradeCost(e.find('.crystal.cost').children().first().next().html());
    this.hCost = this.upgradeCost(e.find('.hydrogen.cost').children().first().next().html());

    //if (this.name === "Ore Mine")
    //    console.log("LOC name", this.name, this.level, this.oCost, this.cCost, this.hCost);

    this.missileSlots = 0;
    this.missileCount = 0;
    this.needMissiles = false;

    if (this.name === "Missile Silo") {
        var rawCounts = e.find('.data.amount').html().replace(/\s+/g, '') + ">";
        this.missileSlots = parseInt(rawCounts.split('>')[4], 10);
        this.missileCount = parseInt(rawCounts.split('>')[1].split('<')[0], 10);
        // ... and while we're at it
        this.needMissiles = (this.missileSlots - this.missileCount > 0);
        //console.log("Missilecounts", this.missileSlots, this.missileCount, this.needMissiles);
    }
}

Location.prototype = {
    constructor: Location,
    isNamed: function (targetName) {
        // real power here, ha ha
        return this.name === targetName;
    },
    upgradeCost: function (costHTML) {
        var cost = costHTML;
        if (typeof cost === 'string') {
            var bigOre = costHTML.split('"')[1];
            if (typeof bigOre === 'string') {
                cost = bigOre;
            }
            return parseInt(cost.replace(/,/g, ''), 10);
        } else
            return -1;
    },
    doUpgrade: function (logger, thisPlanet) {
        if (this.buildingNumber < 0) {
            logger.log('e', 'ERROR: cannot build ' + this.name);
            return false;
        } else {
            logger.log('d', 'FINALLY See about building a ' + this.name + ' with number ' + this.buildingNumber);
            //console.log("force fail"); this.buildingNumber = 111;

            disable_ajax_links();
            new Ajax.Request('/buildings/home/build/' + this.buildingNumber + '?current_planet=' + thisPlanet,
                {
                    asynchronous: true,
                    evalScripts: true,
                });
            return true;
        }
    }
};

// http://www.jacklmoore.com/notes/rounding-in-javascript/
function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function scaledAndRounded(value) {
    if (value === 0) {
        return 0;
    } else if (value > 1000000) {
        return round(value / 1000000, 2) + "M";
    } else if (value > 100000) {
        return round (value / 1000, 0) + "K";
    } else {
        return value;
    }
}


function Goalie($) {
    this.universe = window.location.href.split('.')[0].split('/')[2];
    this.planet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        this.planet = activatePlanet;

    // Get the current recommendation
    this.recommendation = localStorage[this.universe + '-' + 'tech_' + this.planet];
    if (typeof this.recommendation == 'undefined') {
        this.recommendation = "Undetermined";
    }

    // A new universe will be known by the home planet not renamed (and with no moon, didn't test that part)
    this.primordial = ( $(".home_planet div.planet div.name_and_coords div.planet_name").html() === "Stew");
}


Goalie.prototype = {
    constructor: Goalie,
    isPrimordial: function() {
        return this.primordial;
    },
    // Called when the Tech screen is served, parse and save the recommended next upgrade to build.
    determineRecommendation: function ($) {
        var logger = new Logger(this.universe);

        var recommendedBuild = $('.recommendations').html().split('>')[3].split('<')[0];

        // For those universes where things are well developed...
        if (recommendedBuild === "Hydrogen Synthesizer" && !this.primordial) {
            console.log("We don't need the gas");
            recommendedBuild = "Ore Mine";
        }
        if (recommendedBuild === "Solar Array" && !this.primordial) {
            console.log("Burn the gas");
            recommendedBuild = "Nuclear Power Plant";
        }

        // Wacky universe, we can get this stuff from harvesting...
        if (this.primordial) {
            if (recommendedBuild == "Ore Mine" || recommendedBuild == "Crystal Mine") {
                recommendedBuild = "Hydrogen Synthesizer";
            }
        }

        localStorage[this.universe + '-' + 'tech_' + this.planet] = recommendedBuild;
        this.recommendation = recommendedBuild;
        logger.log('d', 'Next goal: ' + recommendedBuild);
    },
    getGoal: function (logger) {
        return this.recommendation;
    },



    /**
     * Called when the building screen is served, parse and save the cost of the recommended upgrade.
     * Handle yet another special case, if the planet's fields are full... flag it so we won't try to build.
     *
     * The output is an updated recommendation, with resource costs appended.
     *
     * @param $
     * @param logger
     * @returns {boolean} -- unused by caller
     */
    setCosts: function ($, logger) {
        // "this" is redefined, so...
        var thisUniverse = this.universe;
        var thisPlanet = this.planet;
        var rec = this.recommendation;

        // Before anything else, check to see if the planet's fields are all filled.
        var fullFieldsDiv = $(".fields_full_text").html();
        if (typeof fullFieldsDiv !== 'undefined') {
            logger.log('w','Cannot upgrade further, all fields are full!');
            localStorage[thisUniverse + '-' + 'tech_' + thisPlanet] = 'FULL/FILLED/STUCK';
            return false;
        }

        if (rec === "Undetermined") {
            console.log("quietly do nothing");
            return false;
        }
        logger.log('d', 'Getting costs for ' + rec);

        // An invalid build target should be impossible, but since the effects are pretty bad if it happens... be sure
        var foundTarget = false;
        var theRecommendation = rec + '/' + 'INVALID!';
        $('.row.location').each(function () {
            var loc = new Location($(this));
            if (loc.isNamed(rec)) {
                foundTarget = true;
                theRecommendation = rec + '/' + loc.oCost + '/' + loc.cCost + '/' + loc.hCost;
                logger.log('d', "FOUND COSTS: " + theRecommendation);
                return false;
            }
        });
        this.recommendation = theRecommendation;
        localStorage[thisUniverse + '-' + 'tech_' + thisPlanet] = theRecommendation;
    },
    goalCosted: function ($, logger) {
        if ($('.buildings.home.index').length) {
            // Handle the case where we manually started a build... if something is building now there are no costs,
            // instead update the goal to indicate the current activity.
            if (this.testUpgradeInProgress($, logger)) {
                this.recommendation = 'UpgradeInProgress';
                localStorage[this.universe + '-' + 'tech_' + this.planet] = this.recommendation;
            }
        }
        // If there's a build in process, nothing more is required for costs
        if (this.recommendation === 'UpgradeInProgress') {
            return true;
        }
        var testGoalCosted = this.recommendation.split('/');
        // If we have more than just a name...
        return testGoalCosted.length > 1;
    },
    checkResources: function ($, logger) {
        this.haveResources = false;
        if (this.recommendation === 'Undetermined') {
            logger.log('e','There is no goal');
            return false;
        }
        if (this.testUpgradeInProgress($, logger)) {
            console.log('Already building');
            return false;
        }
        if (this.recommendation === "UpgradeInProgress") {
            console.log("We were building, now we're not!!");
            return false;
        }
        var costRecommendation = this.recommendation.split('/');
        if (costRecommendation[0] == "FULL") {
            logger.log('d','full fields!');
            return false;
        }
        if (costRecommendation[1] == "INVALID!") {
            localStorage[this.universe + '-' + 'techStatus_' + this.planet] = "Invalid goal: " + costRecommendation[0];
            return false;
        }
        if (costRecommendation.length > 1) {
            logger.log('d','costs computed for '+ costRecommendation);
            var upgradeOre = this.recommendation.split('/')[1];
            var upgradeCrystal = this.recommendation.split('/')[2];
            var upgradeHydro = this.recommendation.split('/')[3];

            if (upgradeOre == 'flagged') {
                console.log('Goal flagged as failed');
                return false;
            }

            var availableOre = parseInt($('#resource_ore').html().replace(/,/g, ''), 10);
            var availableCrystal = parseInt($('#resource_crystal').html().replace(/,/g, ''), 10);
            var availableHydro = parseInt($('#resource_hydrogen').html().replace(/,/g, ''), 10);

            var shortOre = availableOre - upgradeOre;
            var shortCrystal = availableCrystal - upgradeCrystal;
            var shortHydro = availableHydro - upgradeHydro;

            (shortOre < 0) ? shortOre *= -1 : shortOre = 0;
            (shortCrystal < 0) ? shortCrystal *= -1 : shortCrystal = 0;
            (shortHydro < 0) ? shortHydro *= -1 : shortHydro = 0;

            this.haveResources = ((shortOre == 0) && (shortCrystal == 0) && (shortHydro == 0));
            logger.log('d','have all=' + this.haveResources + ' short ore=' + shortOre + ' c=' + shortCrystal + ' h=' + shortHydro);

            // Make a note of what we need to get the upgrade started...
            var bldg = this.recommendation.split('/')[0];
            if (this.haveResources) {
                localStorage[this.universe + '-' + 'techStatus_' + this.planet] = bldg + ": Ready!";
            } else {

                localStorage[this.universe + '-' + 'techStatus_' + this.planet] = bldg + ": " +
                    scaledAndRounded(shortOre) +
                    "/" + scaledAndRounded(shortCrystal) +
                    "/" + scaledAndRounded(shortHydro);
            }

            return this.haveResources;

        } else {
            logger.log('w',"uncosted recommendation");
            return false;
        }
    },
    /**
     * From the Buildings screen, see if an upgrade is being built. In the event Buildings is not the current screen
     * simply return false.
     *
     * @param $
     * @param logger
     * @returns {boolean} - true if we're on the buildings screen and can find an upgrade event timer
     */
    testUpgradeInProgress: function ($, logger) {
        if (!$('.buildings.home.index').length) {
            return false;
        }
        // We'd expect to always find this div, but for it to be blank unless the upgrade is displayed
        var upgradeDiv = $("#upgrade_in_progress").html();
        if (typeof upgradeDiv === 'undefined') {
            return false;
        }
        var upgrade = upgradeDiv.replace(/\s+/g, ''); // strip whitespace
        if (upgrade.length) {
            logger.log('d', 'upgrade in progress');
            // Reset "recommendation" status to indicate the current upgrade
            localStorage[this.universe + '-' + 'techStatus_' + this.planet] = "Upgrading...";
            return true;
        } else {
            logger.log('d', 'upgrade idle');
            return false;
        }
    },
    buildTheUpgrade: function ($, logger, thisPlanet) {

        // If a build is in process, all bets are off for what comes next. Clear the recommendation.
        var upgradeWasRequested = false;
        var upgrade = $("#upgrade_in_progress").html().replace(/\s+/g, ''); // strip whitespace
        if (upgrade.length) {
            logger.log('e', 'building already in progress');
        } else {
            var rec = this.recommendation;
            var bldg = this.recommendation.split('/')[0];
            logger.log('d', 'JUST BUILD IT ' + bldg);

            $('.row.location').each(function () {
                var loc = new Location($(this));
                if (loc.isNamed(bldg)) {
                    var goodBuild = loc.doUpgrade(logger, thisPlanet);
                    if (!goodBuild) {
                        console.log("BAD BUILD");
                    } else {
                        console.log("FINE BUILD");
                        upgradeWasRequested = true;
                    }
                    return false;
                }
            });
        }

        if (upgradeWasRequested) {
            console.log("upgrade built, or not");
        } else {
            logger.log('e', 'upgrade request surely failed, building=' + bldg);
        }
        return upgradeWasRequested;
    },
    flagGoal: function (reason) {
        var recommendedBuild = "FAILED/flagged/" + reason;
        localStorage[this.universe + '-' + 'tech_' + this.planet] = recommendedBuild;
        this.recommendation = recommendedBuild;
    },
    buildRequestSuccess: function() {
        var recommendedBuild = "UpgradeInProgress";
        localStorage[this.universe + '-' + 'tech_' + this.planet] = recommendedBuild;
        this.recommendation = recommendedBuild;
    },
    // Called when there is no active build, if the last thing we knew we were building, then it's done!
    // Clear the flag so we will find and build another goal.
    upgradeComplete: function(logger) {
        if (this.recommendation === "UpgradeInProgress") {
            logger.log('d','Upgrade Builder Success!');
            localStorage.removeItem(this.universe + '-' + 'tech_' + this.planet);
            return true;
        }
    }
};


/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             M A I N L I N E
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/


jQuery(document).ready(function ($) {
    //var logger = new Logger();
    //logger.log('d','Logger version ' + GM_info.script.version);
});
