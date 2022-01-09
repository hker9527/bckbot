module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: [
		"typescript",
		"@typescript-eslint"
	],
	extends: [
		"eslint-config-alloy/typescript"
	],
	rules: {
		"indent": ["error", "tab", { "SwitchCase": 1 }],
		"@typescript-eslint/consistent-type-assertions": "off",
		"@typescript-eslint/member-ordering": "off",
		"no-case-declarations": "off",
		"no-undef": "off",
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": "error",
		"eqeqeq": "error",
		"quotes": ["error", "double"]
	}
}