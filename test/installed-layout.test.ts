import { readFileSync } from 'node:fs'
import { posix, resolve } from 'node:path'
import ts from 'typescript'
import { expect, it } from 'vitest'

import layout from './fixtures/flowise-layout.json'

it('resolves the node imports at the README destination in the pinned Flowise layout', () => {
    // The fixture lists real upstream paths, not substitute module definitions.
    // This checks installation layout, not Flowise types or runtime dispatch.
    const readme = readFileSync(resolve(__dirname, '../README.md'), 'utf8')
    const mapping = readme.match(/`(nodes\/[^`]+\/)` -> `(packages\/components\/[^`]+\/)`/)
    expect(mapping, 'README must identify the source and Flowise destination').not.toBeNull()
    const source = readFileSync(resolve(__dirname, '..', mapping![1], 'AsqavSignAction.ts'), 'utf8')
    const destination = '/flowise/' + mapping![2] + 'AsqavSignAction.ts'
    const imports = ts.preProcessFile(source).importedFiles.map(entry => entry.fileName).filter(name => name.startsWith('.'))
    expect(imports).toHaveLength(2)
    const files = new Set(layout.files.map(file => '/flowise/' + file))
    const host: ts.ModuleResolutionHost = {
        fileExists: file => files.has(file),
        readFile: () => '',
        directoryExists: directory => [...files].some(file => file.startsWith(directory.replace(/\/$/, '') + '/'))
    }
    for (const specifier of imports) {
        const result = ts.resolveModuleName(specifier, destination, {
            moduleResolution: ts.ModuleResolutionKind.Node10
        }, host).resolvedModule
        expect(result, `${specifier} must resolve at the documented Flowise destination`).toBeDefined()
        expect(result!.resolvedFileName).toBe('/flowise/packages/components/src/' + posix.basename(specifier) + '.ts')
    }
})
