"use strict";

// Shims:
if (!('trim' in String.prototype)) {
	String.prototype.trim = function () {
		return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	};
}

if (!('trimLeft' in String.prototype)) {
	String.prototype.trimLeft = function () {
		return this.replace(/^\s\s*/, '');
	};
}

if (!('trimRight' in String.prototype)) {
	String.prototype.trimRight = function () {
		return this.replace(/\s\s*$/, '');
	};
}

if (!('isArray' in Array)) {
	Array.isArray = function (object) {
		return Object.prototype.call(object) === '[object Array]';
	};
}

if (!('bind' in Function.prototype)) {
	// Source: https://gist.github.com/978329
	Function.prototype.bind = function (to) {
		// Make an array of our arguments, starting from second argument
		var	partial = Array.prototype.splice.call(arguments, 1),
			// We'll need the original function.
			fn      = this;
		var bound = function () {
			// Join the already applied arguments to the now called ones (after converting to an array again).
			var args = partial.concat(Array.prototype.splice.call(arguments, 0));
			// If not being called as a constructor
			if (!(this instanceof bound)){
				// return the result of the function called bound to target and partially applied.
				return fn.apply(to, args);
			}
			// If being called as a constructor, apply the function bound to self.
			fn.apply(this, args);
		};
		// Attach the prototype of the function to our newly created function.
		bound.prototype = fn.prototype;
		return bound;
	};
}

// dummy console object to prevent crashes on forgotten debug messages:
(function () {
	if (typeof(console) === "undefined") {
		window.console = {};
	}
	if (!('log' in window.console)) {
		window.console.log = function () {};
	}
	var methods = ['info', 'warn', 'error', 'trace', 'dir'];
	for (var i = 0, n = methods.length; i < n; ++ i) {
		var name = methods[i];
		if (!(name in window.console)) {
			window.console[name] = window.console.log;
		}
	}
})();

var BrowserPonies = (function () {
	var BaseZIndex = 900000;
	var observe = document.addEventListener ?
		function (element, event, handler) {
			element.addEventListener(event, handler, false);
		} :
		function (element, event, handler) {
			var wrapper = '_eventHandlingWrapper' in handler ?
				handler._eventHandlingWrapper :
				(handler._eventHandlingWrapper = function () {
					var event = window.event;
					if (!('stopPropagation' in event)) {
						event.stopPropagation = function () {
							this.cancelBubble = true;
						};
					}
					if (!('preventDefault' in event)) {
						event.preventDefault = function() {
							this.returnValue = false;
						};
					}
					if (!('target' in event)) {
						event.target = event.srcElement;
					}
					return handler(event);
				});
			element.attachEvent('on'+event, wrapper);
		};

	var stopObserving = document.removeEventListener ?
		function (element, event, handler) {
			element.removeEventListener(event, hander, false);
		} :
		function (element, event, handler) {
			element.detachEvent('on'+event,handler._eventHandlingWrapper);
		};


	var windowSize = 
		'innerWidth' in window ?
		function () {
			return {
				width:  window.innerWidth,
				height: window.innerHeight
			};
		} :
		function () {
			return {
				width:  document.documentElement.clientWidth,
				height: document.documentElement.clientHeight
			};
		};

	var bodySize = function () {
		return {
			width:  document.body.offsetWidth,
			height: document.body.offsetHeight
		};
	};
	
	var scrollPosition =
		'pageXOffset' in window ?
		function () {
			return {
				left: window.pageXOffset,
				top:  window.pageYOffset
			};
		} :
		function () {
			return {
				left: document.documentElement.scrollLeft,
				top:  document.documentElement.scrollTop
			};
		};

	var Opera = Object.prototype.toString.call(window.opera) === '[object Opera]';
	var IE = !!window.attachEvent && !Opera;
	var add = function (element, arg) {
		if (!arg) return;
		if (typeof(arg) === "string") {
			element.appendChild(document.createTextNode(arg));
		}
		else if (Array.isArray(arg)) {
			for (var i = 0, n = arg.length; i < n; ++ i) {
				add(element, arg[i]);
			}
		}
		else if (arg.nodeType === 1 || arg.nodeType === 3) {
			element.appendChild(arg);
		}
		else {
			for (var attr in arg) {
				var value = arg[attr];
				if (attr === "class" || attr === "className") {
					element.className = String(value);
				}
				else if (attr === "for" || attr === "htmlFor") {
					element.htmlFor = String(value);
				}
				else if (/^on/.test(attr)) {
					if (typeof(value) !== "function") {
						value = new Function("event",
							'if ((function (event) {\n'+value+
							'\n}).call(this,event) === false) { event.preventDefault(); }');
					}
					observe(element, attr.replace(/^on/,""), value);
				}
				else if (attr === 'style') {
					if (typeof(value) === "object") {
						for (var name in value) {
							var cssValue = value[name];
							element.style[name] = cssValue;
							if (name === 'float') {
								element.style.cssFloat   = cssValue;
								element.style.styleFloat = cssValue;
							}
							else if (IE && name === 'opacity') {
								element.style.filter = element.style.filter.replace(/\balpha\([^\)]*\)/gi,'') +
									'alpha(opacity='+(parseFloat(cssValue)*100)+')';
							}
						}
					}
					else {
						element.style.cssText += ";"+value;
					}
				}
				else if (attr === 'value' && element.nodeName === 'TEXTAREA') {
					element.value = value;
				}
				else if (value === true) {
					element.setAttribute(attr,attr);
				}
				else if (value === false) {
					element.removeAttribute(attr);
				}
				else {
					element.setAttribute(attr,String(value));
				}
			}
		}
	};

	var tag = function (name) {
		var element = document.createElement(name);
		for (var i = 1, n = arguments.length; i < n; ++ i) {
			add(element, arguments[i]);
		}
		return element;
	};

	var PonyINI = {
		parse: function (text) {
			var lines = text.split(/\r?\n/);
			var rows = [];
			for (var i = 0, n = lines.length; i < n; ++ i) {
				var line = lines[i].trim();
				if (line.length === 0 || line[0] === "'")
					continue;
				var row = [];
				line = this.parseLine(line,row);
				if (line.length !== 0) {
					console.error("trailing text:",line);
				}
				rows.push(row);
			}
			return rows;
		},
		parseLine: function (line,row) {
			var pos;
			while ((line = line.trimLeft()).length > 0) {
				var ch = line[0];
				switch (ch) {
					case '"':
						line = line.slice(1);
						pos = line.search('"');
						if (pos < 0) pos = line.length;
						row.push(line.slice(0,pos));
						line = line.slice(pos);
						if (line.length > 0) {
							ch = line[0];
							if (ch === '"') {
								line = line.slice(1).trimLeft();
								ch = line[0];
							}
							if (line.length > 0) {
								if (ch === ',') {
									line = line.slice(1);
								}
								else if (ch !== '}') {
									console.error("data after quoted string:",line);
								}
							}
						}
						else {
							console.error("unterminated quoted string");
						}
						break;

					case ',':
						row.push("");
						break;

					case '{':
						var nested = [];
						row.push(nested);
						line = this.parseLine(line.slice(1),nested).trimLeft();
						if (line.length > 0) {
							ch = line[0];
							if (ch !== '}') {
								console.log("data after list:",line);
							}
							else {
								line = line.slice(1).trimLeft();
								ch = line[0];
							}

							if (ch === ',') {
								line = line.slice(1);
							}
						}
						else {
							console.error("unterminated list");
						}
						break;

					case '}':
					case '\n':
						return line;

					default:
						pos = line.search(/[,}]/);
						if (pos < 0) pos = line.length;
						row.push(line.slice(0,pos).trim());
						line = line.slice(pos);
						if (line.length > 0) {
							ch = line[0];
							if (ch === ',') {
								line = line.slice(1);
							}
							else if (ch !== '}') {
								console.error("data string:",line);
							}
						}
				}
			}
			return line;
		}
	};

	var parseBoolean = function (value) {
		var s = value.toLowerCase().trim();
		if (s === "true") return true;
		else if (s === "false") return false;
		else throw new Error("illegal boolean value: "+value);
	};

	var $ = function (element_or_id) {
		if (typeof(element_or_id) === "string") {
			return document.getElementById(element_or_id);
		}
		else if (element_or_id && element_or_id.nodeType === 1) {
			return element_or_id;
		}
		else {
			return null;
		}
	};

	var distance = function (p1, p2) {
		var dx = p2.x - p1.x;
		var dy = p2.y - p1.y;
		return Math.sqrt(dx*dx + dy*dy);
	};

	var randomSelect = function (list) {
		return list[Math.round((list.length - 1) * Math.random())];
	};

	var Movements = {
		Left:      0,
		Right:     1,
		Up:        2,
		Down:      3,
		UpLeft:    4,
		UpRight:   5,
		DownLeft:  6,
		DownRight: 7
	};

	var AllowedMoves = {
		None:               0,
		HorizontalOnly:     1,
		VerticalOnly:       2,
        HorizontalVertical: 3,
        DiagonalOnly:       4,
        DiagonalHorizontal: 5,
        DiagonalVertical:   6,
        All:                7,
        MouseOver:          8,
        Sleep:              9
	};

	var Locations = {
		Top:           0,
		Bottom:        1,
		Left:          2,
		Right:         3,
		BottomRight:   4,
		BottomLeft:    5,
		TopRight:      6,
		TopLeft:       7,
		Center:        8,
		Any:           9,
		AnyNotCenter: 10
	};

	var camelize = function (s) {
		var parts = s.split(/[-_\s]/);
		var buf = [];
		for (var i = 0, n = parts.length; i < n; ++ i) {
			var part = parts[i];
			buf.push(part.slice(0,1).toUpperCase());
			buf.push(part.slice(1).toLowerCase());
		}
		return buf.join('');
	};

	var extend = function (dest, src) {
		for (var name in src) {
			dest[name] = src[name];
		}
		return dest;
	};

	var clone = function (obj) {
		return extend({}, obj);
	};

	var Behavior = function Behavior (baseurl, behavior) {
		extend(this, behavior);

		this.movement = null;
		var movement  = behavior.movement.replace(/[-_\s]/,'').toLowerCase();

		for (var name in AllowedMoves) {
			if (name.toLowerCase() === movement) {
				this.movement = AllowedMoves[name];
				break;
			}
		}

		if (this.movement === null) {
			throw new Error("illegal movement: "+behavior.movement);
		}

		// Image preloading:
		if (behavior.rightimage) {
			this.rightimage = baseurl + behavior.rightimage;
			preload(this.rightimage);
		}
		
		if (behavior.leftimage) {
			this.leftimage = baseurl + behavior.leftimage;
			preload(this.leftimage);
		}

		this.effects         = [];
		this.effects_by_name = {};
		if ('effects' in behavior) {
			for (var i = 0, n = behavior.effects.length; i < n; ++ i) {
				var effect = new Effect(baseurl, behavior.effects[i]);
				this.effects_by_name[effect.name] = effect;
				this.effects.push(effect);	
			}
		}
	};

	Behavior.prototype = {
		isMoving: function () {
			switch (this.movement) {
				case AllowedMoves.None:
				case AllowedMoves.MouseOver:
				case AllowedMoves.Sleep:
					return false;
				default:
					return true;
			}
		}
	};

	var parseLocation = function (value) {
		var loc = value.replace(/[-_\s]/,'').toLowerCase();
		for (var name in Locations) {
			if (name.toLowerCase() === loc) {
				return Locations[name];
			}
		}
		throw new Error('illegal location: '+value);
	};
	
	var Effect = function Effect (baseurl, effect) {
		extend(this, effect);

		var locs = ['rightloc','leftloc','rightcenter','leftcenter'];
		for (var i = 0; i < locs.length; ++ i) {
			var name = locs[i];
			if (name in effect) {
				this[name] = parseLocation(effect[name]);
			}
		}

		// Image preloading:
		if (effect.rightimage) {
			this.rightimage = baseurl + effect.rightimage;
			preload(this.rightimage);
		}
		
		if (effect.leftimage) {
			this.leftimage = baseurl + effect.leftimage;
			preload(this.leftimage);
		}
	};

	var images = {};
	var onload_callbacks = [];
	var allloaded = true;
	var preload = function (imgurl) {
		if (!Object.prototype.hasOwnProperty.call(images,imgurl)) {
			var image = new Image();
			image.src = imgurl;
			observe(image, 'load', function () {
				images[imgurl] = true;
				for (var url in images) {
					if (!images[url])
						return;
				}
				allloaded = true;
				for (var i = 0, n = onload_callbacks.length; i < n; ++ i) {
					onload_callbacks[i]();
				}
				onload_callbacks = [];
			});
			allloaded = false;
			images[imgurl] = false;
		}
	};
	var onload = function (callback) {
		if (allloaded) {
			callback();
		}
		else {
			onload_callbacks.push(callback);
		}
	};

	var Pony = function Pony (pony) {
		if (!pony.name) {
			throw new Error('illegal pony name: '+pony.name);
		}
		this.name      = pony.name;
		this.baseurl   = pony.baseurl;
		this.behaviors = [];
		this.mouseover_behaviors = [];
		this.behaviors_by_name = {};
		this.speeches  = pony.speeches;
		this.interactions = []; // TODO
		
		if ('behaviors' in pony) {
			for (var i = 0, n = pony.behaviors.length; i < n; ++ i) {
				var behavior = new Behavior(this.baseurl, pony.behaviors[i]);
				this.behaviors_by_name[behavior.name] = behavior;
				this.behaviors.push(behavior);

				if (behavior.movement === AllowedMoves.MouseOver) {
					this.mouseover_behaviors.push(behavior);
				}
			}

			for (var i = 0, n = this.behaviors.length; i < n; ++ i) {
				var behavior = this.behaviors[i];
				if (behavior.linked) {
					if (Object.prototype.hasOwnProperty.call(this.behaviors_by_name, behavior.linked)) {
						behavior.linked = this.behaviors_by_name[behavior.linked];
					}
					else {
						throw new Error('behavior '+behavior.name+' of pony '+this.name+
							' references non-existing behavior '+behavior.linked);
					}
				}
			}
		}
	};

	var descendantOf = function (child, parent) {
		var node = child.parentNode;
		while (node) {
			if (node === parent) {
				return true;
			}
		}
		return false;
	};

	var Instance = function Instance (pony) {
		this.pony = pony;
		this.img  = tag('img', {
			draggable: 'false',
			style: {
				position:        "fixed",
				borderStyle:     "none",
				margin:          "0",
				padding:         "0",
				backgroundColor: "transparent",
				zIndex:          String(BaseZIndex)
			},
			onmousedown: function (event) {
				// TODO: drag pony
				this.behave(this.randomBehavior(true));
				dragged = this;
			}.bind(this),
			onmousemove: function () {
				if (!this.mouseover) {
					this.mouseover = true;
					if ((!this.current_behavior || this.current_behavior.movement !== AllowedMoves.MouseOver) &&
							this.pony.mouseover_behaviors.length > 0) {
						this.behave(this.randomBehavior(true));
					}
				}
			}.bind(this),
			onmouseout: function (event) {
				var target = event.target;
				// XXX: the img has no descendants but if it had it might still be correct in case
				//      the relatedTarget is an anchester of the img or any node that is not a child
				//      of img or img itself.
//				if (this.mouseover && (target === this.img || !descendantOf(target, this.img))) {
				if (this.mouseover) {
					this.mouseover = false;
//					if (!this.current_behavior || this.current_behavior.movement === AllowedMoves.MouseOver) {
//						this.nextBehavior();
//					}
				}
			}.bind(this)
		});

		this.start_time       = null;
		this.end_time         = null;
		this.start_position   = null;
		this.current_behavior = null;
		this.facing_right     = true;
	};

	var isOffscreen = function (rect) {
		var winsize = windowSize();
		return rect.x < 0 || rect.y < 0 ||
			rect.x + rect.width  > winsize.width || 
			rect.y + rect.height > winsize.height;
	};

	var clipToScreen = function (rect) {
		var winsize = windowSize();
		var x = rect.x;
		var y = rect.y;

		if (x < 0) {
			x = 0;
		}
		else if (x + rect.width > winsize.width) {
			x = winsize.width - rect.width;
		}

		if (y < 0) {
			y = 0;
		}
		else if (y + rect.height > winsize.height) {
			y = winsize.height - rect.height;
		}

		return {x: x, y: y};
	};

	Instance.prototype = {
		// TODO
		paint: function () {
			// TODO: effects
		},
		update: function (currentTime, passedTime, winsize) {
			var curr = this.rect();

			// move back into screen:
			if (curr.x + curr.width < 0 || 
				curr.y + curr.height < 0 ||
				curr.x > winsize.width < 0 ||
				curr.y > winsize.height) {
				this.behave(this.randomBehavior(false, true), true);
			}

			var dest = null;
			if (this.following) {
				if (this.following.img.parentNode) {
					dest = this.following.position();
				}
				else {
					this.following = null;
				}
			}

			if (!dest) {
				dest = this.dest_position;
			}

			if (dest) {
				var pos;
				var dx = dest.x - curr.x;
				var dy = dest.y - curr.y;
				var dist  = distance(curr, dest);
				var tdist = this.current_behavior.speed * passedTime * 0.01 * 3;

				if (tdist >= dist) {
					pos = dest;
				}
				else {
					var scale = tdist / dist;
					pos = {
						x: curr.x + scale * dx,
						y: curr.y + scale * dy
					};
				}

				if (curr.x !== dest.x) {
					this.lookRight(curr.x < dest.x);
				}
				this.setPosition(pos);
/*
				console.log(
					"current: "+curr.x+" x "+curr.y+
					", step: "+pos.x+" x "+pos.y+
					", dest: "+dest.x+" x "+dest.y+
					", dist: "+dist+
					", dist for passed time: "+tdist);
*/
			}
			else {
				this.clipToScreen();
			}

			this.paint();

			if (currentTime >= this.end_time) {
				this.nextBehavior();
			}
		},
		setPosition: function (pos) {
			this.img.style.left = Math.round(pos.x)+'px';
			this.img.style.top  = Math.round(pos.y)+'px';
		},
		moveBy: function (offset) {
			var pos = this.position();
			pos.x += offset.x;
			pos.y += offset.y;
			this.setPosition(pos);
		},
		clipToScreen: function () {
			this.setPosition(clipToScreen(this.rect()));
		},
		position: function () {
			return {
				x: this.img.offsetLeft,
				y: this.img.offsetTop
			};
		},
		size: function () {
			return {
				width:  this.img.offsetWidth,
				height: this.img.offsetHeight
			};
		},
		rect: function () {
			return extend(this.position(), this.size());
		},
		isOffscreen: function () {
			return isOffscreen(this.rect());
		},
		getNearestInstance: function (name) {
			var ponies = [];
			var pos = this.position();
			name = name.toLowerCase();
			for (var i = 0, n = instances.length; i < n; ++ i) {
				var inst = instances[i];
				if (this !== inst && inst.pony.name.toLowerCase() === name) {
					ponies.push([distance(pos, inst.position()), inst]);
				}
			}
			if (ponies.length === 0) {
				return null;
			}
			ponies.sort();
			return ponies[0][1];
		},
		nextBehavior: function () {
			if (this.current_behavior && this.current_behavior.linked) {
				this.behave(this.current_behavior.linked);
			}
			else {
				this.behave(this.randomBehavior(this.pony.mouseover_behaviors.length > 0 && this.mouseover));
			}
		},
		lookRight: function (value) {
			this.facing_right = value;
			var newimg;
			if (value) {
				newimg = this.current_behavior.rightimage;
			}
			else {
				newimg = this.current_behavior.leftimage;
			}
			if (newimg !== this.img.getAttribute("src")) {
				this.img.src = newimg;
			}
		},
		behave: function (behavior, moveIntoScreen) {
			this.current_behavior = behavior;
			var duration = behavior.minduration +
				(behavior.maxduration - behavior.minduration) * Math.random();
			this.start_time = Date.now();
			this.end_time   = this.start_time + duration * 1000;
			this.start_position = this.position();
			
			this.following = null;
			if (behavior.follow) {
				this.following = this.getNearestInstance(behavior.follow);
			}
			
			var size = this.size();
			var winsize = windowSize();
			var pos = this.position();
			if (this.following) {
				this.dest_position = this.following.position();
			}
			else if (behavior.x && behavior.y) {
				this.dest_position = {
					x: (winsize.width  - size.width)  * behavior.x / 100,
					y: (winsize.height - size.height) * behavior.y / 100
				};
			}
			else {
				var movements = null;
				switch (behavior.movement) {
					case AllowedMoves.HorizontalOnly:
						movements = [Movements.Left, Movements.Right];
						break;

					case AllowedMoves.VerticalOnly:
						movements = [Movements.Up, Movements.Down];
						break;

					case AllowedMoves.HorizontalVertical:
						movements = [Movements.Left, Movements.Right,
						             Movements.Up, Movements.Down];
						break;

					case AllowedMoves.DiagonalOnly:
						movements = [Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.DiagonalHorizontal:
						movements = [Movements.Left, Movements.Right,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.DiagonalVertical:
						movements = [Movements.Up, Movements.Down,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;

					case AllowedMoves.All:
						movements = [Movements.Left, Movements.Right,
						             Movements.Up, Movements.Down,
						             Movements.UpLeft, Movements.UpRight,
						             Movements.DownLeft, Movements.DownRight];
						break;
				}

				if (movements === null) {
					this.dest_position = pos;
				}
				else {
					// speed is in pixels/100ms, duration is in sec
					// XXX: why so slow?
					var dist = behavior.speed * duration * 100 * 3;

					var a;
					switch (randomSelect(movements)) {
						case Movements.Up:
							this.dest_position = {
								x: pos.x,
								y: pos.y - dist
							};
							break;
						case Movements.Down:
							this.dest_position = {
								x: pos.x,
								y: pos.y + dist
							};
							break;
						case Movements.Left:
							this.dest_position = {
								x: pos.x - dist,
								y: pos.y
							};
							break;
						case Movements.Right:
							this.dest_position = {
								x: pos.x + dist,
								y: pos.y
							};
							break;
						case Movements.UpLeft:
							a = Math.round(Math.sqrt(dist*dist*0.5));
							this.dest_position = {
								x: pos.x - a,
								y: pos.y - a
							};
							break;
						case Movements.UpRight:
							a = Math.round(Math.sqrt(dist*dist*0.5));
							this.dest_position = {
								x: pos.x + a,
								y: pos.y - a
							};
							break;
						case Movements.DownLeft:
							a = Math.round(Math.sqrt(dist*dist*0.5));
							this.dest_position = {
								x: pos.x - a,
								y: pos.y + a
							};
							break;
						case Movements.DownRight:
							a = Math.round(Math.sqrt(dist*dist*0.5));
							this.dest_position = {
								x: pos.x + a,
								y: pos.y + a
							};
							break;
					}

					if (moveIntoScreen) {
						this.dest_position = clipToScreen(extend(this.dest_position, size));
					}
				}

				this.lookRight(
					pos.x !== this.dest_position.x ?
					pos.x < this.dest_position.x :
					this.facing_right);
			}

			var msg;
			if (this.following) {
				msg = "following "+this.following.name;
			}
			else if (this.dest_position.x !== pos.x || this.dest_position.y !== pos.y) {
				msg = "move from "+pos.x+" x "+pos.y+" to "+
					Math.round(this.dest_position.x)+" x "+
					Math.round(this.dest_position.y);
			}
			else {
				msg = "no movement";
			}
			console.log(this.pony.name+" does "+behavior.name+": "+msg+" in "+duration+
				" seconds ("+behavior.effects.length+" effects)");

			// TODO: effects
			this.paint();
		},
		teleport: function () {
			var winsize = windowSize();
			var size = this.size();
			this.setPosition({
				x: Math.random() * (winsize.width  - (size.width || 106)),
				y: Math.random() * (winsize.height - (size.height || 96))
			});
		},
		// randomly select behavior
		randomBehavior: function (mouseover, forceMovement) {
			var behaviors = mouseover ?
				this.pony.mouseover_behaviors :
				this.pony.behaviors;
			var sumprob = 0;
			for (var i = 0, n = behaviors.length; i < n; ++ i) {
				var behavior = behaviors[i];
				if (behaviors.skip || (forceMovement && !behavior.isMoving())) continue;
				sumprob += behavior.probability;
			}
			var dice = Math.random() * sumprob;
			var last = 0;
			for (var i = 0, n = behaviors.length; i < n; ++ i) {
				var behavior = behaviors[i];
				if (behaviors.skip || (forceMovement && !behavior.isMoving())) continue;
				var next = last + behavior.probability;
				if (last <= dice && dice <= next) {
					return behavior;
				}
				last = next;
			}
		}
	};

	var lastTime = Date.now();
	var tick = function () {
		var time = Date.now();
		var span = time - lastTime;
		var winsize = windowSize();
		for (var i = 0, n = instances.length; i < n; ++ i) {
			instances[i].update(time, span, winsize);
		}
		lastTime = time;

		// fix stacking order:
		instances.sort(function (lhs, rhs) {
			return (lhs.img.offsetTop + lhs.img.offsetHeight) - (rhs.img.offsetTop + rhs.img.offsetHeight);
		});
		for (var i = 0, n = instances.length; i < n; ++ i) {
			instances[i].img.style.zIndex = String(BaseZIndex + i);
		}
	};

	var interval = 40;
	var ponies = {};
	var interactions = {};
	var instances = [];
	var overlay = null;
	var timer = null;
	var mousePosition = null;
	var dragged = null;

	var getOverlay = function () {
		if (!overlay) {
			overlay = tag('div', {id: 'browser-ponies'});
		}
		if (!overlay.parentNode) {
			document.body.appendChild(overlay);
		}
		return overlay;
	};

	observe(window, 'mousemove', function (event) {
		if (!mousePosition) {
			mousePosition = {
				x: event.clientX,
				y: event.clientY
			};
		}
		if (dragged) {
			dragged.moveBy({
				x: event.clientX - mousePosition.x,
				y: event.clientY - mousePosition.y
			});
		}
		mousePosition.x = event.clientX;
		mousePosition.y = event.clientY;
	});
	
	observe(window, 'mouseup', function (event) {
		dragged = null;
	});

	return {
		convertPony: function (ini, baseurl) {
			var rows = PonyINI.parse(ini);
			var pony = {
				baseurl:   baseurl || "",
				behaviors: [],
				speeches:  []
			};
			var behaviors_by_name = {};
			var effects = [];

			for (var i = 0, n = rows.length; i < n; ++ i) {
				var row = rows[i];
				var type = row[0].toLowerCase();

				switch (type) {
					case "name":
						pony.name = row[1];
						break;
						
					case "behavior":
						var behavior = {
							name: row[1],
							probability: parseFloat(row[2]),
							maxduration: parseFloat(row[3]),
							minduration: parseFloat(row[4]),
							speed:       parseFloat(row[5]),
							rightimage:  row[6],
							leftimage:   row[7],
							movement:    row[8],
							skip:        false,
							effects:     []
						};
						if (row.length > 9) {
							if (row[9]) behavior.linked = row[9];
							var speakstart = (row[10] || '').trim();
							if (speakstart) behavior.speakstart = speakstart;
							var speakend = (row[11] || '').trim();
							if (speakend)   behavior.speakend   = speakend;
							behavior.skip = parseBoolean(row[12]);
							behavior.x    = parseFloat(row[13]);
							behavior.y    = parseFloat(row[14]);
							if (row[15]) behavior.follow = row[15];
						}
						pony.behaviors.push(behavior);
						behaviors_by_name[behavior.name] = behavior;
						break;
						
					case "effect":
						var effect = {
							name:        row[1],
							behavior:    row[2],
							rightimage:  row[3],
							leftimage:   row[4],
							duration:    parseFloat(row[5]),
							delay:       parseFloat(row[6]),
							rightloc:    row[7].trim(),
							rightcenter: row[8].trim(),
							leftloc:     row[9].trim(),
							leftcenter:  row[10].trim(),
							follow:      parseBoolean(row[11])
						};
						effects.push(effect);
						break;
						
					case "speak":
						var speak;
						if (row.length === 2) {
							speak = {
								name: "Unnamed",
								text: row[1],
								skip: false
							};
						}
						else {
							speak = {
								name: row[1],
								text: row[2].trim(),
								skip: row[4] ? parseBoolean(row[4]) : false
							};
							if (row[3]) speak.file = row[3];
						}
						pony.speeches.push(speak);
						break;

					default:
						console.error("unknown pony setting:",row);
				}
			}

			for (var i = 0, n = effects.length; i < n; ++ i) {
				var effect = effects[i];
				if (!Object.prototype.hasOwnProperty.call(behaviors_by_name,effect.behavior)) {
					throw new Error("effect "+effect.name+" of pony "+pony.name+
						" references non-existing behavior "+effect.behavior);
				}
				behaviors_by_name[effect.behavior].effects.push(effect);
				delete effect.behavior;
			}

			return pony;
		},
		convertInteractions: function (ini) {
			var rows = PonyINI.parse(ini);
			var interactions = [];

			for (var i = 0, n = rows.length; i < n; ++ i) {
				var row = rows[i];
				var all = false;
				if (row.length > 4) {
					all = row[5].trim().toLowerCase();
					if (all === "true" || all === "all") {
						all = true;
					}
					else if (all === "false" || all == "random" || all === "any") {
						all = false;
					}
					else {
						throw new Error("illegal value: "+row[5]);
					}
				}

				interactions.push({
					name:        row[0],
					pony:        row[1],
					probability: parseFloat(row[2]),
					proximity:   parseFloat(row[3]),
					targets:     row[4],
					all:         all,
					behaviors:   row[6],
					repeatdelay: row.length > 7 ? parseFloat(row[7].trim()) : 0
				});
			}

			return interactions;
		},
		addInteractions: function (interactions) {
			for (var i = 0, n = interactions.length; i < n; ++ i) {
				this.addInteraction(interactions[i]);
			}
		},
		addInteraction: function (interaction) {
			interactions[interaction.name] = interaction;
		},
		addPonies: function (ponies) {
			for (var i = 0, n = ponies.length; i < n; ++ i) {
				this.addPony(ponies[i]);
			}
		},
		addPony: function (pony) {
			ponies[pony.name] = new Pony(pony);
		},
		spawn: function (pony, count) {
			if (count === undefined) count = 1;
			while (count > 0) {
				instances.push(new Instance(ponies[pony]));
				-- count;
			}
		},
		start: function () {
			var overlay = getOverlay();
			overlay.innerHTML = '';
			onload(function () {
				for (var i = 0, n = instances.length; i < n; ++ i) {
					var inst = instances[i];
					overlay.appendChild(inst.img);
					inst.teleport();
					inst.nextBehavior();
				}
				if (timer === null) {
					lastTime = Date.now();
					timer = setInterval(tick, interval);
				}
			});
		},
		stop: function () {
			if (overlay) {
				overlay.parentNode.removeChild(overlay);
				overlay = null;
			}
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
		},
		pause: function () {
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
		},
		resume: function () {
			getOverlay();
			onload(function () {
				if (timer === null) {
					lastTime = Date.now();
					timer = setInterval(tick, interval);
				}
			});
		},
		setInterval: function (time) {
			interval = time;
			if (timer !== null) {
				clearInterval(timer);
				timer = setInterval(tick, interval);
			}
		},
		getInterval: function () {
			return interval;
		},
		running: function () {
			return timer !== null;
		}
	};
})();

(function () {
	if (typeof(BrowserPoniesConfig) !== "undefined") {
		if (BrowserPoniesConfig.interactions) {
			BrowserPonies.addInteractions(BrowserPoniesConfig.interactions);
		}
		if (BrowserPoniesConfig.ponies) {
			BrowserPonies.addPonies(BrowserPoniesConfig.ponies);
		}
		if (BrowserPoniesConfig.spawn) {
			for (var i = 0, n = BrowserPoniesConfig.spawn.length; i < n; ++ i) {
				var spawn = BrowserPoniesConfig.spawn[i];
				BrowserPonies.spawn(spawn.name, spawn.count);
			}
		}
	}
})();
