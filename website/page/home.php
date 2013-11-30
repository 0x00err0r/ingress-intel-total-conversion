<h2>Welcome</h2>

<p>
Welcome to the home page of <abbr title="Ingress Intel Total Conversion">IITC</abbr>.
</p>

<p>
IITC is a browser add-on that modifies the Ingress intel map. It is faster than the standard site, and
offers many more features. It is available for
<a href="?page=desktop">desktop browsers</a>, such as Chrome and Firefox, and as a
<a href="?page=mobile">mobile application</a>.
</p>

<h3>Latest news</h3>

<div class="alert alert-block alert-error">
<h4>27th November 2013</h4>
<p>
IITC and IITC Mobile are currently broken, due to changes made to the standard intel website. This is a major change in how
portal details are sent, with most of the extra data that the standard site didn't use being removed.
</p>
<p>
This is not something simple to fix, and will take some time. Also, it severely cripples what IITC can do, as using this
extra data, not displayed by the standard site, was its big feature.
</p>
<p>
We will look into what can be done to get it working again, but it will take some time. Many plugins won't be practical 
as the data will not be available.
</p>
<p>
More details, and discussion, available in the
<a href="https://plus.google.com/105383756361375410867/posts/E65qngRjR2T">Google+ post</a>.
</p>
<p>
<b>Update</b> I've created a 'dummy' version of the desktop plugin that will, for now, disable IITC if you leave it installed.
This is shown as version 0.15.99. When a fixed build is released, it will be 0.16.something and will update and start working.
Test versions remain, but broken. Please join the Google+ Community where announcements will be made.
</p>
</div>

<h4>11th November 2013</h4>
<p>
IITC 0.15.0 and IITC Mobile 0.9 have just been released. This update fixes things to work with the latest changes
to the standard intel site. Also
<ul>
<li>Support for Jarvis shards (and other future artifacts)</li>
<li>New base map plugins - for <a href="http://maps.stamen.com/">maps.stamen.com/</a> and Bing maps.</li>
</ul>
</p>

<h4>7th November 2013</h4>
<p>
IITC 0.14.6 and IITC Mobile 0.7.7.2 released. Another change needed to match a minor update to the standard intel site.
</p>

<h4>6th November 2013</h4>
<p>
IITC 0.14.5 and IITC Mobile 0.7.7.1 have been released. This contains a fix to work with the latest intel site updates.
Other than this, it is identical to the 0.14.4/0.7.7 release.
</p>

<h4>29th October 2013</h4>
<p>
IITC 0.14.4 and IITC Mobile 0.7.7 have just been released. A critical update required to work with changes made to the
standard intel site. Changes include
<ul>
<li>Fix to geodesic circle drawing. They were not correctly distorted, leading to incorrect link ranges drawn on the map.</li>
<li>Bookmarks plugin: add layer and highlighter to indicate bookmarked portals</li>
<li>Player tracker plugin: markers fade for older activity, and separate layers for each faction</li>
<li>The 'About IITC' dialog now lists which plugins are installed. This may not work correctly for 3rd party plugins at this time</li>
<li>Mobile:
 <ul>
 <li>Custom fullscreen preferences</li>
 <li>Install to SD Card</li>
 <li>Cache move to SD card option (hence the new permissions)</li>
 </ul>
</li>
<li>... and, as always, various bugfixes and improvements.</li>
</ul>
</p>
<p>
<b>3RD PARTY PLUGIN AUTHORS</b>: The plugin wrapper code has been modified to pass through the additional version
information. While existing plugins should continue to work, I highly recommend updating the wrapper code in your
scripts to match.
</p>

<h4>16th October 2013</h4>
<p>
IITC 0.14.3 and IITC Mobile 0.7.4 have just been released. This is a critical update required to work with the latest
changes Niantic have made to the standard intel site. Additionally, the draw-tools plugin now snaps points to portals
when creating lines/polygons/markers (was actually in 0.14.2 release), a bugfix relating to IITC not realising who 
'you' are, causing some highlighters to break, and a handful of other tweaks/bugfixes.
</p>

<a class="btn btn-small" href="?page=news">Older news</a>
