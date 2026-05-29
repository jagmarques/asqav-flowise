import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Asqav SDK before importing the node.
const signMock = vi.fn()
const createMock = vi.fn()
const initMock = vi.fn()

vi.mock('@asqav/sdk', () => ({
    init: (opts: unknown) => initMock(opts),
    Agent: {
        create: (opts: unknown) => createMock(opts)
    }
}))

// The node uses `module.exports = { nodeClass }`. Under Vitest's ESM interop
// that lands on the module's default export.
import * as nodeModule from '../nodes/AsqavSignAction/AsqavSignAction'
const nodeClass = (nodeModule as any).nodeClass ?? (nodeModule as any).default?.nodeClass

describe('AsqavSignAction node', () => {
    beforeEach(() => {
        initMock.mockReset()
        createMock.mockReset()
        signMock.mockReset()
    })

    it('signs the action and returns data carrying the mocked signatureId', async () => {
        const fakeReceipt = {
            signatureId: 'sig_test_12345',
            actionId: 'act_test_67890',
            verificationUrl: 'https://asqav.com/verify/sig_test_12345',
            timestamp: '2026-05-29T00:00:00Z',
            signature: 'BASE64SIG==',
            algorithm: 'ml-dsa-65'
        }
        signMock.mockResolvedValue(fakeReceipt)
        createMock.mockResolvedValue({ sign: signMock })

        const node = new nodeClass()

        const nodeData = {
            credential: 'cred-id-1',
            inputs: {
                actionType: 'api:call',
                context: '{"model":"gpt-4"}'
            }
        }
        const options = {
            // mirror helper resolves the credential blob standalone
            getCredentialData: async () => ({ asqavApiKey: 'sk_live_xxx' })
        }

        const result: any = await node.run(nodeData, '', options)

        // SDK was wired correctly.
        expect(initMock).toHaveBeenCalledTimes(1)
        expect(createMock).toHaveBeenCalledWith({ name: 'flowise' })
        expect(signMock).toHaveBeenCalledWith({
            actionType: 'api:call',
            context: { model: 'gpt-4' }
        })

        // Returned data carries the mocked signatureId and key receipt fields.
        expect(result.signatureId).toBe('sig_test_12345')
        expect(result.actionId).toBe('act_test_67890')
        expect(result.verificationUrl).toBe('https://asqav.com/verify/sig_test_12345')
        expect(result.receipt).toEqual(fakeReceipt)
    })

    it('accepts a context object as well as a JSON string', async () => {
        signMock.mockResolvedValue({ signatureId: 'sig_obj', actionId: 'a', verificationUrl: 'u', timestamp: 't' })
        createMock.mockResolvedValue({ sign: signMock })

        const node = new nodeClass()
        const result: any = await node.run(
            { credential: 'c', inputs: { actionType: 'tool:invoke', context: { foo: 'bar' } } },
            '',
            {}
        )

        expect(signMock).toHaveBeenCalledWith({ actionType: 'tool:invoke', context: { foo: 'bar' } })
        expect(result.signatureId).toBe('sig_obj')
    })

    it('throws when actionType is missing', async () => {
        const node = new nodeClass()
        await expect(node.run({ credential: 'c', inputs: {} }, '', {})).rejects.toThrow(/Action Type/)
    })

    it('throws on invalid JSON context', async () => {
        const node = new nodeClass()
        await expect(
            node.run({ credential: 'c', inputs: { actionType: 'api:call', context: '{not json' } }, '', {})
        ).rejects.toThrow(/valid JSON/)
    })

    it('exposes the correct INode metadata', () => {
        const node = new nodeClass()
        expect(node.label).toBe('Asqav Sign Action')
        expect(node.name).toBe('asqavSignAction')
        expect(node.category).toBe('Tools')
        expect(node.credential.credentialNames).toEqual(['asqavApi'])
        expect(node.inputs.map((i: any) => i.name)).toEqual(['actionType', 'context'])
    })
})
