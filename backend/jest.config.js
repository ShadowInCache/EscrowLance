export default {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/setup/env.js"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/controllers/authController.js",
    "src/controllers/userController.js",
    "src/controllers/transactionController.js",
    "src/controllers/uploadController.js",
    "src/middleware/**/*.js",
    "src/utils/**/*.js",
    "src/services/**/*.js",
    "src/app.js",
  ],
  coveragePathIgnorePatterns: ["src/server.js", "src/blockchain/contractClient.js"],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 70,
    },
  },
};
