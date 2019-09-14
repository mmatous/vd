module.exports = {
	'env': {
		'browser': true,
		'es6': true,
		"webextensions": true
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'ecmaVersion': 2018,
		'sourceType': 'module'
	},
	'rules': {
		'indent': [
			'error',
			'tab'
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'no-console': [
			'error',
			{ 'allow': ['error', 'info', 'warn'] }
		],
		'no-trailing-spaces': [
			'error'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		]
	},

	"overrides": [
		{
		  "files": ["test/*.js"],
		  "env": {
			'es6': true,
			'jest': true,
			'node': true
		  }
		}
	  ]
};
