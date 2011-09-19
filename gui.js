var observe = BrowserPonies.observe;
var tag     = BrowserPonies.tag;
var $       = BrowserPonies.$;
var absUrl  = BrowserPonies.absUrl;
var has     = BrowserPonies.has;
var partial = BrowserPonies.partial;

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
		var src = $('input').value.replace(/^\s*'.*\n/gm,'').replace(/^\s*\n/gm,'');
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
	setNumberFieldValue($('fps'), BrowserPonies.getFps());
	setNumberFieldValue($('speak'), Math.round(BrowserPonies.getSpeakProbability() * 100));
	setNumberFieldValue($('speed'), BrowserPonies.getSpeed());
	$('progressbar').checked = BrowserPonies.isShowLoadProgress();
	$('enableaudio').checked = BrowserPonies.isAudioEnabled();

	var list = $('ponylist');
	var ponies = BrowserPonies.ponies();
	var names = [];

	for (var name in ponies) {
		names.push(name);
	}
	names.sort();

	var categorymap = {};
	
	// find all categories:
	for (var i = 0, n = names.length; i < n; ++ i) {
		var pony = ponies[names[i]];
		for (var j = 0, m = pony.categories.length; j < m; ++ j) {
			categorymap[pony.categories[j]] = true;
		}
	}
	var categories = [];
	for (var name in categorymap) {
		categories.push(name);
	}
	categories.sort();

	// build pony list:
	list.appendChild(render('Random Pony',
		'ponies/Random%20Pony/Mystery_Thumb.png', 0, categories));
	for (var i = 0, n = names.length; i < n; ++ i) {
		var pony = ponies[names[i]];
		list.appendChild(render(pony.name, pony.all_behaviors[0].rightimage,
			pony.instances.length, pony.categories));
	}

	// build pony filter:
	var catselect = $('catselect');
	var catlist   = $('catlist');

	for (var i = 0, n = categories.length; i < n; ++ i) {
		var name = categories[i];
		var pretty = titelize(name);
		catselect.appendChild(tag('li',
			{style:'display:none;',
			 onclick:partial(changeCategory,name,true),
			 'data-category':name},
			pretty));
		catlist.appendChild(tag('li',
			{'data-category':name},
			pretty,' ',
			tag('span',
				{'class':'delcat',
				 onclick:partial(changeCategory,name,false)},
				'\u00d7')));
	}

	updateConfig();
}

observe(window,'click',function (event) {
	var target = (event.target || event.srcElement);
	if (target.id !== 'addcat') {
		$('catselect').style.display = 'none';
	}
});

function items (list) {
	var node = list.firstChild;
	var items = [];
	while (node) {
		if (node.nodeName === "LI") {
			items.push(node);
		}
		node = node.nextSibling;
	}
	return items;
}

function showCategorySelect () {
	var addcat = $('addcat');
	var catselect = $('catselect');
	catselect.style.top  = (addcat.offsetTop + addcat.offsetHeight)+'px';
	catselect.style.left = addcat.offsetLeft+'px';
	catselect.style.display = '';
}

function changeCategory (category,add) {
	var categories = {};
	var catselect = $('catselect');
	var catlist   = $('catlist');

	var selectors = items(catselect);
	for (var i = 0, n = selectors.length; i < n; ++ i) {
		var selector = selectors[i];
		var name = selector.getAttribute('data-category');
		if (name === category) {
			selector.style.display = add ? 'none' : '';
			break;
		}
	}

	var catnodes = items(catlist);
	var all = true, no = true;
	for (var i = 0, n = catnodes.length; i < n; ++ i) {
		var catnode = catnodes[i];
		var name = catnode.getAttribute('data-category');
		if (name === category) {
			catnode.style.display = add ? '' : 'none';
		}
		if (catnode.style.display === 'none') {
			all = false;
		}
		else {
			no = false;
			categories[name] = true;
		}
	}

	$('allcatsadded').style.display = all ? '' : 'none';
	$('nocatadded').style.display = no ? '' : 'none';

	filterPonies(categories);
}

function removeAllCategories () {
	var catselect = $('catselect');
	var catlist   = $('catlist');

	var selectors = items(catselect);
	for (var i = 0, n = selectors.length; i < n; ++ i) {
		selectors[i].style.display = '';
	}

	var catnodes = items(catlist);
	for (var i = 0, n = catnodes.length; i < n; ++ i) {
		catnodes[i].style.display = 'none';
	}

	$('allcatsadded').style.display = 'none';
	$('nocatadded').style.display = '';

	filterPonies({});
}

function filterPonies (catmap) {
	var ponies = items($('ponylist'));

	for (var i = 0, n = ponies.length; i < n; ++ i) {
		var pony = ponies[i];
		var categories = pony.getAttribute('data-categories').split(',');
		var matches = false;
		for (var j = 0, m = categories.length; j < m; ++ j) {
			var category = categories[j].trim();
			if (has(catmap,category)) {
				matches = true;
				break;
			}
		}
		pony.style.display = matches ? '' : 'none';
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

function titelize (s) {
	var buf = [];
	while (s.length > 0) {
		var i = s.search(/[^0-9a-z]/i);
		if (i < 0) {
			i = s.length;
		}
		var word = s.slice(0,i);
		buf.push(word.slice(0,1).toUpperCase());
		buf.push(word.slice(1).toLowerCase());
		buf.push(s.slice(i,i+1));
		s = s.slice(i+1);
	}
	return buf.join('');
}

var PonyScripts = {
	'browser-ponies-script': absUrl('browserponies.js'),
	'browser-ponies-config': absUrl('basecfg.js')
};

function dumpConfig () {
	var config = {baseurl: absUrl('')};
	config.fps = getNumberFieldValue($('fps'));
	config.speed = getNumberFieldValue($('speed'));
	config.audioEnabled = $('enableaudio').checked;
	config.showLoadProgress = $('progressbar').checked;
	config.speakProbability = getNumberFieldValue($('speak')) / 100;
	config.spawn = {};

	var inputs = $x('//input[@name="count"]',$('ponylist'));
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		var input = inputs[i];
		var value = getNumberFieldValue(input);
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
	code = code.replace(/^\s*\/\/.*\n/gm,'').replace(/^\s*\n/gm,'');
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

function getNumberFieldValue (field) {
	var value = field.getAttribute("data-value");
	if (value === null) {
		var fixed = field.getAttribute("data-fixed");

		value = parseFloat(field.value);
		if (fixed !== null) {
			value = parseFloat(value.toFixed(parseInt(fixed)));
		}
	}
	else {
		value = parseFloat(value);
	}
	return value;
}

function setNumberFieldValue (field, value) {
	if (!isNaN(value)) {
		value = parseFloat(value);
		var min   = field.getAttribute("data-min");
		var max   = field.getAttribute("data-max");
		var fixed = field.getAttribute("data-fixed");
		if (min !== null) {
			value = Math.max(parseFloat(min),value);
		}
		if (max !== null) {
			value = Math.min(parseFloat(max),value);
		}
		if (fixed !== null) {
			value = value.toFixed(parseInt(fixed));
		}
		else {
			value = String(value);
		}

		field.value = value;
		field.setAttribute("data-value",value);
	}
}

function numberFieldChanged () {
	if (isNaN(this.value)) {
		this.value = this.getAttribute("data-value") ||
			this.getAttribute("data-min") || "0";
	}
	else {
		setNumberFieldValue(this,this.value);
	}
	updateConfig();
}

function increaseNumberField () {
	var step = this.getAttribute("data-step");
	if (step === null) {
		step = 1;
	}
	else {
		step = parseFloat(step);
	}
	setNumberFieldValue(this,getNumberFieldValue(this) + step);
	updateConfig();
}

function decreaseNumberField () {
	var step = this.getAttribute("data-step");
	if (step === null) {
		step = 1;
	}
	else {
		step = parseFloat(step);
	}
	setNumberFieldValue(this,getNumberFieldValue(this) - step);
	updateConfig();
}

function render (name,image,count,categories) {
	var input_id = 'pony_'+name.toLowerCase().replace(/[^a-z0-9]/ig,'_')+'_count';
	var input = tag('input',
		{type:'text','class':'number',name:'count',value:count,
		 'data-value':count,'data-min':0,'data-fixed':0,'data-pony':name,
		 id:input_id,size:3,onchange:numberFieldChanged});
	
	return tag('li',
		{'data-categories':categories.join(", ")},
		tag('div',{'class':'ponyname'},name),
		tag('div',{'class':'ponyimg'},
			tag('img',{src:image})),
		tag('label',{'for':input_id},'Count: '),
		input,
		tag('button',{onclick:increaseNumberField.bind(input)},'+'),
		tag('button',{onclick:decreaseNumberField.bind(input)},'\u2013'));
}

function setAllZero () {
	var inputs = $x("//input[@name='count']",$('ponylist'));
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		setNumberFieldValue(inputs[i], 0);
	}
	updateConfig();
}
