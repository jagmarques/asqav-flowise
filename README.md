# flowise-asqav

Stop a rogue agent before it acts, and prove what it tried. This Flowise custom node sends an agent action to [Asqav](https://asqav.com) for a policy decision. A permitted action returns a verifiable cryptographic receipt. A denied action is refused server-side and leaves a forensic record of the attempt, never a permissive receipt.

This package is built and maintained by the Asqav team. Asqav is the company behind the signed-receipt service the node calls. Using the node requires an Asqav API key.

## What it does

The node exposes one component, **Asqav Sign Action** (category Tools). When it runs it:

1. Reads your Asqav API key from a Flowise credential.
2. Calls the Asqav SDK: `init({ apiKey })`, `Agent.create({ name: 'flowise' })`, `agent.sign({ actionType, context })`.
3. Returns the receipt so downstream nodes can record or display it.

The SDK is HTTP-only and thin. All ML-DSA cryptography happens server-side at asqav.com. Only the values you pass in `context` are hashed into the receipt; nothing else from the flow travels.

### Inputs

- **Action Type** (string, required): the action being signed, for example `api:call` or `tool:invoke`.
- **Context** (JSON, optional): metadata describing the action. Accepts a JSON string or an object.

### Output

An object with the key receipt fields plus the full receipt:

- `signatureId`
- `actionId`
- `verificationUrl`
- `timestamp`
- `algorithm`
- `receipt` (the complete `SignatureResponse`)

## Credential setup

1. Create an Asqav API key in the Asqav dashboard at https://asqav.com.
2. In Flowise, add a credential of type **Asqav API** and paste the key into **Asqav API Key**.
3. On the **Asqav Sign Action** node, connect that credential.

## Where this lives

Flowise components run inside the Flowise monorepo. To use this node, copy it into a Flowise checkout:

- `nodes/AsqavSignAction/` -> `packages/components/nodes/tools/AsqavSignAction/`
- `credentials/AsqavApi.credential.ts` -> `packages/components/credentials/`

In the monorepo the node imports the real `src/Interface` and `src/utils` from `flowise-components`. The `src/Interface.ts` and `src/utils.ts` files in this repo are faithful local mirrors of those upstream files, included only so the node compiles and is unit tested standalone. They are not shipped into Flowise.

Add `@asqav/sdk` to `packages/components/package.json`, then build with `pnpm build` from the Flowise root. Community nodes are surfaced in the UI when `SHOW_COMMUNITY_NODES=true` is set in the Flowise `.env`.

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # vitest, mocks the SDK
```

## License

MIT
