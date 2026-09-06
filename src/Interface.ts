/**
 * Minimal type declarations for this package's standalone tests.
 * They are not a complete or verbatim copy of Flowise's interfaces.
 * The documented installation uses Flowise's own src/Interface module.
 */

export type CommonType = string | number | boolean | undefined | null

export interface ICommonObject {
    [key: string]: any | CommonType | ICommonObject | CommonType[] | ICommonObject[]
}

export type NodeParamsType =
    | 'asyncOptions'
    | 'options'
    | 'multiOptions'
    | 'datagrid'
    | 'string'
    | 'number'
    | 'boolean'
    | 'password'
    | 'json'
    | 'code'
    | 'date'
    | 'file'
    | 'folder'
    | 'tabs'

export interface INodeOptionsValue {
    label: string
    name: string
    description?: string
    imageSrc?: string
}

export interface INodeDisplay {
    [key: string]: string[] | string
}

export interface INodeParams {
    label: string
    name: string
    type: NodeParamsType | string
    default?: CommonType | ICommonObject | ICommonObject[]
    description?: string
    warning?: string
    options?: Array<INodeOptionsValue>
    credentialNames?: Array<string>
    optional?: boolean | INodeDisplay
    placeholder?: string
    rows?: number
    list?: boolean
    additionalParams?: boolean
    hidden?: boolean
    show?: INodeDisplay
    hide?: INodeDisplay
}

export interface INodeCredential {
    label: string
    name: string
    description?: string
    inputs?: INodeParams[]
}

export interface INodeProperties {
    label: string
    name: string
    type: string
    icon: string
    version: number
    category: string
    baseClasses: string[]
    tags?: string[]
    description?: string
    filePath?: string
    badge?: string
    author?: string
    deprecateMessage?: string
}

export interface INodeData extends INodeProperties {
    id: string
    inputs?: ICommonObject
    outputs?: ICommonObject
    credential?: string
    instance?: any
    loadMethod?: string
}

export interface INode extends INodeProperties {
    credential?: INodeParams
    inputs?: INodeParams[]
    init?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<any>
    run?(nodeData: INodeData, input: string, options?: ICommonObject): Promise<string | ICommonObject>
}
