var products = require('../index.js');

products.options({
	isMulti	: true
})

products.line('blue')
products.label('Select by hitting SPACE. When finished, hit RETURN', 'white', 'magenta')
products.line('blue')
products.add('Backbone')
products.add('Bootstrap')
products.add('Marionette')

products.offer(function(selected) {
	console.log(selected);
	process.exit(0);
})