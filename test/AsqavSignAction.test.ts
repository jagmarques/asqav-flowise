import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import * as nodeModule from '../nodes/AsqavSignAction/AsqavSignAction'
const nodeClass = (nodeModule as any).nodeClass ?? (nodeModule as any).default?.nodeClass

const DEFAULT_BASE = 'https://api.asqav.com/api/v1'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
    })
}

describe('AsqavSignAction node', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('posts to create then sign and maps the snake_case response to receipt fields', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ agent_id: 'agent_1', name: 'flowise', public_key: 'pk' }))
            .mockResolvedValueOnce(
                jsonResponse({
                    signature: 'BASE64SIG==',
                    signature_id: 'sig_test_12345',
                    action_id: 'act_test_67890',
                    verification_url: 'https://asqav.com/verify/sig_test_12345',
                    timestamp: '2026-05-29T00:00:00Z',
                    algorithm: 'ml-dsa-65'
                })
            )

        const node = new nodeClass()

        const result: any = await node.run(
            {
                credential: 'cred-id-1',
                inputs: { actionType: 'api:call', context: '{"model":"gpt-4"}' }
            },
            '',
            { getCredentialData: async () => ({ asqavApiKey: 'sk_live_xxx' }) }
        )

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            `${DEFAULT_BASE}/agents/create`,
            expect.objectContaining({
                method: 'POST',
                headers: { 'X-API-Key': 'sk_live_xxx', 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'flowise', algorithm: 'ml-dsa-65', capabilities: [] })
            })
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `${DEFAULT_BASE}/agents/agent_1/sign`,
            expect.objectContaining({
                method: 'POST',
                headers: { 'X-API-Key': 'sk_live_xxx', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action_type: 'api:call',
                    context: { model: 'gpt-4' },
                    session_id: null,
                    compliance_mode: true
                })
            })
        )

        expect(result.signatureId).toBe('sig_test_12345')
        expect(result.actionId).toBe('act_test_67890')
        expect(result.verificationUrl).toBe('https://asqav.com/verify/sig_test_12345')
        expect(result.timestamp).toBe('2026-05-29T00:00:00Z')
        expect(result.algorithm).toBe('ml-dsa-65')
        expect(result.receipt.signature_id).toBe('sig_test_12345')
    })

    it('accepts a context object as well as a JSON string', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ agent_id: 'agent_1' }))
            .mockResolvedValueOnce(
                jsonResponse({
                    signature_id: 'sig_obj',
                    action_id: 'a',
                    verification_url: 'u',
                    timestamp: 't',
                    algorithm: 'ml-dsa-65'
                })
            )

        const node = new nodeClass()
        const result: any = await node.run(
            { credential: 'c', inputs: { actionType: 'tool:invoke', context: { foo: 'bar' } } },
            '',
            {}
        )

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `${DEFAULT_BASE}/agents/agent_1/sign`,
            expect.objectContaining({
                body: JSON.stringify({
                    action_type: 'tool:invoke',
                    context: { foo: 'bar' },
                    session_id: null,
                    compliance_mode: true
                })
            })
        )
        expect(result.signatureId).toBe('sig_obj')
    })

    it('honours a custom baseUrl and strips trailing slashes', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ agent_id: 'agent_9' }))
            .mockResolvedValueOnce(jsonResponse({ signature_id: 'sig_x', action_id: 'a_x', timestamp: 't', algorithm: 'ml-dsa-65' }))

        const node = new nodeClass()
        await node.run(
            { credential: 'c', inputs: { actionType: 'api:call', baseUrl: 'https://staging.example.com/api/v1//' } },
            '',
            { getCredentialData: async () => ({ asqavApiKey: 'sk_test_yyy' }) }
        )

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            'https://staging.example.com/api/v1/agents/create',
            expect.objectContaining({ method: 'POST' })
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            'https://staging.example.com/api/v1/agents/agent_9/sign',
            expect.objectContaining({ method: 'POST' })
        )
    })

    it('throws when agent create returns a non-OK status', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'bad key' }, { status: 401, statusText: 'Unauthorized' }))

        const node = new nodeClass()
        await expect(node.run({ credential: 'c', inputs: { actionType: 'api:call' } }, '', {})).rejects.toThrow(
            /agent create failed \(401 Unauthorized\)/
        )
    })

    it('throws when sign returns a non-OK status', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ agent_id: 'agent_1' }))
            .mockResolvedValueOnce(jsonResponse({ detail: 'invalid' }, { status: 400, statusText: 'Bad Request' }))

        const node = new nodeClass()
        await expect(node.run({ credential: 'c', inputs: { actionType: 'api:call' } }, '', {})).rejects.toThrow(
            /sign failed \(400 Bad Request\)/
        )
    })

    it('throws when actionType is missing', async () => {
        const node = new nodeClass()
        await expect(node.run({ credential: 'c', inputs: {} }, '', {})).rejects.toThrow(/Action Type/)
    })

    it('throws on invalid JSON context', async () => {
        const node = new nodeClass()
        await expect(node.run({ credential: 'c', inputs: { actionType: 'api:call', context: '{not json' } }, '', {})).rejects.toThrow(
            /valid JSON/
        )
    })

    it('exposes the correct INode metadata', () => {
        const node = new nodeClass()
        expect(node.label).toBe('Asqav Sign Action')
        expect(node.name).toBe('asqavSignAction')
        expect(node.category).toBe('Tools')
        expect(node.credential.credentialNames).toEqual(['asqavApi'])
        expect(node.inputs.map((i: any) => i.name)).toEqual(['actionType', 'context', 'baseUrl'])
    })
})
