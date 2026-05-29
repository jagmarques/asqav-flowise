import { ICommonObject, INode, INodeData, INodeParams } from '../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../src/utils'
import { init, Agent } from '@asqav/sdk'

class AsqavSignAction_Tools implements INode {
    label: string
    name: string
    version: number
    type: string
    icon: string
    category: string
    author: string
    description: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Asqav Sign Action'
        this.name = 'asqavSignAction'
        this.version = 1.0
        this.type = 'AsqavSignAction'
        this.icon = 'asqav.svg'
        this.category = 'Tools'
        this.author = 'Asqav'
        this.description =
            'Sign an agent action with Asqav (asqav.com) and return the cryptographic compliance receipt (signature id, verification URL, timestamp).'
        this.baseClasses = [this.type]
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['asqavApi']
        }
        this.inputs = [
            {
                label: 'Action Type',
                name: 'actionType',
                type: 'string',
                placeholder: 'api:call',
                description: 'The type of action being signed, e.g. "api:call" or "tool:invoke".'
            },
            {
                label: 'Context',
                name: 'context',
                type: 'json',
                optional: true,
                description:
                    'Optional JSON metadata describing the action. Only the values you pass are hashed into the receipt.'
            }
        ]
    }

    async run(nodeData: INodeData, _input: string, options?: ICommonObject): Promise<string | ICommonObject> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options ?? {})
        const apiKey = getCredentialParam('asqavApiKey', credentialData, nodeData)

        const actionType = (nodeData.inputs?.actionType as string) ?? ''
        if (!actionType) {
            throw new Error('Asqav Sign Action: "Action Type" is required.')
        }

        let context: Record<string, unknown> = {}
        const rawContext = nodeData.inputs?.context
        if (rawContext) {
            if (typeof rawContext === 'string') {
                const trimmed = rawContext.trim()
                if (trimmed.length) {
                    try {
                        context = JSON.parse(trimmed)
                    } catch {
                        throw new Error('Asqav Sign Action: "Context" must be valid JSON.')
                    }
                }
            } else if (typeof rawContext === 'object') {
                context = rawContext as Record<string, unknown>
            }
        }

        init({ apiKey })
        const agent = await Agent.create({ name: 'flowise' })
        const receipt = await agent.sign({ actionType, context })

        return {
            signatureId: receipt.signatureId,
            actionId: receipt.actionId,
            verificationUrl: receipt.verificationUrl,
            timestamp: receipt.timestamp,
            algorithm: receipt.algorithm,
            receipt
        }
    }
}

module.exports = { nodeClass: AsqavSignAction_Tools }
