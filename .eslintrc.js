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
		"comma-dangle": ["error", "never"],
		"indent": ["error", "tab", { "SwitchCase": 1 }],
		"func-style": ["error", "expression"],
		"@typescript-eslint/consistent-type-assertions": "off",
		"@typescript-eslint/member-ordering": "off",
		"no-case-declarations": "off",
		"no-undef": "off",
		"no-unused-vars": "off",
		"no-var": "error",
		"@typescript-eslint/no-unused-vars": "error",
		"eqeqeq": "error",
		"quotes": ["error", "double"],
		"yoda": "error"
	}
}