/**
 * Local mirror of the two credential helpers from Flowise's
 * `packages/components/src/utils.ts` (FlowiseAI/Flowise, main branch).
 *
 * Reproduced so the node compiles and is unit tested standalone. In the
 * monorepo the node imports the real implementations, which decrypt the
 * stored credential blob. This mirror keeps the same signatures and the
 * same precedence (nodeData.inputs overrides the stored credential).
 */

import { ICommonObject, INodeData } from './Interface'

export const getCredentialData = async (selectedCredentialId: string, options: ICommonObject): Promise<ICommonObject> => {
    // In the monorepo this resolves and decrypts the stored credential by id.
    // Standalone, the appDataSource/decrypt helpers may surface a resolver on
    // `options`; otherwise return an empty object and let the node read the
    // value from nodeData.inputs (matching upstream getCredentialParam).
    if (options && typeof options.getCredentialData === 'function') {
        return (await options.getCredentialData(selectedCredentialId)) ?? {}
    }
    return {}
}

export const getCredentialParam = (paramName: string, credentialData: ICommonObject, nodeData: INodeData): string => {
    return (nodeData.inputs?.[paramName] as string) ?? (credentialData[paramName] as string) ?? ''
}
