"use strict";

// just so that the bookmarklet also works here:
var BrowserPoniesBaseConfig = {};

var oldConfig = {};
var PonyScripts = {
	'browser-ponies-script': absUrl('browserponies.js'),
	'browser-ponies-config': absUrl('basecfg.js')
};

function loadingJson(script) {
	if (!script.readyState || script.readyState === "complete") {
		if (!document.body) {
			observe(window, 'load', function () {
				oldConfig = {};
				updateConfig();
			});
		}
		else {
			oldConfig = {};
			updateConfig();
		}
	}
}

if (typeof(JSON) === "undefined") {
	document.write('<script type="text/javascript" '+
		'src="https://raw.github.com/douglascrockford/JSON-js/master/json2.js" '+
		'onload="loadingJson(this)" '+
		'onreadystatechange="loadingJson(this)" '+
		'></script>');
}

function convertPonies () {
	try {
		var what = $('what').value;
		var src = $('input').value;
		var converted = what === 'Pony' ?
			BrowserPonies.convertPony(src, $('baseurl').value) :
			BrowserPonies.convertInteractions(src);
		$('output').value = typeof(JSON) === "undefined" ?
			"Your browser misses JSON support." :
			JSON.stringify(converted);
	}
	catch (e) {
		console.error(e);
		alert("Error during Conversion:\n"+e.name+": "+e.message);
	}
}

function wrapPonies () {
	try {
		var what = $('what').value;
		var src = $('input').value.replace(/^\s*'.*\n/gm,'').replace(/^\s*\n/gm,'');
		$('output').value = typeof(JSON) === "undefined" ?
			"Your browser misses JSON support." :
			JSON.stringify(
				what === 'Pony' ?
					{ini: src, baseurl: $('baseurl').value} :
					src);
	}
	catch (e) {
		console.error(e);
		alert("Error during Conversion:\n"+e.name+": "+e.message);
	}
}

function toggleBrowserPoniesToBackground () {
	var main = $('main');
	if (main.style.zIndex === '') {
		main.style.zIndex = '100000000';
	}
	else {
		main.style.zIndex = '';
	}
}

function ponyCode (config) {
	var code = '('+starter.toString()+')(';
	if (typeof(JSON) === "undefined") {
		code += '{},{});';
	}
	else {
		code += JSON.stringify(PonyScripts)+','+
			JSON.stringify(config)+');';
	}
	return code.replace(/^\s*\/\/.*\n/gm,' ').replace(/^\s*\n/gm,' ').replace(/\s\s+/g,' ');
}

function updateConfig () {
	var config = dumpConfig();
	var code = ponyCode(config);
	var iframeWidth  = getNumberFieldValue($('iframe-width'));
	var iframeHeight = getNumberFieldValue($('iframe-height'));

	$('bookmarklet').href = 'javascript:'+code+'void(0)';
	$('embedcode').value = '<script type="text/javascript">\n//<!--\n'+
		code+'\n//-->\n</script>';

	var baseurl = config.baseurl;
	delete config.baseurl;
	config.paddock = $('paddock').checked;
	$('iframe').value = '<iframe src="'+absUrl("ponies-iframe.html#"+
		configToQueryString(config))+'" style="overflow:hidden;border-style:none;margin:0;'+
		'padding:0;background:transparent;width:'+iframeWidth+'px;'+iframeHeight+'px;" '+
		'width="'+iframeWidth+'" height="'+iframeHeight+'" '+
		'frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>';
	delete config.paddock;

	BrowserPonies.setVolume(config.volume);
	BrowserPonies.setFadeDuration(config.fadeDuration);
	BrowserPonies.setFps(config.fps);
	BrowserPonies.setSpeed(config.speed);
	BrowserPonies.setAudioEnabled(config.audioEnabled);
	BrowserPonies.setShowFps(config.showFps);
	BrowserPonies.setShowLoadProgress(config.showLoadProgress);
	BrowserPonies.setSpeakProbability(config.speakProbability);

	var random = config.spawnRandom || 0;
	var ponies = BrowserPonies.ponies();
	for (var name in ponies) {
		var pony  = ponies[name];
		var count = config.spawn[name] || 0;
		var diff  = count - pony.instances.length;
		
		if (diff > 0) {
			BrowserPonies.spawn(name, diff);
		}
		else if (random > -diff) {
			random += diff;
		}
		else {
			BrowserPonies.unspawn(name, -diff - random);
			random = 0;
		}
	}
	BrowserPonies.spawnRandom(random);

	delete config.spawn;
	delete config.spawnRandom;

	var changed = false;
	for (var name in config) {
		if (oldConfig[name] !== config[name]) {
			changed = true;
			break;
		}
	}

	if (changed) {
		config.baseurl = baseurl;
		$('bookmarks').href = dataUrl('text/html',bookmarksMenu(config));
		oldConfig = config;
	}
}

var starter = function (srcs,cfg) {
	var cbcount = 1;
	var callback = function () {
		-- cbcount;
		if (cbcount === 0) {
			BrowserPonies.setBaseUrl(cfg.baseurl);
			if (!BrowserPoniesBaseConfig.loaded) {
				BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
				BrowserPoniesBaseConfig.loaded = true;
			}
			BrowserPonies.loadConfig(cfg);
			if (!BrowserPonies.running()) BrowserPonies.start();
		}
	};

	if (typeof(BrowserPoniesConfig) === "undefined") {
		window.BrowserPoniesConfig = {};
	}

	if (typeof(BrowserPoniesBaseConfig) === "undefined") {
		++ cbcount;
		BrowserPoniesConfig.onbasecfg = callback;
	}

	if (typeof(BrowserPonies) === "undefined") {
		++ cbcount;
		BrowserPoniesConfig.oninit = callback;
	}

	var node = (document.body || document.documentElement ||
		 document.getElementsByTagName('head')[0]);
	for (var id in srcs) {
		if (document.getElementById(id)) continue;
		if (node) {
			var s = document.createElement('script');
			s.type = 'text/javascript';
			s.id  = id;
			s.src = srcs[id];
			node.appendChild(s);
		}
		else {
			document.write('\u003cscript type="text/javscript" src="'+
				srcs[id]+'" id="'+id+'"\u003e\u003c/script\u003e');
		}
	}
	
	callback();
};

function bookmarksMenu (config) {
	var currentTime = Date.now();
	var buf = [
		"<!DOCTYPE NETSCAPE-Bookmark-file-1>\n"+
		"<!-- This is an automatically generated file.\n"+
		"     It will be read and overwritten.\n"+
		"     DO NOT EDIT! -->\n"+
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n'+
		"<TITLE>Bookmarks</TITLE>\n"+
		"<H1>Bookmarks</H1>\n"+
		"<DL><p>\n"+
		'\t<DT><H3 ADD_DATE="'+currentTime+'" LAST_MODIFIED="'+currentTime+
		'" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>\n'+
		"\t<DL><p>\n"+
		'\t\t<DT><H3 ADD_DATE="'+currentTime+'" LAST_MODIFIED="'+currentTime+'">Ponies</H3>\n'+
        '\t\t<DL><p>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.start();void(0)" ADD_DATE="'+currentTime+'">\u25B6 Start</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.stop();void(0)" ADD_DATE="'+currentTime+'">\u25A0 Stop</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.pause();void(0)" ADD_DATE="'+currentTime+'">\u25AE\u25AE Pause</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.resume();void(0)" ADD_DATE="'+currentTime+'">\u25AE\u25B6 Resume</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.togglePoniesToBackground();void(0)" ADD_DATE="'+currentTime+'">\u2195 Toggle ponies in background</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.unspawnAll();BrowserPonies.stop();void(0)" ADD_DATE="'+currentTime+'">\u00d7 Remove all ponies</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.setAudioEnabled(false);void(0)" ADD_DATE="'+currentTime+'">Mute Audio</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.setAudioEnabled(true);void(0)" ADD_DATE="'+currentTime+'">Enable Audio</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.setVolume(Math.min(BrowserPonies.getVolume()%2B0.1,1));void(0)" ADD_DATE="'+currentTime+'">+ Increase Volume</A>\n'+
		'\t\t\t<DT><A HREF="javascript:BrowserPonies.setVolume(Math.max(BrowserPonies.getVolume()-0.1,0));void(0)" ADD_DATE="'+currentTime+'">\u2013 Decrease Volume</A>\n'
	];

	delete config.spawn;
	config.spawnRandom = 1;
	buf.push('\t\t\t<DT><A HREF="javascript:'+encodeURIComponent(ponyCode(config))+'void(0)" ADD_DATE="'+currentTime+'">Random Pony</A>\n');
	delete config.spawnRandom;

	var ponies = BrowserPonies.ponies();
	var names = [];

	for (var name in ponies) {
		names.push(name);
	}
	names.sort();

	for (var i = 0; i < names.length; ++ i) {
		var name = names[i];
		var pony = ponies[name];
		config.spawn = {};
		config.spawn[name] = 1;
		buf.push('\t\t\t<DT><A HREF="javascript:'+encodeURIComponent(ponyCode(config))+'void(0)" ADD_DATE="'+currentTime+'">'+
			pony.name.replace(/_/g,' ').replace(/</g,'\u2039').replace(/>/g,'\u203a').replace(/&/g,'+')+'</A>\n');
	}
	
	buf.push(
		"\t\t</DL><p>\n"+
		"\t</DL><p>\n"+
		"</DL><p>\n");

	return buf.join("");
}
