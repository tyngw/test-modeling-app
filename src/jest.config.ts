// jest.config.ts
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  rootDir: '..',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    canvas: true,
  },
  moduleNameMapper: {
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testTimeout: 10000,
  bail: false,
  verbose: true,
  collectCoverage: false,
  maxWorkers: 1,
};

export default config;
