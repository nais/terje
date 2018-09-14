# TERJE (Tremendously Effortless Rbac-Joiner Extension)
Operator that creates RBAC rules based on kubernetes resource labels

### Run
`npm start` runs Terje

### Debug
`npm run debug` runs with node --inspect whick makes it possible to connect a debugger to the node

### Test
`npm test` runs the tests

### Build
`npm run build` creates the dist folder with transpiled typescript -> javascript

### Release
`npm version [patch,minor,major]`
`npm run build-image`
`npm run push-image`
