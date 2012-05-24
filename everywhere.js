"use strict";

function queryStringToConfig (configStr, delim) {
	var config = {};
	configStr = configStr.split(delim||"&");
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

function setSimpleConfig (config) {
	if ('volume' in config) BrowserPonies.setVolume(config.volume);
	if ('fadeDuration' in config) BrowserPonies.setFadeDuration(config.fadeDuration);
	if ('fps' in config) BrowserPonies.setFps(config.fps);
	if ('speed' in config) BrowserPonies.setSpeed(config.speed);
	if ('audioEnabled' in config) BrowserPonies.setAudioEnabled(config.audioEnabled);
	if ('showFps' in config) BrowserPonies.setShowFps(config.showFps);
	if ('showLoadProgress' in config) BrowserPonies.setShowLoadProgress(config.showLoadProgress);
	if ('speakProbability' in config) BrowserPonies.setSpeakProbability(config.speakProbability);
}

function updateConfig () {
	var config = dumpConfig(true);
	delete config.baseurl;
	
	setSimpleConfig(config);

	var random = config.spawnRandom || 0;
	var ponies = BrowserPonies.ponies();
	var spawn  = config.spawn || {};
	for (var name in ponies) {
		var pony  = ponies[name];
		var count = spawn[name] || 0;
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

	var cookies = {};
	for (var name in config) {
		configValueToParam(cookies, name, config[name]);
	}
	var expires = new Date();
	expires.setTime(expires.getTime() + (100*365*24*60*60*1000));
	var suffix = '; expires='+expires.toGMTString()+'; path='+window.location.pathname;
	expires = new Date();
	expires.setTime(expires.getTime() - (1*24*60*60*1000));
	var expired = '; expires='+expires.toGMTString()+'; path='+window.location.pathname;
	for (var name in cookies) {
		var count = cookies[name];
		document.cookie = encodeURIComponent('ponies.'+name)+'='+
			encodeURIComponent(String(count))+(count <= 0 ? expired : suffix);
	}
}

function loadConfig () {
	var config = queryStringToConfig(document.cookie, /; */g).ponies;
	if (!config) {
		config = {
			spawn: {
				"rainbow dash": 1,
				"pinkie pie": 1,
				"applejack": 1,
				"twilight sparkle": 1,
				"fluttershy": 1,
				"rarity": 1
			}
		};
	}

	setSimpleConfig(config);
	
	setNumberFieldValue($('volume'), Math.round(BrowserPonies.getVolume() * 100));
	setNumberFieldValue($('fade'), BrowserPonies.getFadeDuration() / 1000);
	setNumberFieldValue($('fps'), BrowserPonies.getFps());
	setNumberFieldValue($('speak'), Math.round(BrowserPonies.getSpeakProbability() * 100));
	setNumberFieldValue($('speed'), BrowserPonies.getSpeed());
	$('progressbar').checked = BrowserPonies.isShowLoadProgress();
	$('enableaudio').checked = BrowserPonies.isAudioEnabled();
	$('showfps').checked     = BrowserPonies.isShowFps();

	BrowserPonies.unspawnAll();
	var ponies = BrowserPonies.ponies();
	var spawn = config.spawn || {};
	for (var name in spawn) {
		var field = $(ponyCountId(name));
		if (field) {
			setNumberFieldValue(field, spawn[name]);
		}
		BrowserPonies.spawn(name, spawn[name]);
	}
	setNumberFieldValue($('pony_random_pony_count'), config.spawnRandom || 0);
	if (config.spawnRandom) BrowserPonies.spawnRandom(config.spawnRandom);
	BrowserPonies.start();
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

function showSettings () {
	 $('main').style.display = '';
}

function hideSettings () {
	 $('main').style.display = 'none';
}

function loadPage () {
	var iframe = $('iframe');
	var url = window.location.hash.replace(/^#/,'');
	
	if (!url) {
		url = queryStringToConfig(window.location.search.replace(/^\?/,'')).url;
	}

	if (url) {
		if (!/^[a-z0-9]+:/.test(url)) {
			url = "http://"+url.replace(/^\/+/,'');
		}

		if (url !== iframe.src) {
			iframe.src = url;
			var input = $('url');
			input.value = url;
			input.select();
		}
		hideSettings();
	}
	else {
		showSettings();
	}
}

window.onhashchange = loadPage;

BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
