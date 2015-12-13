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
// * Call as needed
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


/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             M A I N L I N E
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/


jQuery(document).ready(function ($) {
    //var logger = new Logger();
    //logger.log('d','Logger version ' + GM_info.script.version);
});
