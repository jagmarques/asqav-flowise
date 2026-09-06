import { DynamicTool, Tool } from '@langchain/core/tools'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as nodeModule from '../nodes/tools/AsqavSignAction/AsqavSignAction'

const Node = (nodeModule as any).nodeClass ?? (nodeModule as any).default?.nodeClass
const data = { credential: 'test-credential', inputs: { actionType: 'api:call', context: { sensitive: 'raw value' } } }
const response = { signature_id: 'test-signature', action_id: 'test-action', policy_decision: 'deny' }
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function succeed() {
    fetchMock.mockResolvedValueOnce(Response.json({ agent_id: 'test-agent' }))
        .mockResolvedValueOnce(Response.json(response))
}

it('initializes a real Tool without requests, then serializes the unchanged run result on invocation', async () => {
    const credentials = vi.fn(async () => ({ asqavApiKey: 'test-only-key' }))
    const node = new Node()
    const tool = await node.init(data, 'initial question', { getCredentialData: credentials })
    expect(tool).toBeInstanceOf(DynamicTool)
    expect(tool).toBeInstanceOf(Tool)
    expect(node.baseClasses).toContain('Tool')
    expect(credentials).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()

    succeed()
    const content = await tool.invoke('agent text is not the configured context')
    expect(typeof content).toBe('string')
    expect(JSON.parse(content)).toEqual({ signatureId: 'test-signature', actionId: 'test-action', receipt: response })
    expect(credentials).toHaveBeenCalledWith('test-credential')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers['X-API-Key']).toBe('test-only-key')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        action_type: 'api:call', context: data.inputs.context, session_id: null, compliance_mode: true
    })

    succeed()
    const direct = await node.run(data, 'direct call', { getCredentialData: credentials })
    expect(JSON.stringify(direct)).toBe(content)
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/agents/create'))).toHaveLength(2)
})

it.each(['create', 'sign'])('rejects an HTTP error during %s instead of returning tool content', async stage => {
    const tool = await new Node().init(data, '')
    expect(fetchMock).not.toHaveBeenCalled()
    if (stage === 'sign') fetchMock.mockResolvedValueOnce(Response.json({ agent_id: 'test-agent' }))
    fetchMock.mockResolvedValueOnce(new Response('denied', { status: 403, statusText: 'Forbidden' }))
    await expect(tool.invoke('')).rejects.toThrow(`${stage === 'create' ? 'agent create' : 'sign'} failed (403 Forbidden): denied`)
    expect(fetchMock).toHaveBeenCalledTimes(stage === 'create' ? 1 : 2)
})

it('propagates transport errors from invocation', async () => {
    const tool = await new Node().init(data, '')
    fetchMock.mockRejectedValueOnce(new Error('test transport failure'))
    await expect(tool.invoke('')).rejects.toThrow('test transport failure')
})

it('validates the configured action when invoked, without making a request', async () => {
    const tool = await new Node().init({ inputs: {} }, '')
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(tool.invoke('api:call')).rejects.toThrow('"Action Type" is required')
    expect(fetchMock).not.toHaveBeenCalled()
})

it('keeps whitespace-only configured context empty', async () => {
    const tool = await new Node().init({ inputs: { actionType: 'api:call', context: '  ' } }, '')
    succeed()
    await tool.invoke('not a substitute context')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).context).toEqual({})
})

it.each(['create', 'sign'])('retains the status if the %s error body cannot be read', async stage => {
    const tool = await new Node().init(data, '')
    if (stage === 'sign') fetchMock.mockResolvedValueOnce(Response.json({ agent_id: 'test-agent' }))
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden', text: async () => { throw Error('body unavailable') } })
    await expect(tool.invoke('')).rejects.toThrow(`${stage === 'create' ? 'agent create' : 'sign'} failed (403 Forbidden)`)
})
