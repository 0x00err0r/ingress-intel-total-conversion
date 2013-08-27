// MAP DATA REQUEST ///////////////////////////////////////////////////
// class to request the map data tiles from the Ingress servers
// and then pass it on to the render class for display purposes
// Uses the map data cache class to reduce network requests


window.MapDataRequest = function() {
  this.cache = new DataCache();
  this.render = new Render();
  this.debugTiles = new RenderDebugTiles();

  this.activeRequestCount = 0;
  this.requestedTiles = {};

  // no more than this many requests in parallel
  this.MAX_REQUESTS = 4;
  // no more than this many tiles in one request
  this.MAX_TILES_PER_REQUEST = 16;
  // but don't create more requests if it would make less than this per request
  this.MIN_TILES_PER_REQUEST = 4;

  // number of times to retty a tile after a 'bad' error (i.e. not a timeout)
  this.MAX_TILE_RETRIES = 3;

  // refresh timers
  this.MOVE_REFRESH = 2.5; //refresh time to use after a move
  this.STARTUP_REFRESH = 1; //refresh time used on first load of IITC
  this.IDLE_RESUME_REFRESH = 5; //refresh time used after resuming from idle
  this.REFRESH = 60;  //refresh time to use when not idle and not moving
}


window.MapDataRequest.prototype.start = function() {
  var savedContext = this;

  // setup idle resume function
  window.addResumeFunction ( function() { savedContext.refreshOnTimeout(savedContext.IDLE_RESUME_REFRESH); } );

  // and map move callback
  window.map.on('moveend', function() { savedContext.refreshOnTimeout(savedContext.MOVE_REFRESH); } );

  // and on movestart, we clear the request queue
  window.map.on('movestart', function() { savedContext.clearQueue(); } );

  // then set a timeout to start the first refresh
  this.refreshOnTimeout (this.MOVE_REFRESH);

}

window.MapDataRequest.prototype.refreshOnTimeout = function(seconds) {

  if (this.timer) {
    console.log("cancelling existing map refresh timer");
    clearTimeout(this.timer);
    this.timer = undefined;
  }


  console.log("starting map refresh in "+seconds+" seconds");

  // 'this' won't be right inside the callback, so save it
  var savedContext = this;
  this.timer = setTimeout ( function() { savedContext.timer = undefined; savedContext.refresh(); }, seconds*1000);
}


window.MapDataRequest.prototype.clearQueue = function() {
  this.tileBounds = {};
}


window.MapDataRequest.prototype.getStatus = function() {
  return { short: 'blah', long: 'blah blah blah' };

};


window.MapDataRequest.prototype.refresh = function() {

  this.cache.expire();

  this.debugTiles.reset();

  // a 'set' to keep track of hard failures for tiles
  this.tileErrorCount = {};

  // fill tileBounds with the data needed to request each tile
  this.tileBounds = {};


  var bounds = clampLatLngBounds(map.getBounds());
  var zoom = getPortalDataZoom();
  var minPortalLevel = getMinPortalLevelForZoom(zoom);

  window.runHooks ('mapDataRefreshStart', {bounds: bounds, zoom: zoom});

  this.render.startRenderPass(bounds);
  this.render.clearPortalsBelowLevel(minPortalLevel);

  console.log('requesting data tiles at zoom '+zoom+' (L'+minPortalLevel+'+ portals), map zoom is '+map.getZoom());


  var x1 = lngToTile(bounds.getWest(), zoom);
  var x2 = lngToTile(bounds.getEast(), zoom);
  var y1 = latToTile(bounds.getNorth(), zoom);
  var y2 = latToTile(bounds.getSouth(), zoom);

  // y goes from left to right
  for (var y = y1; y <= y2; y++) {
    // x goes from bottom to top(?)
    for (var x = x1; x <= x2; x++) {
      var tile_id = pointToTileId(zoom, x, y);
      var latNorth = tileToLat(y,zoom);
      var latSouth = tileToLat(y+1,zoom);
      var lngWest = tileToLng(x,zoom);
      var lngEast = tileToLng(x+1,zoom);

      this.debugTiles.create(tile_id,[[latSouth,lngWest],[latNorth,lngEast]]);

      if (this.cache.isFresh(tile_id) ) {
        // data is fresh in the cache - just render it
        this.debugTiles.setState(tile_id, 'cache-fresh');
        this.render.processTileData (this.cache.get(tile_id));
      } else {
        // no fresh data - queue a request
        var boundsParams = generateBoundsParams(
          tile_id,
          latSouth,
          lngWest,
          latNorth,
          lngEast
        );

        this.tileBounds[tile_id] = boundsParams;
      }
    }
  }


  this.processRequestQueue(true);
}




window.MapDataRequest.prototype.processRequestQueue = function(isFirstPass) {

  // if nothing left in the queue, end the render. otherwise, send network requests
  if (Object.keys(this.tileBounds).length == 0) {
    this.render.endRenderPass();

    console.log("finished requesting data!");

    window.runHooks ('mapDataRefreshEnd', {});

    if (!window.isIdle()) {
      this.refreshOnTimeout(this.REFRESH);
    } else {
      console.log("suspending map refresh - is idle");
    }
    return;
  }

  // create a list of tiles that aren't requested over the network
  var pendingTiles = {};
  for (var id in this.tileBounds) {
    if (!(id in this.requestedTiles) ) {
      pendingTiles[id] = true;
    }
  }

  console.log("- request state: "+Object.keys(this.requestedTiles).length+" tiles in "+this.activeRequestCount+" active requests, "+Object.keys(pendingTiles).length+" tiles queued");


  var requestTileCount = Math.min(this.MAX_TILES_PER_REQUEST,Math.max(this.MIN_TILES_PER_REQUEST, Object.keys(pendingTiles).length/this.MAX_REQUESTS));

  while (this.activeRequestCount < this.MAX_REQUESTS && Object.keys(pendingTiles).length > 0) {
    // let's distribute the requests evenly throughout the pending list.

    var pendingTilesArray = Object.keys(pendingTiles);

    var mod = Math.ceil(pendingTilesArray.length / requestTileCount);

    var tiles = [];
    for (var i in pendingTilesArray) {
      if ((i % mod) == 0) {
        id = pendingTilesArray[i];
        tiles.push(id);
        delete pendingTiles[id];
      }
    }

    console.log("-- asking for "+tiles.length+" tiles in one request");
    this.sendTileRequest(tiles);
  }

}


window.MapDataRequest.prototype.sendTileRequest = function(tiles) {

  var boundsParamsList = [];

  for (var i in tiles) {
    var id = tiles[i];

    this.debugTiles.setState (id, 'requested');

    this.requestedTiles[id] = true;

    var boundsParams = this.tileBounds[id];
    if (boundsParams) {
      boundsParamsList.push (boundsParams);
    } else {
      console.warn('failed to find bounds for tile id '+id);
    }
  }

  var data = { boundsParamsList: boundsParamsList };

  this.activeRequestCount += 1;

  var savedThis = this;

  window.requests.add (window.postAjax('getThinnedEntitiesV4', data, 
    function(data, textStatus, jqXHR) { savedThis.handleResponse (data, tiles, true); },  // request successful callback
    function() { savedThis.handleResponse (undefined, tiles, false); }  // request failed callback
  ));
}

window.MapDataRequest.prototype.requeueTile = function(id, error) {
  if (id in this.tileBounds) {
    // tile is currently wanted...

    // first, see if the error can be ignored due to retry counts
    if (error) {
      this.tileErrorCount[id] = (this.tileErrorCount[id]||0)+1;
      if (this.tileErrorCount[id] < this.MAX_TILE_RETRIES) {
        // retry limit low enough - clear the error flag
        error = false;
      }
    }

    if (error) {
      // if error is still true, retry limit hit. use stale data from cache if available
      var data = this.cache.get(id);
      if (data) {
        // we have cached data - use it, even though it's stale
        this.debugTiles.setState (id, 'cache-stale');
        this.render.processTileData (data);
        delete this.tileBounds[id];
      } else {
        // no cached data
        this.debugTiles.setState (id, 'error');
      }
      // and delete from the pending requests...
      delete this.tileBounds[id];

    } else {
      // if false, was a 'timeout', so unlimited retries (as the stock site does)
      this.debugTiles.setState (id, 'retrying');
    }
  }
}


window.MapDataRequest.prototype.handleResponse = function (data, tiles, success) {

  this.activeRequestCount -= 1;

  for (var i in tiles) {
    var id = tiles[i];
    delete this.requestedTiles[id];
  }


  if (!success || !data || !data.result) {
    console.warn("Request.handleResponse: request failed - requeing...");

    //request failed - requeue all the tiles(?)
    for (var i in tiles) {
      var id = tiles[i];
      this.requeueTile(id, true);
    }
  } else {

    // TODO: use result.minLevelOfDetail ??? stock site doesn't use it yet...

    var m = data.result.map;

    for (var id in m) {
      var val = m[id];

      if ('error' in val) {
        // server returned an error for this individual data tile

        if (val.error == "TIMEOUT") {
          // TIMEOUT errors for individual tiles are 'expected'(!) - and result in a silent unlimited retries
          this.requeueTile(id, false);
        } else {
          console.warn('map data tile '+id+' failed: error=='+val.error);
          this.requeueTile(id, true);
        }
      } else {
        // no error for this data tile - process it

        // store the result in the cache
        this.cache.store (id, val);

        // if this tile was in the render list, render it
        // (requests aren't aborted when new requests are started, so it's entirely possible we don't want to render it!)
        if (id in this.tileBounds) {
          this.debugTiles.setState (id, 'ok');

          this.render.processTileData (val);

          delete this.tileBounds[id];
        }
      }

    }
  }

  this.processRequestQueue();
}
