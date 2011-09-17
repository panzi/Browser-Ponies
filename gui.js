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

function escapePonies () {
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
			config.spawn[name] = value;
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
	BrowserPonies.unspawnAll();
	BrowserPonies.loadConfig(config);
}

var starter = function (srcs,cfg) {
	var cbcount = 1;
	var callback = function () {
		-- cbcount;
		if (cbcount === 0) {
			BrowserPonies.setBaseUrl(cfg.baseurl);
			BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
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

function getIntFieldValue (field) {
	var value = field.getAttribute("data-value");
	if (value === null) {
		value = field.value;
	}
	return parseInt(value);
}

function setIntFieldValue (field, value) {
	if (!isNaN(value)) {
		value = parseInt(value);
		var min = field.getAttribute("data-min");
		var max = field.getAttribute("data-max");
		if (min !== null) {
			value = Math.max(parseInt(min),value);
		}
		if (max !== null) {
			value = Math.min(parseInt(max),value);
		}

		field.value = String(value);
		field.setAttribute("data-value",field.value);
	}
}

function intFieldChanged () {
	if (isNaN(this.value)) {
		this.value = this.getAttribute("data-value") || "0";
	}
	else {
		var value = parseInt(this.value);
		var min = this.getAttribute("data-min");
		var max = this.getAttribute("data-max");
		if (min !== null) {
			value = Math.max(parseInt(min),value);
		}
		if (max !== null) {
			value = Math.min(parseInt(max),value);
		}

		this.value = String(value);
		this.setAttribute("data-value",this.value);
	}
	updateConfig();
}

function increaseIntField () {
	var max = this.getAttribute("data-max");
	if (max !== null) {
		this.value = String(Math.min(parseInt(max),parseInt(this.value)+1));
	}
	else {
		this.value = String(parseInt(this.value)+1);
	}
	this.setAttribute("data-value",this.value);
	updateConfig();
}

function decreaseIntField () {
	var min = this.getAttribute("data-min");
	if (min !== null) {
		this.value = String(Math.max(parseInt(min),parseInt(this.value)-1));
	}
	else {
		this.value = String(parseInt(this.value)-1);
	}
	this.setAttribute("data-value",this.value);
	updateConfig();
}

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
}
