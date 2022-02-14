// https://nodejs.org/api/assert.html
const assert = require('assert');
import { Utils } from '@verida/client-ts';
import Credentials from '../src/credentials';
import SharingCredential from '../src/sharing-credential';
import { config, connect } from './config'


describe('Credential tests', function () {

    describe('Credential Units', function () {
        this.timeout(100000);
        let appContext;
        let shareCredential;
        let credential;

        beforeEach(async function () {
            appContext = await connect(config.PRIVATE_KEY_1);

            shareCredential = new SharingCredential(appContext);

            credential = new Credentials(appContext)
        });

        it('Verify Credential JWT was created correctly', async function () {

            const jwt: any = await credential.createCredentialJWT(config.SUBJECT_DID, config.CREDENTIAL_DATA);

            const issuer = await credential.createIssuer();

            // Decode the credential
            const decodedCredential = await credential.verifyCredential(jwt.didJwtVc)

            // Obtain the payload, that contains the verifiable credential (.vc)
            const payload = decodedCredential.payload
            const vc = payload.vc

            console.log(decodedCredential, payload, vc)

            // Verify the "Payload"
            assert.equal(payload.iss, issuer.did, 'Credential issuer matches expected DID')

            // Verify the "Verifiable Credential"
            assert.deepEqual(vc.credentialSubject, config.CREDENTIAL_DATA, 'Credential data is valid');
            assert.deepEqual(issuer.did, vc.issuer, 'Issuer matches expected DID');
            assert.equal(vc.credentialSchema.id, config.CREDENTIAL_DATA.schema, 'Credential schema is correct')
            assert.equal(vc.sub, config.SUBJECT_DID, 'Credential subject matches expected DID')

            // Verify the data matches the schema
            const record = vc.credentialSubject
            const schema = await appContext.getClient().getSchema(record.schema)
            const isValid = await schema.validate(config.CREDENTIAL_DATA);
            assert.equal(true, isValid, 'Credential subject successfully validates against the schema');

            // Note: Don't need to check the signature, because the did-jwt-vc does this for us

            // @todo: confirm vc.issuanceDate was within the last 10 seconds
            // @todo: verify the schema is actually a Verida credential schema type
            
        });
        it('Unable to create credential with invalid schema data', async function () {
            const promise = new Promise((resolve, rejects) => {
                credential.createCredentialJWT(config.SUBJECT_DID, config.INVALID_CREDENTIAL_DATA).then(rejects, resolve)
            })
            const result = await promise

            assert.deepEqual(result, new Error('Data does not match specified schema'))
        });
        it('Unable to create credential if no schema specified', async function () {
            const promise = new Promise((resolve, rejects) => {
                credential.createCredentialJWT(config.SUBJECT_DID, {}).then(rejects, resolve)
            })
            const result = await promise

            assert.deepEqual(result, new Error('No schema specified'))
        });
        it('Ensure expired expiration date is respected', async () => {
            // Set an expiry date to the past
            const expirationDate = '2000-02-14T04:27:05.467Z'
            const jwt: any = await credential.createCredentialJWT(config.SUBJECT_DID, config.CREDENTIAL_DATA, expirationDate);

            const decodedCredential = await credential.verifyCredential(jwt.didJwtVc)
            assert.equal(decodedCredential, false, 'Credential is not valid')
            assert.deepEqual(credential.getErrors(), ['Credential has expired'], 'Credential has expected error message')
        });
        it('Ensure valid expiration date is respected', async () => {
            // Set an expiry date to the future
            const expirationDate = '2060-02-14T04:27:05.467Z'

            const jwt: any = await credential.createCredentialJWT(config.SUBJECT_DID, config.CREDENTIAL_DATA, expirationDate);

            const decodedCredential = await credential.verifyCredential(jwt.didJwtVc)
            assert.ok(decodedCredential, 'Credential is valid')
        });
        /*if ('Handles invalid DID JWT', async () => {
            // @todo: handle type error
        })*/
    });
});
