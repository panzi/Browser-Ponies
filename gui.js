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

function embedCode (config) {
	var copy = {};
	for (var key in config) {
		copy[key] = config[key];
	}
	copy.autostart = true;
	return (
		'<script type="text/javascript" src="'+PonyScripts['browser-ponies-config']+'" id="browser-ponies-config"></script>'+
		'<script type="text/javascript" src="'+PonyScripts['browser-ponies-script']+'" id="browser-ponies-script"></script>'+
		'<script type="text/javascript">/* <![CDATA[ */ '+
		'(function (cfg) {'+
		'BrowserPonies.setBaseUrl(cfg.baseurl);'+
		'BrowserPonies.loadConfig(BrowserPoniesBaseConfig);'+
		'BrowserPonies.loadConfig(cfg);'+
		'})('+JSON.stringify(copy).replace(/\]\]/g,']"+"]')+'); /* ]]> */</script>');
}

function iframeEmbedCode (config) {
	var iframeWidth  = getNumberFieldValue($('iframe-width'));
	var iframeHeight = getNumberFieldValue($('iframe-height'));
	delete config.baseurl;
	config.paddock = $('paddock').checked;
	config.grass = $('grass').checked;
	return '<iframe src="'+absUrl("ponies-iframe.html#"+
		configToQueryString(config))+'" style="overflow:hidden;border-style:none;margin:0;'+
		'padding:0;background:transparent;width:'+iframeWidth+'px;'+iframeHeight+'px;" '+
		'width="'+iframeWidth+'" height="'+iframeHeight+'" '+
		'frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>';
}

function updateConfig () {
	var config = dumpConfig();
	var code = ponyCode(config);

	$('bookmarklet').href = 'javascript:'+code+'void(0)';
	$('embedcode').value = embedCode(config);

	var baseurl = config.baseurl;
	$('iframe').value = iframeEmbedCode(config);
	delete config.paddock;
	delete config.grass;

	BrowserPonies.setVolume(config.volume);
	BrowserPonies.setFadeDuration(config.fadeDuration);
	BrowserPonies.setFps(config.fps);
	BrowserPonies.setSpeed(config.speed);
	BrowserPonies.setAudioEnabled(config.audioEnabled);
	BrowserPonies.setShowFps(config.showFps);
	BrowserPonies.setShowLoadProgress(config.showLoadProgress);
	BrowserPonies.setSpeakProbability(config.speakProbability);
	BrowserPonies.setDontSpeak(config.dontSpeak);

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

function dragoverHandler (supportedTypes) {
	return function (event) {
		var files = event.dataTransfer.files;
		var accept = false;

		if (!files || files.length === 0) {
			var types = event.dataTransfer.types;

			if (types) {
				for (var i = 0; i < types.length && !accept; ++ i) {
					var type = types[i];
					for (var j = 0; j < supportedTypes.length; ++ j) {
						var supportedType = supportedTypes[j];

						if (typeof supportedType === "string") {
							if (supportedType === type) {
								accept = true;
								break;
							}
						}
						else if (supportedType.test(type)) {
							accept = true;
							break;
						}
					}
				}
			}
		}
		else {
			accept = true;
		}

		var dropzone = upOrSelfClass(event.target,'dropzone');
		if (accept) {
			addClass(dropzone, "dragover");
			event.dropEffect = 'copy';
			event.stopPropagation();
			event.preventDefault();
		}
		else {
			event.dropEffect = 'none';
		}

		dropzone.querySelector("input[type='file']").style.display = "none";
	};
}

function addClass (e, className) {
	var clslist = (e.className||'').trim();
	var clss = {};

	if (clslist) {
		clslist = clslist.split(/\s+/g);
		for (var i = 0; i < clslist.length; ++ i) {
			clss[clslist[i]] = true;
		}
	}
	clss[className] = true;

	clslist = [];
	for (var cls in clss) {
		clslist.push(cls);
	}
	e.className = clslist.join(" ");
}

function removeClass (e, className) {
	var clslist = (e.className||'').trim();
	var clss = {};

	if (clslist) {
		clslist = clslist.split(/\s+/g);
		for (var i = 0; i < clslist.length; ++ i) {
			clss[clslist[i]] = true;
		}
	}
	delete clss[className];

	clslist = [];
	for (var cls in clss) {
		clslist.push(cls);
	}
	e.className = clslist.join(" ");
}

function hasClass (e, className) {
	var clslist = (e.className||'').trim();

	if (clslist) {
		clslist = clslist.split(/\s+/g);
		for (var i = 0; i < clslist.length; ++ i) {
			if (clslist[i] === className) {
				return true;
			}
		}
	}

	return false;
}

function mousemoveDropzone (event) {
	var input = this.querySelector("input[type='file']");
	var rect = this.getBoundingClientRect();
	var x = event.clientX - rect.left;
	var y = event.clientY - rect.top;

	input.style.left = Math.round(x - input.offsetWidth + 5)+'px';
	input.style.top  = Math.round(y - input.offsetHeight * 0.5)+'px';
}

function dragleaveDropzone (event) {
	var dropzone = upOrSelfClass(event.target,'dropzone');
	removeClass(dropzone, "dragover");
	var input = dropzone.querySelector("input[type='file']");
	if (input) input.style.display = "";
}

var dragoverPony = dragoverHandler(['text/plain','Text','Files']);
var dragoverFile = dragoverHandler(['text/plain','Text',/^image\//,/^audio\//,'text/uri-list','Files']);
var dragoverImage = dragoverHandler(['text/plain','Text',/^image\//,'text/uri-list','Files']);
var dragoverAudio = dragoverHandler(['text/plain','Text',/^audio\//,'text/uri-list','Files']);
var dragoverInteractions = dragoverPony;

function dropInteractions (event) {
	var dropzone = upOrSelfClass(event.target,'dropzone');
	removeClass(dropzone, "dragover");
	event.stopPropagation();
	event.preventDefault();

	var transfer = event.dataTransfer;
	var files = transfer.files;

	if (files && files.length > 0) {
		loadInteractionFiles(files);
	}
	else {
		var text = transfer.getData("text/plain") || transfer.getData("Text");
		loadInteraction(text,'(dropped text)');
	}
	dropzone.querySelector("input[type='file']").style.display = "";
}

function dropPony (event) {
	var dropzone = upOrSelfClass(event.target,'dropzone');
	removeClass(dropzone, "dragover");
	event.stopPropagation();
	event.preventDefault();

	var transfer = event.dataTransfer;
	var files = transfer.files;

	if (files && files.length > 0) {
		loadPonyFiles(files);
	}
	else {
		var text = transfer.getData("text/plain") || transfer.getData("Text");
		loadPony(text,"(dropped text)");
	}
	dropzone.querySelector("input[type='file']").style.display = "";
}

function dropFile (event) {
	var dropzone = upOrSelfClass(event.target,'dropzone');
	removeClass(dropzone, "dragover");
	event.stopPropagation();
	event.preventDefault();

	var transfer = event.dataTransfer;
	var files = transfer.files;

	var pony = upOrSelfClass(dropzone,'pony');
	if (files && files.length > 0) {
		loadFiles(files,pony);
	}
	else {
		changeFileUrls(getUrls(transfer),pony);
	}
	dropzone.querySelector("input[type='file']").style.display = "";
}

function dropSingleFile (event) {
	var dropzone = upOrSelfClass(event.target,'dropzone');
	removeClass(dropzone, "dragover");
	event.stopPropagation();
	event.preventDefault();

	var transfer = event.dataTransfer;
	var files = transfer.files;

	var action = upOrSelfClass(dropzone,'pony').querySelector('select.file-action').value;
	var file = upOrSelfClass(dropzone,'file');
	if (files && files.length > 0) {
		loadFile(files[0],file,action);
	}
	else {
		var urls = getUrls(transfer);
		if (urls.length > 0) {
			file.querySelector('input.url').value = getUrls(transfer)[0];
		}
	}
	
	var input = dropzone.querySelector("input[type='file']");
	if (input) input.style.display = "";
}

function getUrls (transfer) {
	var urls = (transfer.getData("Text") || transfer.getData("text/plain") || transfer.getData("text/uri-list") || '');
	urls = urls.trim().split("\n");
	var filtered = [];
	for (var i = 0; i < urls.length; ++ i) {
		var url = urls[i].trim();
		if (url) filtered.push(url);
	}
	return urls;
}

function fileReaderError (event) {
	if (file.name) {
		alert("Error reading file: "+file.name);
	}
	else {
		alert("Error reading file.");
	}
	console.error(event);
}

function loadNamedResult (load,name) {
	return function (event) {
		load(event.target.result,name);
	};
}

function loadPonyFiles (files) {
	for (var i = 0; i < files.length; ++ i) {
		var file = files[i];
		var reader = new FileReader();
		reader.onload = loadNamedResult(loadPony,file.name);
		reader.onerror = fileReaderError;
		reader.readAsText(file);
	}
}

function loadInteractionFiles (files) {
	for (var i = 0; i < files.length; ++ i) {
		var file = files[i];
		var reader = new FileReader();
		reader.onload = loadNamedResult(loadInteraction,file.name);
		reader.onerror = fileReaderError;
		reader.readAsText(file);
	}
}

function upOrSelfTag (el, tagName) {
	tagName = tagName.toUpperCase();
	while (el && el.tagName !== tagName) {
		el = el.parentElement;
	}
	return el;
}

function upOrSelfClass (el, className) {
	while (el && !hasClass(el,className)) {
		el = el.parentElement;
	}
	return el;
}

function loadResultInto (input) {
	return function (event) {
		input.value = event.target.result;
	};
}

function resetFilenames (event) {
	var pony = upOrSelfClass(event.target,'pony');
	var files = pony.querySelectorAll('.file[data-original-url]');
	for (var i = 0; i < files.length; ++ i) {
		var file = files[i];
		var url = file.getAttribute('data-original-url');
		file.querySelector('input.url').value = url;
	}
}

function loadFiles (files,li) {
	var action = li.querySelector('select.file-action').value;
	var nomatch = [];
	for (var i = 0; i < files.length; ++ i) {
		var file = files[i];
		var filename = decodeURIComponent(/^(?:.*[\/\\])?([^\/\\]*)$/.exec(file.name)[1]);
		var tr = li.querySelector('.file[data-filename='+JSON.stringify(filename.toLowerCase())+']');
		if (tr) {
			loadFile(file,tr,action);
		}
		else {
			nomatch.push(file.name);
		}
	}

	if (nomatch.length > 0) {
		alert("No match found for folowing files:\n \u2022 "+nomatch.join("\n \u2022 "));
	}
}

function loadFile (file,tr,action) {
	var input = tr.querySelector('input.url');
	if (action === 'embed') {
		var reader = new FileReader();
		reader.onerror = fileReaderError;
		reader.onload = loadResultInto(input);
		reader.readAsDataURL(file);
	}
	else {
		input.value = decodeURIComponent(/^(?:.*[\/\\])?([^\/\\]*)$/.exec(file.name)[1]);
	}
}

function changeFileUrls (urls,li) {
	var nomatch = [];
	for (var i = 0; i < urls.length; ++ i) {
		var url = urls[i];
		var filename = decodeURIComponent(/^(?:.*[\/\\])?([^\/\\#\?]*)(?:[\?#].*)?$/.exec(url)[1]);
		var tr = li.querySelector('.file[data-filename='+JSON.stringify(filename.toLowerCase())+']');
		if (tr) {
			tr.querySelector('input.url').value = url;
		}
		else {
			nomatch.push(url);
		}
	}
	
	if (nomatch.length > 0) {
		alert("No match found for folowing URLs:\n \u2022 "+nomatch.join("\n \u2022 "));
	}
}

function fileChanged (event) {
	loadFiles(event.target.files,upOrSelfClass(event.target,'pony'));
}

function singleFileChanged (event) {
	var action = upOrSelfClass(event.target,'pony').querySelector('select.file-action').value;
	loadFile(event.target.files[0],upOrSelfClass(event.target,'file'),action);
}

function loadPony (text,name) {
	var pony;
	try {
		pony = BrowserPonies.convertPony(text);
	}
	catch (e) {
		alert("Error parsing: "+name);
		return;
	}
	var count = tag('input',
		{type:'text','class':'number count',value:1,
		 'data-value':1,'data-min':0,'data-decimals':0,
		 size:3,onchange:numberFieldChanged});
	var remove = tag('button',{'class':'remove',title:'Remove Pony'},'\u00d7');
	var tbody = tag('tbody');
	var input = tag('input',{type:'file',multiple:'multiple'});
	var dropzone = tag('div',{'class':'dropzone'},'Click or drop image and sound files/URLs here.',input);
	var li = tag('li',{'class':'pony','data-pony':JSON.stringify(pony)},
		tag('span',{'class':'name'},pony.name),' ',remove,
		tag('div',
			tag('label','Count: ',count),
			tag('button',{'class':'increase',onclick:increaseNumberField.bind(count)},'+'),
			tag('button',{'class':'decrease',onclick:decreaseNumberField.bind(count)},'\u2013'),
			' ',
			
			tag('label',{title:'Common prefix of image/audio file URLs of this pony. (Not needed if you embed the files.)'},
				'Base URL: ',
				tag('input',{'class':'baseurl',type:'text',value:pony.baseurl||''})),
			dropzone,
			tag('label','Action: ',
				tag('select',{'class':'file-action'},
					tag('option',{value:'fix-names',
						title:'Only use the files to fix the case of the filenames. (The web is case sensitive.)'},
						'Fix Filenames'),
					tag('option',{value:'embed',
						title:'Embed files directly in the generated script as data URLs. (Result will not work in Internet Explorer.)'},
						'Embed Files'))),
			tag('button',{onclick:resetFilenames},'Reset Filenames')),
		tag('table', {'class':'files'},
			tag('thead',
				tag('tr',
					tag('th', 'Filename'),
					tag('th', 'URL'),
					tag('th', ''))),
			tbody));
	
	observe(remove, 'click', removeItem);
	observe(input, 'change', fileChanged);
	observe(dropzone, 'dragover', dragoverFile);
	observe(dropzone, 'dragenter', dragoverFile);
	observe(dropzone, 'dragleave', dragleaveDropzone);
	observe(dropzone, 'drop', dropFile);
	observe(dropzone, 'mousemove', mousemoveDropzone);

	var files = {};

	function addFilename (filename, what) {
		files[decodeURIComponent(filename||'').toLowerCase()] = what || 'file';
	}

	if (pony.behaviors) {
		for (var i = 0; i < pony.behaviors.length; ++ i) {
			var behavior = pony.behaviors[i];
			addFilename(behavior.leftimage,'image');
			addFilename(behavior.rightimage,'image');

			if (behavior.effects) {
				for (var j = 0; j < behavior.effects.length; ++ j) {
					var effect = behavior.effects[j];
					addFilename(effect.leftimage,'image');
					addFilename(effect.rightimage,'image');
				}
			}
		}
	}

	if (pony.speeches) {
		for (var i = 0; i < pony.speeches.length; ++ i) {
			var speech = pony.speeches[i];
			if (speech.files) {
				for (var type in speech.files) {
					addFilename(speech.files[type],'audio');
				}
			}
		}
	}

	var filenames = [];
	for (var filename in files) {
		filenames.push(filename);
	}
	filenames.sort();
	for (var i = 0; i < filenames.length; ++ i) {
		var filename = filenames[i];
		var dropInput = tag('input',{type:'file'});
		var url = encodeURIComponent(filename);
		var urlInput = tag('input',{'class':'url dropzone',type:'text',value:url});
		var dropzone = tag('div',
			{'class':'dropzone',title:'Click or drop a single image or sound file/URL here.'},
			'Change...',dropInput);
		var tr = tag('tr',{'class':'file','data-filename':filename,'data-original-url':url},
			tag('td',{'class':'filename'},filename),
			tag('td',urlInput),
			tag('td',dropzone));
		
		if (files[filename] === "audio") {
			observe(dropzone, 'dragover', dragoverAudio);
			observe(dropzone, 'dragenter', dragoverAudio);
		}
		else {
			observe(dropzone, 'dragover', dragoverImage);
			observe(dropzone, 'dragenter', dragoverImage);
		}

		observe(dropInput, 'change', singleFileChanged);
		observe(dropzone, 'dragleave', dragleaveDropzone);
		observe(dropzone, 'drop', dropSingleFile);
		observe(dropzone, 'mousemove', mousemoveDropzone);
		observe(urlInput, 'dragleave', dragleaveDropzone);
		observe(urlInput, 'drop', dropSingleFile);

		tbody.appendChild(tr);
	}

	$('own-ponies').appendChild(li);

	if (li.scrollIntoView) {
		li.scrollIntoView();
	}
}

function loadInteraction (text,name) {
	var interactions;
	try {
		interactions = BrowserPonies.convertInteractions(text);
	}
	catch (e) {
		alert("Error parsing: "+name);
		return;
	}

	var remove = tag('button',{'class':'remove',title:'Remove Interaction'},'\u00d7');
	var li = tag('li',{'class':'interaction','data-interaction':JSON.stringify(interactions)},
		name,' ',remove);

	observe(remove, 'click', removeItem);


	$('own-interactions').appendChild(li);

	if (li.scrollIntoView) {
		li.scrollIntoView();
	}
}

function removeItem (event) {
	var item = upOrSelfTag(event.target,'li');
	item.parentNode.removeChild(item);
}

function inisToJS () {
	$("javascript-output").value = ownPoniesScript();
}

function ownPoniesScript () {
	var config = BrowserPonies.dumpConfig();

	delete config.spawnRandom;

	config.autostart = true;
	config.baseurl = $("own-baseurl").value.trim();
	if (!config.baseurl) delete config.baseurl;

	config.spawn  = {};
	config.ponies = [];
	config.interactions = [];

	var items = $("own-ponies").querySelectorAll("li.pony");
	for (var i = 0; i < items.length; ++ i) {
		var li = items[i];
		var pony = JSON.parse(li.getAttribute("data-pony"));
		var filemap = {};

		var getUrl = function (filename) {
			return filemap[decodeURIComponent(filename||"").toLowerCase()];
		};
		
		config.spawn[pony.name] = getNumberFieldValue(li.querySelector("input.count"));
		pony.baseurl = li.querySelector("input.baseurl").value.trim();
		if (!pony.baseurl) delete pony.baseurl;

		var files = li.querySelectorAll(".file");
		for (var j = 0; j < files.length; ++ j) {
			var file = files[j];
			var filename = file.getAttribute("data-filename");
			var url = file.querySelector("input.url").value.trim();
			filemap[filename] = url;
		}

		if (pony.behaviors) {
			for (var j = 0; j < pony.behaviors.length; ++ j) {
				var behavior = pony.behaviors[j];
				behavior.leftimage = getUrl(behavior.leftimage);
				behavior.rightimage = getUrl(behavior.rightimage);

				if (behavior.effects) {
					for (var k = 0; k < behavior.effects.length; ++ k) {
						var effect = behavior.effects[k];
						effect.leftimage = getUrl(effect.leftimage);
						effect.rightimage = getUrl(effect.rightimage);
					}
				}
			}
		}

		if (pony.speeches) {
			for (var j = 0; j < pony.speeches.length; ++ j) {
				var speech = pony.speeches[j];
				if (speech.files) {
					var speechfiles = {};
					for (var type in speech.files) {
						speechfiles[type] = getUrl(speech.files[type]);
					}
					speech.files = speechfiles;
				}
			}
		}
		config.ponies.push(pony);
	}
	
	var items = $("own-interactions").querySelectorAll("li.interaction");
	for (var i = 0; i < items.length; ++ i) {
		var li = items[i];
		config.interactions = config.interactions.concat(JSON.parse(li.getAttribute("data-interaction")));
	}

	if (config.ponies.length === 0) {
		delete config.ponies;
		delete config.spawn;
	}
	if (config.interactions.length === 0) delete config.interactions;

	return "BrowserPonies.loadConfig("+JSON.stringify(config)+");";
}

function initScriptUrl () {
	var url = $('javascript-url');
	url.innerHTML = '';
	tag.add(url,PonyScripts['browser-ponies-script']);
}
