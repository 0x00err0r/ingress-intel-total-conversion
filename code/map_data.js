
// MAP DATA //////////////////////////////////////////////////////////
// these functions handle how and which entities are displayed on the
// map. They also keep them up to date, unless interrupted by user
// action.


// sets the timer for the next auto refresh. Ensures only one timeout
// is queued. May be given 'override' in milliseconds if time should
// not be guessed automatically. Especially useful if a little delay
// is required, for example when zooming.
window.startRefreshTimeout = function(override) {
  // may be required to remove 'paused during interaction' message in
  // status bar
  window.renderUpdateStatus();
  if(refreshTimeout) clearTimeout(refreshTimeout);
  if(override) {
    console.log('refreshing in ' + override + 'ms');
    refreshTimeout = setTimeout(window.requestData, override);
    return;
  }
  var t = REFRESH*1000;
  var adj = ZOOM_LEVEL_ADJ * (18 - window.map.getZoom());
  if(adj > 0) t += adj*1000;
  console.log("next auto refresh in " + t/1000 + " seconds.");
  refreshTimeout = setTimeout(window.requestData, t);
}

// requests map data for current viewport. For details on how this
// works, refer to the description in “MAP DATA REQUEST CALCULATORS”
window.requestData = function() {
  if(window.idleTime >= MAX_IDLE_TIME) {
    console.log('user has been idle for ' + idleTime + ' minutes. Skipping refresh.');
    renderUpdateStatus();
    return;
  }

  console.log('refreshing data');
  requests.abort();
  cleanUp();

  var magic = convertCenterLat(map.getCenter().lat);
  var R = calculateR(magic);

  var bounds = map.getBounds();
  // convert to point values
  topRight = convertLatLngToPoint(bounds.getNorthEast(), magic, R);
  bottomLeft = convertLatLngToPoint(bounds.getSouthWest() , magic, R);
  // how many quadrants intersect the current view?
  quadsX = Math.abs(bottomLeft.x - topRight.x);
  quadsY = Math.abs(bottomLeft.y - topRight.y);

  // will group requests by second-last quad-key quadrant
  tiles = {};

  // walk in x-direction, starts right goes left
  for(var i = 0; i <= quadsX; i++) {
    var x = Math.abs(topRight.x - i);
    var qk = pointToQuadKey(x, topRight.y);
    var bnds = convertPointToLatLng(x, topRight.y, magic, R);
    if(!tiles[qk.slice(0, -1)]) tiles[qk.slice(0, -1)] = [];
    tiles[qk.slice(0, -1)].push(generateBoundsParams(qk, bnds));

    // walk in y-direction, starts top, goes down
    for(var j = 1; j <= quadsY; j++) {
      var qk = pointToQuadKey(x, topRight.y + j);
      var bnds = convertPointToLatLng(x, topRight.y + j, magic, R);
      if(!tiles[qk.slice(0, -1)]) tiles[qk.slice(0, -1)] = [];
      tiles[qk.slice(0, -1)].push(generateBoundsParams(qk, bnds));
    }
  }

  // finally send ajax requests
  $.each(tiles, function(ind, tls) {
    data = { minLevelOfDetail: -1 };
    data.boundsParamsList = tls;
    window.requests.add(window.postAjax('getThinnedEntitiesV2', data, window.handleDataResponse));
  });
}

// works on map data response and ensures entities are drawn/updated.
window.handleDataResponse = function(data, textStatus, jqXHR) {
  // remove from active ajax queries list
  window.requests.remove(jqXHR);
  if(!data || !data.result) {
    console.warn(data);
    return;
  }

  var portalUpdateAvailable = false;
  var m = data.result.map;
  $.each(m, function(qk, val) {
    $.each(val.deletedGameEntityGuids, function(ind, guid) {
      window.removeByGuid(guid);
    });

    $.each(val.gameEntities, function(ind, ent) {
      // ent = [GUID, id(?), details]
      // format for links: { controllingTeam, creator, edge }
      // format for portals: { controllingTeam, turret }

      if(ent[2].turret !== undefined) {
        if(selectedPortal == ent[0]) portalUpdateAvailable = true;

        portalsDetail[ent[0]] = ent[2];
        // immediately render portal details if selected by URL
        if(urlPortal && ent[0] == urlPortal && !selectedPortal) {
          urlPortal = null; // only pre-select it once
          window.renderPortalDetails(ent[0]);
        }
        renderPortal(ent);
      } else if(ent[2].edge !== undefined)
        renderLink(ent);
      else if(ent[2].capturedRegion !== undefined)
        renderField(ent);
      else
        throw('Unknown entity: ' + JSON.stringify(ent));
    });
  });

  $.each(portals, function(ind, portal) {
    // otherwise some portals will not be clickable. See
    // https://github.com/Leaflet/Leaflet/issues/185
    portal.bringToFront();
  });

  if(portals[selectedPortal]) portals[selectedPortal].bringToFront();

  if(portalUpdateAvailable) renderPortalDetails(selectedPortal);
  resolvePlayerNames();
}

// removes entities that are still handled by Leaflet, although they
// do not intersect the current viewport.
window.cleanUp = function() {
  var cnt = [0,0,0];
  var b = map.getBounds();
  portalsLayer.eachLayer(function(portal) {
    if(b.contains(portal.getLatLng())) return;
    cnt[0]++;
    portalsLayer.removeLayer(portal);
  });
  linksLayer.eachLayer(function(link) {
    if(b.intersects(link.getBounds())) return;
    cnt[1]++;
    linksLayer.removeLayer(link);
  });
  fieldsLayer.eachLayer(function(field) {
    if(b.intersects(field.getBounds())) return;
    cnt[2]++;
    fieldsLayer.removeLayer(field);
  });
  console.log('removed out-of-bounds: '+cnt[0]+' portals, '+cnt[1]+' links, '+cnt[2]+' fields');
}

// removes given entity from map
window.removeByGuid = function(guid) {
  // portals end in “.11” or “.12“, links in “.9", fields in “.b”
  // .c == player/creator
  switch(guid.slice(33)) {
    case '11':
    case '12':
      if(!window.portals[guid]) return;
      portalsLayer.removeLayer(window.portals[guid]);
      break;
    case '9':
      if(!window.links[guid]) return;
      linksLayer.removeLayer(window.links[guid]);
      break;
    case 'b':
      if(!window.fields[guid]) return;
      fieldsLayer.removeLayer(window.fields[guid]);
      break;
    default:
      console.warn('unknown GUID type: ' + guid);
      window.debug.printStackTrace();
  }
}



// renders a portal on the map from the given entity
window.renderPortal = function(ent) {
  removeByGuid(ent[0]);
  var latlng = [ent[2].locationE6.latE6/1E6, ent[2].locationE6.lngE6/1E6];
  if(!map.getBounds().contains(latlng)) return;

  // pre-load player names for high zoom levels
  if(map.getZoom() >= PRECACHE_PLAYER_NAMES_ZOOM) {
    if(ent[2].captured && ent[2].captured.capturingPlayerId)
      getPlayerName(ent[2].captured.capturingPlayerId);
    if(ent[2].resonatorArray && ent[2].resonatorArray.resonators)
      $.each(ent[2].resonatorArray.resonators, function(ind, reso) {
        if(reso) getPlayerName(reso.ownerGuid);
      });
  }

  var team = getTeam(ent[2]);

  var p = L.circleMarker(latlng, {
    radius: 7,
    color: ent[0] == selectedPortal ? COLOR_SELECTED_PORTAL : COLORS[team],
    opacity: 1,
    weight: 3,
    fillColor: COLORS[team],
    fillOpacity: 0.5,
    clickable: true,
    guid: ent[0]});

  p.on('remove',   function() { delete window.portals[this.options.guid]; });
  p.on('add',      function() { window.portals[this.options.guid] = this; });
  p.on('click',    function() { window.renderPortalDetails(ent[0]); });
  p.on('dblclick', function() {
    window.renderPortalDetails(ent[0]);
    window.map.setView(latlng, 17);
  });
  p.addTo(portalsLayer);
}

// renders a link on the map from the given entity
window.renderLink = function(ent) {
  removeByGuid(ent[0]);
  var team = getTeam(ent[2]);
  var edge = ent[2].edge;
  var latlngs = [
    [edge.originPortalLocation.latE6/1E6, edge.originPortalLocation.lngE6/1E6],
    [edge.destinationPortalLocation.latE6/1E6, edge.destinationPortalLocation.lngE6/1E6]
  ];
  var poly = L.polyline(latlngs, {
    color: COLORS[team],
    opacity: 0.5,
    weight:2,
    clickable: false,
    guid: ent[0]
  });

  if(!map.getBounds().intersects(poly.getBounds())) return;

  poly.on('remove', function() { delete window.links[this.options.guid]; });
  poly.on('add',    function() { window.links[this.options.guid] = this; });
  poly.addTo(linksLayer);
}

// renders a field on the map from a given entity
window.renderField = function(ent) {
  window.removeByGuid(ent[0]);
  var team = getTeam(ent[2]);
  var reg = ent[2].capturedRegion;
  var latlngs = [
    [reg.vertexA.location.latE6/1E6, reg.vertexA.location.lngE6/1E6],
    [reg.vertexB.location.latE6/1E6, reg.vertexB.location.lngE6/1E6],
    [reg.vertexC.location.latE6/1E6, reg.vertexC.location.lngE6/1E6]
  ];
  var poly = L.polygon(latlngs, {
    fillColor: COLORS[team],
    fillOpacity: 0.25,
    stroke: false,
    clickable: false,
    guid: ent[0]});

  if(!map.getBounds().intersects(poly.getBounds())) return;

  poly.on('remove', function() { delete window.fields[this.options.guid]; });
  poly.on('add',    function() { window.fields[this.options.guid] = this; });
  poly.addTo(fieldsLayer);
}
