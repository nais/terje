import {addResourceToRole, createRole} from "./rolecreator";
import {V1Role} from "@kubernetes/client-node";

const team = 'unittest';
const roleName = `team-${team}`;
const namespace = 'namespace';

test('test created role has correct metadata', () => {
    const role: V1Role = createRole(team, namespace);

    expect(role.metadata.name).toMatch(roleName);
    expect(role.metadata.namespace).toMatch(namespace);
});

test('test rules get added to role with no previous rules', () => {
    const role: V1Role = createRole(team, namespace);
    const resourceType = "resourceType";
    const resourceName = "resourceName";

    let newRole = addResourceToRole(role, resourceType, resourceName);

    expect(newRole.rules[0].resources[0]).toMatch(resourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName);
});

test('test rules get added to role with existing rules of same resourceType', () => {
    const role: V1Role = createRole(team, namespace);
    const resourceType = "resourceType";
    const firstResourceName = "firstResourceName";
    const secondResourceName = "secondResourceName";

    let newRole = addResourceToRole(role, resourceType, firstResourceName);
    newRole = addResourceToRole(newRole, resourceType, secondResourceName);

    expect(newRole.rules[0].resources[0]).toMatch(resourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(firstResourceName);
    expect(newRole.rules[0].resourceNames[1]).toMatch(secondResourceName);
});

test('test rules get added to role with existing rules of different resourceType', () => {
    const role: V1Role = createRole(team, namespace);
    const firstResourceType = "firstResourceType";
    const secondResourceType = "secondResourceType";
    const resourceName = "resourceName";

    let newRole = addResourceToRole(role, firstResourceType, resourceName);
    newRole = addResourceToRole(newRole, secondResourceType, resourceName);

    expect(newRole.rules[0].resources[0]).toMatch(firstResourceType);
    expect(newRole.rules[1].resources[0]).toMatch(secondResourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName);
    expect(newRole.rules[1].resourceNames[0]).toMatch(resourceName);
});
