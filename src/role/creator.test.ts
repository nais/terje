import {addResourceToRole, createRole, removeResourceFromRole} from './creator';
import {V1Role} from '@kubernetes/client-node';

const team = 'unittest';
const roleName = `team-${team}`;
const namespace = 'namespace';

test('test created role has correct metadata', () => {
    const role: V1Role = createRole(roleName, namespace);

    expect(role.metadata.name).toMatch(roleName);
    expect(role.metadata.namespace).toMatch(namespace);
});

test('test rules get added to role with no previous rules', () => {
    const role: V1Role = createRole(roleName, namespace);
    const resourceType = 'resourceType';
    const resourceName = 'resourceName';

    let newRole = addResourceToRole(role, resourceType, resourceName);

    expect(newRole.rules[0].resources[0]).toMatch(resourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName);
});

test('test rules get added to role with existing rules of same resourceType', () => {
    const role: V1Role = createRole(roleName, namespace);
    const resourceType = 'resourceType';
    const firstResourceName = 'firstResourceName';
    const secondResourceName = 'secondResourceName';

    let newRole = addResourceToRole(role, resourceType, firstResourceName);
    newRole = addResourceToRole(newRole, resourceType, secondResourceName);

    expect(newRole.rules[0].resources[0]).toMatch(resourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(firstResourceName);
    expect(newRole.rules[0].resourceNames[1]).toMatch(secondResourceName);
});

test('test rules get added to role with existing rules of different resourceType', () => {
    const role: V1Role = createRole(roleName, namespace);
    const firstResourceType = 'firstResourceType';
    const secondResourceType = 'secondResourceType';
    const resourceName = 'resourceName';

    let newRole = addResourceToRole(role, firstResourceType, resourceName);
    newRole = addResourceToRole(newRole, secondResourceType, resourceName);

    expect(newRole.rules[0].resources[0]).toMatch(firstResourceType);
    expect(newRole.rules[1].resources[0]).toMatch(secondResourceType);
    expect(newRole.rules[0].resourceNames[0]).toMatch(resourceName);
    expect(newRole.rules[1].resourceNames[0]).toMatch(resourceName);
});

test('test adding already existing rule changes nothing and return correct bool', () => {
    const role: V1Role = createRole(roleName, namespace);
    const resourceType = 'resourceType';
    const resourceName = 'resourceName';

    let newRole = addResourceToRole(role, resourceType, resourceName);
    expect(newRole.rules).toHaveLength(1);
    expect(newRole.rules[0].resourceNames).toHaveLength(1);
    expect(newRole.rules[0].resources).toHaveLength(1);

    newRole = addResourceToRole(role, resourceType, resourceName);
    expect(newRole.rules).toHaveLength(1);
    expect(newRole.rules[0].resourceNames).toHaveLength(1);
    expect(newRole.rules[0].resources).toHaveLength(1);
});

test('test removing resource from role', () => {
    const resourceType = 'resourceType';
    const resourceName = 'resourceName';
    const resourceName2 = 'resourceName2';
    let role = createRole(roleName, namespace);

    role = addResourceToRole(role, resourceType, resourceName);
    role = addResourceToRole(role, resourceType, resourceName2);
    role = removeResourceFromRole(role, resourceType, resourceName);

    expect(role.rules).toHaveLength(1);
    expect(role.rules[0].resourceNames).toHaveLength(1);
    expect(role.rules[0].resources).toHaveLength(1);

    expect(role.rules[0].resources[0]).toEqual(resourceType);
    expect(role.rules[0].resourceNames[0]).toEqual(resourceName2);
});

test('test removing last resource from role', () => {
    const resourceType = 'resourceType';
    const resourceName = 'resourceName';

    let role = createRole(roleName, namespace);

    role = addResourceToRole(role, resourceType, resourceName);
    role = removeResourceFromRole(role, resourceType, resourceName);

    expect(role.rules).toHaveLength(0);
});

test('test removing resource from role when multiple resourceTypes', () => {
    const resourceType = 'resourceType';
    const resourceType2 = 'resourceType2';
    const resourceName = 'resourceName';

    let role = createRole(roleName, namespace);

    role = addResourceToRole(role, resourceType, resourceName);
    role = addResourceToRole(role, resourceType2, resourceName);
    role = removeResourceFromRole(role, resourceType, resourceName);

    expect(role.rules).toHaveLength(1);
    expect(role.rules[0].resources[0]).toEqual(resourceType2);
    expect(role.rules[0].resourceNames[0]).toEqual(resourceName);
});
