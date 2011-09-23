function loadConfig (configStr) {
	var config = {};
	configStr = configStr.replace(/^[\?#]/,'').split('&');
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

	BrowserPonies.loadConfig(config);

	if ('action' in config) {
		BrowserPonies[config.action]();
	}
	if ('paddock' in config) {
		BrowserPonies.Util.$('paddock-back').style.display = config.paddock.trim().toLowerCase() === "true" ?
			'' : 'none';
	}
}

if (!BrowserPoniesBaseConfig.loaded) {
	BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
	BrowserPoniesBaseConfig.loaded = true;
}

window.onhashchange = function () {
	loadConfig(window.location.hash);
};

if (!BrowserPonies.running()) {
	BrowserPonies.start();
}
