var Screenliner = require('screenliner');
var keypress 	= require('keypress');
var clio		= require('clio')();
var util		= require('util');
var screenliner = new Screenliner();
var fs 			= require('fs');
var Joi			= require('joi');

var selected 	= clio.prepare("@green[√]@@");
var highlighted	= clio.prepare("@blue[@green√@blue]@@");
var empty		= "[ ]";

var colors = ['black','red','green','yellow','blue','magenta','cyan','white'];

var options = {
	fgcolor 		: undefined,
	bgcolor 		: undefined,
	selectedColor	: 'magenta',
	isMulti			: false,
	selectFirst		: true
};

var optionsSchema = Joi.object().keys({
	fgcolor 		: Joi.string().valid(colors),
	bgcolor 		: Joi.string().valid(colors),
	selectedColor	: Joi.string().valid(colors),
	isMulti			: Joi.boolean(),
	selectFirst 	: Joi.boolean()
});

var validate = function(opts) {

	opts = opts || {};

	var result = Joi.validate(opts, optionsSchema);
	
	if(result.error) {
		clio.write('@white@_red' + result.error + '`@cyan@_blackreceived: ' + util.inspect(result.error._object));
		process.exit(1);
	}
};

var api = Object.create({
	current : {},	
	lastIdx : 0,
	
	//	Pad string with such that it stretches across entire display
	//
	//	@param	{String}	str		The string to pad
	//	@param	{String}	padChar	The character to pad with, defaulting to space.
	//
	pad : function(str, padChar) {
		return str + new Array(screenliner.width - str.length + 1).join(padChar || ' ');
	},
	
	//	Add (clio)colorization to a string. Used internally.
	//
	//	@param	{String}	str			The label for the product in a display list
	//	@param	{String}	[fgcolor]	One of accepted #colors, setting foreground of label.
	//	@param	{String}	[bgcolor]	One of accepted #colors, setting background of label.
	//
	//	@see 	#add
	//
	colorize : function(str, fgcolor, bgcolor) {
	
		fgcolor = fgcolor || options.fgcolor;
		bgcolor = bgcolor || options.bgcolor;

		validate({
			fgcolor : fgcolor,
			bgcolor : bgcolor
		})

		fgcolor = fgcolor ? '@' + fgcolor : '';
		bgcolor = bgcolor ? '@_' + bgcolor : '';
		
		if(bgcolor) {
			str = this.pad(str);
		}

		return clio.prepare('\x1B[1m' + fgcolor + bgcolor + str + '@@');
	},
	
	//	Set options for product display
	//
	//	@param	{Object}	[opts]	Various display options
	//
	options : function(opts) {

		validate(opts);
		
		for(var o in opts) {
			options[o] = opts[o]
		}
	},
	
	label : function(str, fgcolor, bgcolor) {
		console.log(this.colorize(str, fgcolor, bgcolor));
	},
	
	line : function(fgcolor, bgcolor) {
		console.log(this.colorize(this.pad('-', '-'), fgcolor, bgcolor));
	},
	
	//	Add a product to a display list
	//
	//	@param	{String}	str			The label for the product in a display list
	//	@param	{String}	[fgcolor]	One of accepted #colors, setting foreground of label.
	//	@param	{String}	[bgcolor]	One of accepted #colors, setting background of label.
	//
	add : function(str, fgcolor, bgcolor) {
		var to = typeof str;
		if(str && to !== "string") {
			throw new TypeError("#region must be a String. Received: " + to);
		}

		str = empty + " " + str;
		
		var region = screenliner.createRegion(this.colorize(str, fgcolor, bgcolor));

		this.lastIdx = this.current.id;

		this.current = screenliner.regions[screenliner.regions.length -1];
		
		return region;
	},
	
	//	Re-draws display to reflect state of this#current, such as whether checked or not.
	//
	//	@see	#up
	//	@see	#down
	//
	updateCheck : function() {
		
		if(this.current.selected) {
			this.current.replace(
				selected, 
				highlighted
			)			
		} else {
			this.current.replace(
				empty, 
				highlighted
			)		
		}
		
		if(screenliner.regions[this.lastIdx].selected) {
			screenliner.regions[this.lastIdx].replace(
				highlighted, 
				selected
			)
		} else {
			screenliner.regions[this.lastIdx].replace(
				highlighted, 
				empty
			)
		}
	},
	
	//	Toggle current region's #selected state
	//
	select : function() {
		this.current.selected = !this.current.selected;		
	},
	
	//	Return an array of selected regions
	//
	selected : function() {
		return screenliner.regions.filter(function(r) {
			return r.selected
		})
	},
	
	//	Handler for keyboard up arrow
	//	Sets this#current to the previous (up) screenliner region
	//	Cyclic, so resets to bottom when top reached.
	//
	up : function() {
	
		this.lastIdx = this.current.id;	
	
		if((this.current.id -1) < 0) {
			this.current = screenliner.regions[screenliner.regions.length -1];
		} else {
			this.current = screenliner.regions[this.current.id -1]
		}
		
		this.updateCheck()
	},
	
	//	Handler for keyboard down arrow
	//	Sets this#current to the next (down) screenliner region.
	//	Cyclic, so resets to top when botton reached.
	//
	down : function() {	
	
		this.lastIdx = this.current.id;
	
		if((this.current.id +1) === screenliner.regions.length) {
			this.current = screenliner.regions[0];
		} else {
			this.current = screenliner.regions[this.current.id +1]
		}

		this.updateCheck()
	},
	
	//	Activates keyboard commands on terminal. Allows selections to be made.
	//
	//	@param	{Function}	commitF		The handler receiving selections when made
	//
	offer : function(commitF) {
	
		var committed;
		
		var returnSelections = function() {
			process.stdin.removeListener('keypress', handleKeypress);
			commitF && commitF(api.selected().map(function(s) {
				return s.id;
			}))
		}
		
		var handleKeypress = function(ch, key) {
		
			if(!key) {
				return;
			}	
		
			if(key.ctrl && key.name == 'c') {
				return process.exit(0);
			}
			
			switch(key.name) {
				case "up":
					api.up()
				break;
				
				case "down":
					api.down()
				break;
				
				case "space":
					api.select()
					!options.isMulti && returnSelections()
				break;
				
				case "return":
					!options.isMulti && api.select()
					returnSelections();
				break;
				
				default:
					//console.log(key)
				break;
			}
		
		};
	
		keypress(process.stdin);
		
		process.stdin.on('keypress', handleKeypress);
		
		process.stdin.setRawMode(true);
		process.stdin.resume();	
		
		//	This initializes the view -- it will create a checkmark
		//	in the first product slot.
		//
		options.selectFirst && api.down()
	}
})

module.exports = api;