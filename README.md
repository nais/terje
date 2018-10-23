# TERJE (Tremendously Effortless Rbac-Joiner Extension)
Operator that creates RBAC roles and rolebinding based on kubernetes resource labels.

## How
Every minute TERJE will fetch [this](https://navno.sharepoint.com/sites/Bestillinger/Lists/Nytt%20Team/AllItems.aspx) list of groups and create RoleBindings for these groups in every namespace labeled with `managed-by: terje`.
For every relevant resource in the cluster that is created/updated and has a label `team: <name>` TERJE ensures that the role for <name> has access to this resource by listing it explicitly in the role for <name>.

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

