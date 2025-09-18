// ESLint config specifically for detecting and categorizing 'any' usage
module.exports = {
  extends: ['./.eslintrc.js'],
  rules: {
    // Detect explicit any usage
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Detect unsafe assignments
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    
    // Detect implicit any
    '@typescript-eslint/no-implicit-any-catch': 'warn',
    
    // Require explicit return types for functions
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
  }
};