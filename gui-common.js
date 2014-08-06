"use strict";

var observe   = BrowserPonies.Util.observe;
var tag       = BrowserPonies.Util.tag;
var $         = BrowserPonies.Util.$;
var _absUrl   = BrowserPonies.Util.URL.abs;
var has       = BrowserPonies.Util.has;
var partial   = BrowserPonies.Util.partial;
var dataUrl   = BrowserPonies.Util.dataUrl;

function absUrl (url) {
	// force https
	return _absUrl(url).replace(/^http:/,'https:');
}

if (typeof($x) === "undefined" && document.evaluate) {
	window.$x = function (xpath, context) {
		var nodes = [];
		try {
			var doc = (context && context.ownerDocument) || document;
			var results = doc.evaluate(xpath, context || doc, null, XPathResult.ANY_TYPE, null);
			var node;
			while ((node = results.iterateNext()))
				nodes.push(node);
		} catch (e) {
			console.error(e);
		}
		return nodes;
	};
}

function init () {
	$('noaudio').style.display  = BrowserPonies.Util.HasAudio ? "none" : "";
	$('hasaudio').style.display = BrowserPonies.Util.HasAudio ? "" : "none";
	setNumberFieldValue($('volume'), Math.round(BrowserPonies.getVolume() * 100));
	setNumberFieldValue($('fade'), BrowserPonies.getFadeDuration() / 1000);
	setNumberFieldValue($('fps'), BrowserPonies.getFps());
	setNumberFieldValue($('speak'), Math.round(BrowserPonies.getSpeakProbability() * 100));
	setNumberFieldValue($('speed'), BrowserPonies.getSpeed());
	$('progressbar').checked = BrowserPonies.isShowLoadProgress();
	$('enableaudio').checked = BrowserPonies.isAudioEnabled();
	$('dontspeak').checked   = BrowserPonies.isDontSpeak();
	$('showfps').checked     = BrowserPonies.isShowFps();

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
		'ponies/random%20pony/random-pony.gif', 0, categories));
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

function getNumberFieldValue (field) {
	var value = field.getAttribute("data-value");
	if (value === null) {
		var decimals = field.getAttribute("data-decimals");

		value = parseFloat(field.value);
		if (decimals !== null) {
			value = parseFloat(value.toFixed(parseInt(decimals)));
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
		var decimals = field.getAttribute("data-decimals");
		if (min !== null) {
			value = Math.max(parseFloat(min),value);
		}
		if (max !== null) {
			value = Math.min(parseFloat(max),value);
		}
		if (decimals !== null) {
			value = value.toFixed(parseInt(decimals));
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

function ponyCountId (name) {
	return 'pony_'+name.toLowerCase().replace(/[^a-z0-9]/ig,'_')+'_count';
}

function render (name,image,count,categories) {
	var input_id = ponyCountId(name);
	var input = tag('input',
		{type:'text','class':'number',name:'count',value:count,
		 'data-value':count,'data-min':0,'data-decimals':0,'data-pony':name,
		 id:input_id,size:3,onchange:numberFieldChanged});
	
	return tag('li',
		{'data-categories':categories.join(", ")},
		tag('div',{'class':'ponyname'},name.replace(/_/g,' ')),
		tag('div',{'class':'ponyimg'},
			tag('img',{src:image})),
		tag('label',{'for':input_id},'Count: '),
		input,
		tag('button',{'class':'increase',onclick:increaseNumberField.bind(input)},'+'),
		tag('button',{'class':'decrease',onclick:decreaseNumberField.bind(input)},'\u2013'));
}

function ponyCountFields () {
	return typeof($x) !== "undefined" ?
		$x('//input[@name="count"]',$('ponylist')) :
		$('ponylist').querySelectorAll('input[name="count"]');
}

function setAllZero () {
	var inputs = ponyCountFields();
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		setNumberFieldValue(inputs[i], 0);
	}
	updateConfig();
}

function dumpConfig (dontSkip) {
	var config = {baseurl: absUrl('')};

	config.fadeDuration = getNumberFieldValue($('fade')) * 1000;
	config.volume = getNumberFieldValue($('volume')) / 100;
	config.fps = getNumberFieldValue($('fps'));
	config.speed = getNumberFieldValue($('speed'));
	config.audioEnabled = $('enableaudio').checked;
	if ($('dontspeak').checked) config.dontSpeak = true;
	config.showFps = $('showfps').checked;
	config.showLoadProgress = $('progressbar').checked;
	config.speakProbability = getNumberFieldValue($('speak')) / 100;
	config.spawn = {};

	var inputs = ponyCountFields();
	for (var i = 0, n = inputs.length; i < n; ++ i) {
		var input = inputs[i];
		var value = getNumberFieldValue(input);
		if (!dontSkip && value <= 0) continue;
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

function configValueToParam (params, name, value) {
	if (typeof(value) === "object") {
		for (var key in value) {
			configValueToParam(params, name+"."+key, value[key]);
		}
	}
	else {
		params[name] = String(value);
	}
}

function configToQueryString (config) {
	var params = {};
	for (var name in config) {
		configValueToParam(params, name, config[name]);
	}
	var buf = [];
	for (var name in params) {
		buf.push(encodeURIComponent(name)+"="+encodeURIComponent(params[name]));
	}
	return buf.join("&");
}

function updateDontSpeak (checked) {
	var speak = $('speak');
	var tr = speak.parentNode.parentNode;
	tr.className = checked ? 'disabled' : '';
	speak.disabled = checked;
	var buttons = tr.getElementsByTagName('button');
	for (var i = 0; i < buttons.length; ++ i) {
		buttons[i].disabled = checked;
	}

	updateConfig();
}
