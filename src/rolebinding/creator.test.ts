import { createRoleBindingResource } from './creator'
test('test that creating rolebinding includes ann subjects', () => {
    const subjects = [{ name: "azure-uid", type: 'Group' }, { name: "aura", type: 'User' }]
    const roleBindingToCreate = createRoleBindingResource('nais:team:aura', 'nais:team:aura', 'Role', subjects, 'default')

    console.log(roleBindingToCreate)
    expect(roleBindingToCreate.subjects.length).toBe(2)
})