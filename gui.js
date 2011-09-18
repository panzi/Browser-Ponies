var $ = BrowserPonies.$;

if (typeof($x) === "undefined") {
	window.$x = function (xpath, context) {
		var nodes = [];
		try {
			var doc = (context && context.ownerDocument) || document;
			var results = doc.evaluate(xpath, context || doc, null, XPathResult.ANY_TYPE, null);
			var node;
			while (node = results.iterateNext())
				nodes.push(node);
		} catch (e) {
			console.error(e);
		}
		return nodes;
	};
}

function convertPonies () {
	try {
		var what = $('what').value;
		var src = $('input').value;
		var converted = what === 'Pony' ?
			BrowserPonies.convertPony(src, $('baseurl').value) :
			BrowserPonies.convertInteractions(src);
		$('output').value = JSON.stringify(converted);
	}
	catch (e) {
		console.error(e);
		alert("Error during Conversion:\n"+e.name+": "+e.message);
	}
}

function wrapPonies () {
	try {
		var what = $('what').value;
		var src = $('input').value;
		$('output').value = JSON.stringify(
			what === 'Pony' ?
				{ini: src, baseurl: $('baseurl').value} :
				src);
	}
	catch (e) {
		console.error(e);
		alert("Error during Conversion:\n"+e.name+": "+e.message);
	}
}

function init () {
	$('noaudio').style.display  = BrowserPonies.HasAudio ? "none" : "";
	$('hasaudio').style.display = BrowserPonies.HasAudio ? "" : "none";
	setIntFieldValue($('fps'), BrowserPonies.getFps());
	setIntFieldValue($('speak'), Math.round(BrowserPonies.getSpeakProbability() * 100));
	setFloatFieldValue($('speed'), BrowserPonies.getSpeed());
	$('progressbar').checked = BrowserPonies.isShowLoadProgress();
	$('enableaudio').checked = BrowserPonies.isAudioEnabled();

	var list = $('ponylist');
	var ponies = BrowserPonies.ponies();
	var names = [];

	for (var name in ponies) {
		names.push(name);
	}
	names.sort();

	list.appendChild(render('Random Pony', 'random.png', 0));
	for (var i = 0, n = names.length; i < n; ++ i) {
		var pony = ponies[names[i]];
		list.appendChild(render(pony.name, pony.behaviors[0].rightimage, pony.instances.length));
	}

	updateConfig();
}

var absUrl = BrowserPonies.absUrl;
var PonyScripts = {
	'browser-ponies-script': absUrl('browserponies.js'),
	'browser-ponies-config': absUrl('basecfg.js')
};

function dumpConfig () {
	var config = {baseurl: absUrl('')};
	config.fps = getIntFieldValue($('fps'));
	config.speed = getFloatFieldValue($('speed'));
	config.audioEnabled = $('enableaudio').checked;
	config.showLoadProgress = $('progressbar').checked;
	config.speakProbability = getIntFieldValue($('speak')) / 100;
	config.spawn = {};

	var inputs = $x('//input[@name="count"]',$('ponylist'));
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		var input = inputs[i];
		var value = getIntFieldValue(input);
		if (value <= 0) continue;
		var name = input.getAttribute("data-pony");
		if (name === "Random Pony") {
			config.spawnRandom = value;
		}
		else {
			config.spawn[name.toLowerCase()] = value;
		}
	}
	return config;
}

function updateConfig () {
	var config = dumpConfig();
	var code = '('+starter.toString()+')('+
		JSON.stringify(PonyScripts)+','+
		JSON.stringify(config)+');';
	code = code.replace(/^\s*\/\/.*$/g,'').replace(/\s\s+/g,' ');
	$('bookmarklet').href = 'javascript:'+code+'void(0)';
	$('embedcode').value = '\u003cscript type="text/javascript"\u003e\n//\u003c!--\n'+
		code+'\n//--\u003e\n\u003c/script\u003e';
	
	BrowserPonies.setFps(config.fps);
	BrowserPonies.setSpeed(config.speed);
	BrowserPonies.setAudioEnabled(config.audioEnabled);
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
		BrowserPoniesConfig = {};
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

function getNumberFieldValue (parse, field) {
	var value = field.getAttribute("data-value");
	if (value === null) {
		value = field.value;
	}
	return parse(value);
}

function setNumberFieldValue (parse, field, value) {
	if (!isNaN(value)) {
		value = parse(value);
		var min = field.getAttribute("data-min");
		var max = field.getAttribute("data-max");
		if (min !== null) {
			value = Math.max(parse(min),value);
		}
		if (max !== null) {
			value = Math.min(parse(max),value);
		}

		field.value = String(value);
		field.setAttribute("data-value",field.value);
	}
}

function numberFieldChanged (parse) {
	if (isNaN(this.value)) {
		this.value = this.getAttribute("data-value") || "0";
	}
	else {
		var value = parse(this.value);
		var min = this.getAttribute("data-min");
		var max = this.getAttribute("data-max");
		if (min !== null) {
			value = Math.max(parse(min),value);
		}
		if (max !== null) {
			value = Math.min(parse(max),value);
		}

		this.value = String(value);
		this.setAttribute("data-value",this.value);
	}
	updateConfig();
}

function increaseNumberField (parse,step) {
	var max = this.getAttribute("data-max");
	if (max !== null) {
		this.value = String(Math.min(parse(max),parse(this.value)+step));
	}
	else {
		this.value = String(parse(this.value)+step);
	}
	this.setAttribute("data-value",this.value);
	updateConfig();
}

function decreaseNumberField (parse,step) {
	var min = this.getAttribute("data-min");
	if (min !== null) {
		this.value = String(Math.max(parse(min),parse(this.value)-step));
	}
	else {
		this.value = String(parse(this.value)-step);
	}
	this.setAttribute("data-value",this.value);
	updateConfig();
}

function curry (fn) {
	var partial = Array.prototype.slice.call(arguments,1);
	return function () {
		return fn.apply(this,partial.concat(Array.prototype.slice.call(arguments)));
	};
}

var getIntFieldValue = curry(getNumberFieldValue,parseInt);
var setIntFieldValue = curry(setNumberFieldValue,parseInt);
var intFieldChanged = curry(numberFieldChanged,parseInt);
var increaseIntField = curry(increaseNumberField,parseInt,1);
var decreaseIntField = curry(decreaseNumberField,parseInt,1);

var getFloatFieldValue = curry(getNumberFieldValue,parseFloat);
var setFloatFieldValue = curry(setNumberFieldValue,parseFloat);
var floatFieldChanged = curry(numberFieldChanged,parseFloat);
var increaseFloatField = curry(increaseNumberField,parseFloat,0.1);
var decreaseFloatField = curry(decreaseNumberField,parseFloat,0.1);

function render (name,image,value) {
	var tag = BrowserPonies.tag;
	var input_id = 'pony_'+name.toLowerCase().replace(/[^a-z0-9]/ig,'_')+'_count';
	var input = tag('input',
		{type:'text','class':'number',name:'count',value:value,
		 'data-value':value,'data-min':0,'data-pony':name,
		 id:input_id,size:3,onchange:intFieldChanged});
	
	return tag('li',
		tag('div',{'class':'ponyname'},name),
		tag('div',{'class':'ponyimg'},
			tag('img',{src:image})),
		tag('label',{'for':input_id},'Count: '),
		input,
		tag('button',{onclick:increaseIntField.bind(input)},'+'),
		tag('button',{onclick:decreaseIntField.bind(input)},'\u2013'));
}

function setAllZero () {
	var inputs = $x("//input[@name='count']",$('ponylist'));
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		setIntFieldValue(inputs[i], 0);
	}
	updateConfig();
}
