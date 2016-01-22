/////////////////////////////////////////////////////////////////////////////////////////////
//
// Starfleet Commander Advantage - All Planets
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
// * Enhances the UI to provide one-click access to the information tabs provided by SFC
//   from Home > All Planets.
// * Provides the toolbar for Starfleet Commander Advantage; this script must be installed
//   to provide the foundation for the other SFCA scripts.
// * Experimental: replace their menu with ours, custom built for SFCA
//
//
// KNOWN ISSUES
// - Need to fix the hardcoded planet number!
// - Need some sort of global module enablement function...
//
// GOOD IDEAS PILE
// - Enhance to not flash the Resources tab when the others are requested. Sort?
//
// DONE
// - Module started
//
// VERSION HISTORY
//
// 0.11 - Add to git and make local development stub
//
// 0.7 - Just bring current
//
// 0.5 - Worked on module enable/disable
//
// 0.3 - Use the more advanced method of avoiding jQuery conflicts.
//     - One cookie is sufficient.
//
// 0.1 - Created module! Back in the saddle in 2015 with a new intent to
//       become a better Javascript programmer.
//
//
// ==UserScript==
// @name         SFCA AllPlanets-Local
// @namespace    http://your.homepage/
// @version      0.9
// @description  Immediate access to the All Planets tabs
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
    if (!head) { return; }
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
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

// Copies user script into the page, as javascript accessible to onClick...
// The 2010 comment was "Like the original except don't fire the script
// on load, just make it available".
//
// 2015, I don't recall what all that meant.
function myAttachIt(theFunction) {

    var script = document.createElement("script");
    script.type = "application/javascript";

    //anonymous function, fires on load:
    //script.textContent = "(" + myScript + ")();";

    //we just want it available for later:
    script.textContent = theFunction;

    document.body.appendChild(script);
}
/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 * MY FUNCTIONS:
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
// Display a nice status or error message box
function emitStatusMessage(message, bGold) {

    // CSS NEEDS HELP!

    var messageBox = document.createElement("div");
    if (bGold)
        messageBox.setAttribute('class', 'myStatusBox');
    else
        messageBox.setAttribute('class', 'myLessFancyStatusBox');
    messageBox.innerHTML = message;
    //var nav=document.getElementById("sticky_notices");
    var nav = document.getElementById("user_planets");
    nav.parentNode.insert(messageBox, nav.nextSibling);
}

// Display a nice status or error message box
function emitNotification($, quickLink) {
    var messageBox = document.createElement("div");
    messageBox.setAttribute('class','notice');
    messageBox.innerHTML=quickLink;

    $(messageBox).appendTo('#flash_messages');
}

// Add a toolbar to all screens, to allow handy access to the All Planets tabs.
function addMyToolbar($, moduleEnabled) {
    var toolbarDiv = document.createElement('div');
    toolbarDiv.setAttribute('id','myToolbar');
    //    myStuffDiv.innerHTML='All: <a href="/overview?current_planet=34287">[ All Tasks ]</a>';
    var toolbar="All: ";

    if (moduleEnabled) {
        toolbar +="<a onClick='displayAllTasks(\"resources\");'>[Resources]</a>";
        toolbar +=" <a onClick='displayAllTasks(\"mines\");'>[Mines]</a>";
        toolbar +=" <a onClick='displayAllTasks(\"ships\");'>[Ships]</a>";
        toolbar +=" <a onClick='displayAllTasks(\"defenses\");'>[Defenses]</a>";
        toolbar +=" <a onClick='displayAllTasks(\"tasks\");'>[Tasks]</a>";
    }

    toolbarDiv.innerHTML=toolbar;

    $('#flash_messages').before(toolbarDiv);
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

// this is inserted Javascript, not user script!
function displayAllTasks(tabName) {
    var thePlanet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        thePlanet = activatePlanet;

    // It's a mistake to do anything at all for the Resources tab, it's the default and we only make it flicker and redisplay...
    if (tabName !== "resources") {
        document.cookie="allItemsTab="+tabName+";path=/";
    }
    window.location.href = "/overview?current_planet=" + thePlanet;
}

// this is inserted Javascript, not user script!
function toggleModuleEnabled() {
    console.log("TOGGLE ENABLE");
    document.cookie="toggleModuleEnabled=toggle;path=/";
    location.reload();
}

// Display BOJ message on Profile screen
function insertProfileHeader($,moduleEnabled) {

    var isEnabled='';
    var active='DISABLED';
    if (moduleEnabled) {
        isEnabled='checked';
        active='ACTIVE';
    }
    emitNotification($,
        '<input type="checkbox" '+isEnabled+' onClick="toggleModuleEnabled();"> \
Starfleet Commander Advantage -  All Planets \
(version ' + GM_info.script.version + '): ' + active);
}

function showTop() {
    // having injected style CSS the only way to alter it is to inject more :( //TODO: research another way?

    var myCSS = "";
    // Before StyleBot it was pretty simple:
    myCSS += '#resources_table {';
    myCSS += '    display: block;';
    myCSS += '}';

    myCSS += 'div.navigation_bar {';
    myCSS += '    display: block;';
    myCSS += '}';

    myCSS += '#planet_sub_nav {';
    myCSS += '    display: block;';
    myCSS += '}';

    // Stylebot demands a bit more:
    //myCSS += 'div.resources.starfleet.eradeon {';
    myCSS += '#resources_table.starfleet {';
    myCSS += '    display: block !important;';
    myCSS += '}';

    myCSS += 'div.navigation_bar {';
    myCSS += '    display: block !important;';
    myCSS += '}';

    // For overriding StyleBot
    myCSS += '#the_nav_bar {';
    myCSS += '    display: block !important;';
    myCSS += '}';

    //myCSS += 'div.sub_nav {';
    myCSS += 'div#planet_sub_nav.sub_nav {';
    myCSS += '    display: block !important;';
    myCSS += '}';

    myCSS += ".myLessFancyStatusBox {";
    myCSS += '    display: none;';
    myCSS += '}';

    addGlobalStyle(myCSS);

}

function hideTop() {
    // using CSS not $().hide() so to affect the screen before document ready

    var myCSS = "";
    //myCSS += 'div.resources.starfleet.eradeon {';
    myCSS += '#resources_table {';
    myCSS += '    display: none;';
    myCSS += '}';

    myCSS += 'div.navigation_bar {';
    myCSS += '    display: none;';
    myCSS += '}';

    myCSS += '#planet_sub_nav {';
    myCSS += '    display: none;';
    myCSS += '}';

    addGlobalStyle(myCSS);

}


function menuInit() {
    var menu = localStorage['SFCA_menu'];
    if (typeof menu == "undefined") {
        localStorage['SFCA_menu'] = 'off';
        menu = 'off';
    }

// If we're showing ours, hide theirs
    if (menu === 'on') {
        hideTop();
    } else {
        /**
         * In the dev lab we use StyleBot to suppress their top menu, so ours shows with no flicker.
         * In this case we have to force it to show up even as StyleBot hides it.
         *
         * In someone else's production environment without StyleBot the following does nothing,
         * and when our menu is shown there is a little bit of flicker. Nothing more to do about it...
         */
        // Must add an id for greater specificity for our force...
        var x = document.getElementsByClassName("navigation_bar");
        x[0].setAttribute("id", "the_nav_bar");
        showTop();
    }

}

function menuDisplay($, thePlanet, additionalItems) {
    var menuToggle = localStorage['SFCA_menu'];
    if (menuToggle == "on") {
        //var myMenu='<a id="buttonToggleMenus">[Full Menu]</a> <a href="/fleet?current_planet='+thePlanet+'">[Fleet]</a>';
        var myMenu = '<a id="buttonToggleMenus">[Full Menu]</a> <a id="buttonGoBuildings">[Buildings]</a> <a id="buttonGoFleet">[Fleet]</a> <a id="buttonGoShipyard">[Shipyard]</a>' +
            ' <a id="buttonBuild">[Build]</a>';
        myMenu += '<br /><br />' + additionalItems;
        emitStatusMessage(myMenu, false);
        $('#buttonToggleMenus').click(function () {
            localStorage['SFCA_menu'] = 'off';
            var x = document.getElementsByClassName("navigation_bar");
            x[0].setAttribute("id", "the_nav_bar");
            showTop();
        });
        $('#buttonGoBuildings').click(function () {
            window.location.href = "/buildings/home?current_planet=" + thePlanet;
        });
        $('#buttonGoFleet').click(function () {
            window.location.href = "/fleet?current_planet=" + thePlanet;
        });
        $('#buttonGoShipyard').click(function () {
            window.location.href = "/buildings/shipyard?current_planet=" + thePlanet;
        });
        $('#buttonBuild').click(function () {
            console.log("build");

            $('#build_amount_2073344062').val(40); // one is fine for the test button...

            disable_ajax_links();

            //new Ajax.Request('/buildings/shipyard/build/950199677?current_planet=' + thePlanet,
            //    {asynchronous:true, evalScripts:true, parameters:Form.Element.serialize('build_amount_950199677')});


            new Ajax.Request('/buildings/shipyard/build/2073344062?current_planet=' + thePlanet,
                {asynchronous: true, evalScripts: true, parameters: Form.Element.serialize('build_amount_2073344062')});
            console.log("built");

        });


    } else {
        emitStatusMessage(additionalItems, true);
    }


    var ourButton = $('<span />').attr('class', 'nav_item').html('<a id="buttonSFCA">SFCA</a>');
    ourButton.prependTo('#planet_sub_nav');
    $('#buttonSFCA').click(function () {
        localStorage['SFCA_menu'] = 'on';

        console.log("TRY HARDER");
        location.reload();
    });
}


function addMyCSS() {
    // Status messages...
    var myCSS = ".myLessFancyStatusBox {";
    myCSS += "color: white;";
    myCSS += "background-image:url(/images/starfleet/layout/transparent_grey_bg.png);";
    myCSS += "border:1px solid #006C82;";
    myCSS += "padding:10px;";
    myCSS +=" margin-bottom:1em;";
    myCSS +="}";

    myCSS += '#myToolbar {';
    myCSS += 'background-image: url(/images/starfleet/layout/transparent_grey_bg.png);';
    myCSS += 'border: 1px solid yellow;';
    myCSS += 'margin-left: -10px;';
    myCSS += 'margin-bottom: 5px;';
    myCSS += 'padding: 10px 10px 10px 20px;';
    myCSS += '}';

    addGlobalStyle(myCSS);
}


// Extend the base function to provide separation between the differnet versions...
function myGMsetValue(param, value) {
    var uni=window.location.href.split('.')[0].split('/')[2];
    //console.log('Setting '+uni+'-'+param+'='+value);
    GM_setValue(uni+'-'+param, value);
}

function myGMgetValue(param, def) {
    var uni=window.location.href.split('.')[0].split('/')[2];
    var needDefault = "NoSuchValueStoredHere";
    var val = GM_getValue(uni+'-'+param, needDefault);
    //console.log('fetched '+uni+'-'+param+'='+val);
    if (val == needDefault)
        return def;
    else
        return val;
}
/*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
 *
 *             M A I N L I N E
 *
 *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/
jQuery( document ).ready(function( $ ) {
    var thePlanet = gup('current_planet');
    var activatePlanet = gup('activate_planet');
    if (activatePlanet.length)
        thePlanet = activatePlanet;
    var uni = window.location.href.split('.')[0].split('/')[2];


    // Much ado about enablement, in the original version people would want to carefully turn modules on and off...
    var m = myGMgetValue('enabled_AllPlanets','true');
    var moduleEnabled=(m ==='true');

    var doToggle = getCookie('toggleModuleEnabled');
    if (doToggle === 'toggle') {
        document.cookie = "toggleModuleEnabled=; expires=Sun, 04 Jul 1970 00:00:00 UTC";
        if (moduleEnabled) {
            myGMsetValue('enabled_AllPlanets','false');
            moduleEnabled=false;
        } else {
            myGMsetValue('enabled_AllPlanets','true');
            moduleEnabled=true;
        }
    }

    /**
     * This has no value...
    var displayEnabled='DISABLED';
    if (moduleEnabled)
        displayEnabled='enabled';
    var myVersion = GM_info.script.version;
    console.log ('AllPlanets ver', myVersion, displayEnabled);
     */

    /***
     * When the All Planets overview is displayed, if we got here from a click on our toolbar, switch to the appropriate tab.
     *
     * Developer note: Plain javascript cookies are employed to track what the user wants to do, from the onClick event to the
     * subsequent page load. The onClick handler is injected into the page so is not userscript, and has no access to GM_setValue.
     ***/
    if ( $('#content.overview.index').length ) {

        //var showAllTasks = getCookie('alltasks'); //TODO: superfluous, get rid of it.
        //document.cookie = "alltasks=; expires=Sun, 04 Jul 1976 00:00:00 UTC";

        var tabName = getCookie('allItemsTab');
        document.cookie = "allItemsTab=; expires=Sun, 04 Jul 1976 00:00:00 UTC";

        if (tabName.length) {
            disable_ajax_links();
            new Ajax.Request('/overview/'+ tabName + '?current_planet=34287', {asynchronous:true, evalScripts:true});
        }
    }

    // Display BOJ message with version on Profile screen
    if ( $('#content.options.index').length ) {
        insertProfileHeader($,moduleEnabled);
    } else {
        addMyToolbar($,moduleEnabled);
    }

    // Primordial indeed, this button is going to be the key to developing the early planet auto-builder...
    var goalie = new Goalie($);
    var growLinks = '';
    if (goalie.isPrimordial()) {
        if (typeof localStorage[uni + '-growMode'] !== "undefined") {
            growLinks = '<a style="color: #5eff00;" href="#" id="noGrowButton">[No Grow!]</a> ';
        } else {
            growLinks = '<a style="color: #5eff00;" href="#" id="growButton">[Grow!]</a> ';
        }
    }

    // Our menu... I should finish it, for now just display the status (and grow option)
    var additionalItems = '<div class="growth">' +
        growLinks +
        localStorage[uni + '-' + 'techStatus_' + thePlanet] + '</div>';
    menuDisplay($, thePlanet, additionalItems);

    // The button!!
    $('#growButton').click(function () {
        console.log("Must grow!!");
        localStorage[uni + '-growMode'] = 'grow';
    });
    $('#noGrowButton').click(function () {
        console.log("Enough with the grow!!");
        localStorage.removeItem(uni + '-growMode');
    });

});

//console.log("BOJ AllPlanets");
addMyCSS();
myAttachIt(displayAllTasks);
myAttachIt(toggleModuleEnabled);
myAttachIt(gup);

// If we're showing ours, hide theirs
menuInit();