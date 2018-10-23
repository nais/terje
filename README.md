# TERJE (Tremendously Effortless Rbac-Joiner Extension)
Operator that creates RBAC roles and rolebinding based on kubernetes resource labels.

## Running locally
When you run locally using docker, TERJE needs a kubeconfig to connect to the cluster.
You can provide your own by bind-mounting it into `/home/node/.kube/config`

### Helpers
```
npm start
npm test
npm run build
npm run debug
npm run clean
```

### Trigger release
This will trigger a release
```
npm version [patch,minor,major]
git push --tags
```

