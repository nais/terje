let createPolicyRuleForResource = (resource: string, resourceNames: string[]) => {
    return {
        "apiGroups": ["*"],
        "resources": [resource],
        "resourceNames": resourceNames,
        "verbs": ['*']
    };
};

let createPolicyRules = (resources: resourceTypesToNamesMap) => {
    let rules: {}[] = [];
    for (let resourceType in resources) {
        rules.push(createPolicyRuleForResource(resourceType, resources[resourceType]))
    }

    return rules
};

export let createRole = (team: string, namespace: string, resources: resourceTypesToNamesMap) => {
    return {
        metadata: {
            name: 'team-' + team,
            namespace: namespace
        },
        rules: createPolicyRules(resources)
    }
};

