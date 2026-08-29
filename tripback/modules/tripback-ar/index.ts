// Re-export the native module. On web, it will be resolved to TripBackARModule.web.ts
// and on native platforms to TripBackARModule.ts
export { default } from './src/TripBackARModule';
export { default as TripBackARView } from './src/TripBackARView';
export * from './src/TripBackAR.types';
