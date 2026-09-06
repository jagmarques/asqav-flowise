/**
 * Minimal credential substitutes for standalone tests.
 * The documented installation uses Flowise's own credential helpers.
 * These substitutes perform no credential storage or decryption.
 */

import { ICommonObject, INodeData } from './Interface'

/** Use an injected test resolver; otherwise leave credential data empty. */
export const getCredentialData = async (selectedCredentialId: string, options: ICommonObject): Promise<ICommonObject> => {
    if (options && typeof options.getCredentialData === 'function') {
        return (await options.getCredentialData(selectedCredentialId)) ?? {}
    }
    return {}
}

export const getCredentialParam = (paramName: string, credentialData: ICommonObject, nodeData: INodeData): string => {
    return (nodeData.inputs?.[paramName] as string) ?? (credentialData[paramName] as string) ?? ''
}
