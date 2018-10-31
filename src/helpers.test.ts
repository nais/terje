import { getResourceTypeFromSelfLink } from './helpers';

test('test getSelfLink gives correct resource type', () => {
    const testLinks = [
        ['pods', '/api/v1/namespaces/aura/pods/debug-68cffcddb-vrstj'],
        ['applications', '/apis/nais.io/v1alpha1/namespaces/default/applications/tiltaksgjennomforing-backend'],
    ]

    for (let link of testLinks) {
        console.log(link)
        expect(getResourceTypeFromSelfLink(link[1])).toBe(link[0])
    }
})