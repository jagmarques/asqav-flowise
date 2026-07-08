// Package entry. Flowise itself loads nodes by directory scan, so this re-export
// only serves a plain require of the package and programmatic discovery.
import { INode, INodeCredential } from './Interface'
import signAction = require('../nodes/AsqavSignAction/AsqavSignAction')
import asqavApi = require('../credentials/AsqavApi.credential')

export const nodeClass = (signAction as { nodeClass: new () => INode }).nodeClass
export const credClass = (asqavApi as { credClass: new () => INodeCredential }).credClass
