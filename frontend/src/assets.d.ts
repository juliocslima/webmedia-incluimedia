// Explicit asset declarations keep TypeScript side-effect imports stable
// across compiler versions used by the Docker build.
declare module '*.css'
