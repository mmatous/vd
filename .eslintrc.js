module.exports = {
	'env': {
		'browser': true,
		'es6': true,
		'jest': true,
		'node': true
	},
	'extends': 'eslint:recommended',
	'globals': {
        'browser': 'readonly'
    },
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
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		]
	}
};
