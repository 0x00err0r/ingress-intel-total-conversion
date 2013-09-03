// ==UserScript==
// @id             iitc-plugin-draw-resonators@xelio
// @name           IITC plugin: Draw resonators
// @category       Layer
// @version        0.1.0.@@DATETIMEVERSION@@
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Draw resonators on map.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////

// use own namespace for plugin
window.plugin.drawResonators = function() {};


window.plugin.drawResonators.options;
window.plugin.drawResonators.render;



//////// Render for handling render of resonators ////////



window.plugin.drawResonators.Render = function(options) {
  this.enableZoomLevel = options['enableZoomLevel'];
  this.useStyler = options['useStyler'];

  this.stylers = {};
  this.resonators = {};
  this.resonatorLayerGroup = new L.LayerGroup();
  
  this.portalAdded = this.portalAdded.bind(this);
  this.createResonatorEntities = this.createResonatorEntities.bind(this);
  this.deleteResonatorEntities = this.deleteResonatorEntities.bind(this);
  this.clearResonatorEntitiesAfterZoom = this.clearResonatorEntitiesAfterZoom.bind(this);
};

window.plugin.drawResonators.Render.prototype.registerHook = function() {
  window.addHook('portalAdded', this.portalAdded);
  window.map.on('zoomend', this.clearResonatorEntitiesAfterZoom);
}

window.plugin.drawResonators.Render.prototype.portalAdded = function(data) {
  var marker = data.portal;
  var render = this;

  marker.on('add', function() {
    render.createResonatorEntities(this); // the 'this' in here is the portal.
  });

  marker.on('remove', function() {
    render.deleteResonatorEntities(this.options.guid); // the 'this' in here is the portal.
  });
}

window.plugin.drawResonators.Render.prototype.createResonatorEntities = function(portal) {
  // TODO: create all resonators and connectors, add them to a layergroup with portal guid, 
  //       and add to this.resonatorLayerGroup
}

window.plugin.drawResonators.Render.prototype.deleteResonatorEntities = function(portalGuid) {
  if (portalGuid in this.resonators) {
    var r = this.resonators[portalGuid];
    this.resonatorLayerGroup.removeLayer(r);
    delete this.resonators[portalGuid];
  }
}

window.plugin.drawResonators.Render.prototype.clearResonatorEntitiesAfterZoom = function() {
  if(!this.isResonatorsShow()) {
    this.resonatorLayerGroup.clearLayers();
    this.resonators = {};
  }
}

window.plugin.drawResonators.Render.prototype.addStyler = function(styler) {
  this.stylers[styler.name] = styler;
}

window.plugin.drawResonators.Render.prototype.getStylersList = function() {
  return Object.keys(this.stylers);
}

window.plugin.drawResonators.Render.prototype.changeStyler = function(name) {
  // TODO: check whether styler has change, and update style of all resonators
}

window.plugin.drawResonators.Render.prototype.isResonatorsShow = function() {
  return map.getZoom() >= this.enableZoomLevel;
}



//////// Styler for getting resonator and connector style ////////



window.plugin.drawResonators.Styler = function(options) {
  this.name = options['name'] || 'default';
  this.getResonatorStyle = options['resonatorStyleFunc'] || this.defaultResonatorStyle;
  this.getConnectorStyle = options['connectorStyleFunc'] || this.defaultConnectorStyle;
}

window.plugin.drawResonators.Styler.prototype.DEFAULT_OPTIONS_RESONATOR_SELECTED = {
  color: '#fff',
  weight: 2,
  radius: 4,
  opacity: 1,
  clickable: false};

window.plugin.drawResonators.Styler.prototype.DEFAULT_OPTIONS_RESONATOR_NON_SELECTED = {
  color: '#aaa',
  weight: 1,
  radius: 3,
  opacity: 1,
  clickable: false};

window.plugin.drawResonators.Styler.prototype.DEFAULT_OPTIONS_RESONATOR_LINE_SELECTED = {
  opacity: 0.7,
  weight: 3,
  color: '#FFA000',
  dashArray: '0,10' + (new Array(25).join(',8,4')),
  fill: false,
  clickable: false};

window.plugin.drawResonators.Styler.prototype.DEFAULT_OPTIONS_RESONATOR_LINE_NON_SELECTED = {
  opacity: 0.25,
  weight: 2,
  color: '#FFA000',
  dashArray: '0,10' + (new Array(25).join(',8,4')),
  fill: false,
  clickable: false};

window.plugin.drawResonators.Styler.prototype.defaultResonatorStyle = function(resoDetail, selected) {
  var resoSharedStyle = selected 
                ? this.DEFAULT_OPTIONS_RESONATOR_SELECTED
                : this.DEFAULT_OPTIONS_RESONATOR_NON_SELECTED;

  var resoStyle = $.extend({
        fillColor: COLORS_LVL[resoDetail.level],
        fillOpacity: rdata.energyTotal/RESO_NRG[resoDetail.level],
      }, resoSharedStyle);

  return resoStyle;
}

window.plugin.drawResonators.Styler.prototype.defaultConnectorStyle = function(resoDetail, selected) {
  var connStyle  = selected 
                ? this.DEFAULT_OPTIONS_RESONATOR_LINE_SELECTED
                : this.DEFAULT_OPTIONS_RESONATOR_LINE_NON_SELECTED;

  return connStyle;
}



//////// Options for storing and loading options ////////

window.plugin.drawResonators.Options = function() {
  this.enableZoomLevel = this.loadLocal(this.STORAGE_ENABLE_ZOOM_LEVEL);
  this.useStyler = this.loadLocal(this.STORAGE_USE_STYLER);
}

window.plugin.drawResonators.Options.prototype.options = {};

window.plugin.drawResonators.Options.prototype.options['enableZoomLevel'] = {
  key: 'plugin-drawResonators-enableZoomLevel',
  defaultValue: 17};

window.plugin.drawResonators.Options.prototype.options['useStyler'] = {
  key: 'plugin-drawResonators-useStyler',
  defaultValue: 'default'};

window.plugin.drawResonators.Options.prototype.changeOption = function(name, value) {
  if(!name in options) return false;

  this[name] = value;
  this.storeLocal(options[name], this[name]);
}

window.plugin.drawResonators.Options.prototype.loadLocal = function(mapping) {
  var objectJSON = localStorage[mapping.key];
  if(!objectJSON) {
    return mapping.defaultValue;
  } else {
    return JSON.parse(objectJSON);
  }
}

window.plugin.drawResonators.Options.prototype.storeLocal = function(mapping, value) {
  if(typeof(value) !== 'undefined' && value !== null) {
    localStorage[mapping.key] = JSON.stringify(value);
  } else {
    localStorage.removeItem(mapping.key);
  }
}




var setup =  function() {
  window.plugin.drawResonators.options = new Options();
  var renderOptions = {
    'enableZoomLevel': options.enableZoomLevel,
    'useStyler': options.useStyler};

  window.plugin.drawResonators.render = new Render(renderOptions);
  window.plugin.drawResonators.render.registerHook();
  window.addLayerGroup('Resonators', window.plugin.drawResonators.render.resonatorLayerGroup, true);
  
  // TODO: add runHooks('portalSelected', {oldSelectedPortalGuid, newSelectedPortalGuid});
  //       to window.selectPortal, and update style of resonators

  // TODO: add options dialog to change options
}

// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@
