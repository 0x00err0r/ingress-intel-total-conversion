
// REQUEST HANDLING //////////////////////////////////////////////////
// note: only meant for portal/links/fields request, everything else
// does not count towards “loading”

window.activeRequests = [];
window.failedRequestCount = 0;

window.requests = function() {}

window.requests.add = function(ajax) {
  window.activeRequests.push(ajax);
  renderUpdateStatus();
}

window.requests.remove = function(ajax) {
  window.activeRequests.splice(window.activeRequests.indexOf(ajax), 1);
  renderUpdateStatus();
}

window.requests.abort = function() {
  $.each(window.activeRequests, function(ind, actReq) {
    if(actReq) actReq.abort();
  });
  window.activeRequests = [];
  window.failedRequestCount = 0;

  startRefreshTimeout();
  renderUpdateStatus();
}

// gives user feedback about pending operations. Draws current status
// to website.
window.renderUpdateStatus = function() {
  var t = '<b>map status:</b> ';
  if(mapRunsUserAction)
    t += 'paused during interaction';
  else if(isIdle())
    t += 'Idle, not updating.';
  else if(window.activeRequests.length > 0)
    t += window.activeRequests.length + ' requests running';
  else
    t += 'Up to date.';

  if(window.failedRequestCount > 0)
    t += ' ' + window.failedRequestCount + ' requests  failed.'

  t += '<br/><span title="not removing portals as long as you keep them in view, though">(';
  var conv = ['impossible', 8,8,7,7,6,6,5,5,4,4,3,3,2,2,1];
  var z = map.getZoom();
  if(z >= 16)
    t += 'requesting all portals';
  else
    t+= 'only requesting portals with level '+conv[z]+' and up';
  t += ')</span>';

  $('#updatestatus').html(t);
}
