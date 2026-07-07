import next from 'eslint-config-next'

// eslint-config-next 16 ships a native flat config (array), so no FlatCompat.
const eslintConfig = [
  ...next,
  {
    ignores: ['.velite/**', '.next/**', 'node_modules/**'],
  },
]

export default eslintConfig
