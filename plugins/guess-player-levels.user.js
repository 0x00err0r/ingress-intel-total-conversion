// ==UserScript==
// @id             iitc-plugin-guess-player-levels@breunigs
// @name           iitc: guess player level
// @version        0.1
// @namespace      https://github.com/breunigs/ingress-intel-total-conversion
// @updateURL      https://raw.github.com/breunigs/ingress-intel-total-conversion/gh-pages/plugins/guess-player-levels.user.js
// @downloadURL    https://raw.github.com/breunigs/ingress-intel-total-conversion/gh-pages/plugins/guess-player-levels.user.js
// @description    Tries to determine player levels from the data available in the current view
// @include        http://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// ==/UserScript==

function wrapper() {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};


// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.guessPlayerLevels = function() {};

window.plugin.guessPlayerLevels.setupCallback = function() {
  $('#toolbox').append('<a onclick="window.plugin.guessPlayerLevels.guess()">guess player levels</a> ');
}

window.plugin.guessPlayerLevels.guess = function() {
  var players = {};
  $.each(window.portals, function(ind, portal) {
    var r = portal.options.details.resonatorArray.resonators;
    $.each(r, function(ind, reso) {
      if(!reso) return true;
      var p = reso.ownerGuid;
      var l = reso.level;
      if(!players[p] || players[p] < l) players[p] = l;
    });
  });

  var playersNamed = {};
  $.each(players, function(guid, level) {
    playersNamed[getPlayerName(guid)] = level;
  });

  var s = 'the players have at least the following level:\n\n';
  $.each(Object.keys(playersNamed).sort(), function(ind, playerName) {
    var level = playersNamed[playerName];
    var nick = (playerName + ':                              ').slice(0, 20);
    s += nick + '\t' + level + '\n';
  });

  s += '\n\nIf there are some unresolved names, simply try again.'

  alert(s);
}

var setup = window.plugin.guessPlayerLevels.setupCallback;

// PLUGIN END //////////////////////////////////////////////////////////

if(window.iitcLoaded && typeof setup === 'function') {
  setup();
} else {
  if(window.bootPlugins)
    window.bootPlugins.push(setup);
  else
    window.bootPlugins = [setup];
}
} // wrapper end
// inject code into site context
var script = document.createElement('script');
script.appendChild(document.createTextNode('('+ wrapper +')();'));
(document.body || document.head || document.documentElement).appendChild(script);
