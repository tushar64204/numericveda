products
========

A command-line tool for creating lists of things to select. Multiselect on the command line.

usage
=====

var products = require('products');

products.add('Shoes')
products.add('Socks')
products.add('Laces')

products.offer(function(selected) {
	console.log(selected);
	process.exit(0);
})
