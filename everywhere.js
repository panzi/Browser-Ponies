"use strict";

function queryStringToConfig (configStr) {
	var config = {};
	for (var i = 0; i < configStr.length; ++ i) {
		var varStr = configStr[i];
		var pos = varStr.search("=");
		var key, value;
		if (pos < 0) {
			key   = decodeURIComponent(varStr);
			value = undefined;
		}
		else {
			key   = decodeURIComponent(varStr.slice(0,pos));
			value = decodeURIComponent(varStr.slice(pos+1));
		}

		key = key.split('.');
		var ctx = config;
		var j = 0;
		for (var m = key.length - 1; j < m; ++ j) {
			var k = key[j];
			if (k in ctx) {
				ctx = ctx[k];
			}
			else {
				ctx = ctx[k] = {};
			}
		}
		ctx[key[j]] = value;
	}
	return config;
}

function setConfig(config) {
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
}

function updateConfig () {
	var config = dumpConfig();
	setConfig(config);
	document.cookie = configToQueryString(config);
}

function startPonies () {
	BrowserPonies.start();
	$('start').style.display = 'none';
	$('stop').style.display = '';
}

function stopPonies () {
	BrowserPonies.stop();
	$('start').style.display = '';
	$('stop').style.display = 'none';
}

function toggleSettings () {
	var settings = $('main');
	settings.style.display = settings.style.display == 'none' ? '' : 'none';
}

function loadPage () {
	var iframe = $('iframe');
	var url = window.location.hash.replace(/^#/,'');
	
	if (!/^[a-z0-9]+:/.test(url)) {
		url = "http://"+url.replace(/^\/+/,'');
	}

	if (url !== iframe.src) {
		iframe.src = url;
	}
}

window.onhashchange = loadPage;

if (document.cookie) {
	setConfig(queryStringToConfig(document.cookie));
}
