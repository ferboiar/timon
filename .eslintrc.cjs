/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
    root: true,
    ignorePatterns: ['dist/**', 'coverage/**', 'doc/**', '_adjuntos/**'],
    env: {
        node: true
    },
    extends: ['plugin:vue/vue3-essential', 'eslint:recommended', '@vue/eslint-config-prettier'],
    parserOptions: {
        ecmaVersion: 'latest'
    },
    rules: {
        'vue/multi-word-component-names': 'off',
        'vue/no-reserved-component-names': 'off',
        'vue/component-tags-order': [
            'error',
            {
                order: ['script', 'template', 'style']
            }
        ]
    },
    // DC-76: backend y scripts se escriben con otro estilo; el lint no les impone el formato del frontend
    overrides: [
        {
            files: ['backend/**/*.{js,mjs,cjs}', 'scripts/**/*.{js,mjs,cjs}'],
            rules: {
                'prettier/prettier': 'off'
            }
        }
    ]
};
