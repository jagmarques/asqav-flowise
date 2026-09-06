# flowise-asqav

Source for an Asqav signing Tool in Flowise. When invoked, it submits the configured action and context to [Asqav](https://asqav.com), then returns the signing response as JSON text. It does not execute another tool or enforce the ordering of other nodes in a flow.

An Asqav API key is required. Signing happens on the Asqav server. A returned receipt records the submitted data; it does not independently establish that the described action happened.

## Request behavior

Flowise initializes the component as a LangChain `DynamicTool` without making an Asqav request. When that tool is invoked, the component:

1. Reads an API key through the credential helpers.
2. Creates an Asqav agent named `flowise` with `POST /agents/create`.
3. Sends the action and raw context to `POST /agents/{agent_id}/sign` with `compliance_mode: true`.
4. Returns the response fields below.

A non-2xx response from either request raises an error. A failed request does not guarantee a receipt or a forensic record. The node does not inspect a successful signing response's policy decision before returning it. Whether an error prevents other actions depends on the surrounding flow.

The component creates an agent on each invocation. It uses global `fetch` and `@langchain/core` 1.1.20. The package and its development tools require Node.js 20.19+, 22.12+, or 24+; Node.js 21 and 23 are excluded.

## Inputs and data handling

- **Action Type:** required string identifying the action, such as `api:call`.
- **Context:** optional JSON string or object describing the action. The component sends this context in the request body; it does not hash or redact it locally.
- **Base URL:** Asqav API base URL, defaulting to `https://api.asqav.com/api/v1`.

The tool's input text does not change the configured action or context. The configured Base URL receives the API key and context. These requests also carry the action type and agent-creation fields described above. Other nodes and model providers handle their own traffic separately.

## Output

The tool returns JSON text containing `signatureId`, `actionId`, `verificationUrl`, `timestamp`, `algorithm`, and `receipt` (the full signing response). Fields absent from the API response are omitted by JSON serialization. These values are forwarded from the API; this component does not independently verify the receipt. A direct call to the component's `run` method returns the same data as an object.

## Installation layout

Use the source tree from this repository. Copy these paths into a Flowise checkout:

- `nodes/tools/AsqavSignAction/` -> `packages/components/nodes/tools/AsqavSignAction/`
- `credentials/AsqavApi.credential.ts` -> `packages/components/credentials/`

Keep those destinations intact: the node's imports resolve to Flowise's `packages/components/src/Interface.ts` and `src/utils.ts`. The credential imports the same upstream interface module.

The repository's `src/Interface.ts` and `src/utils.ts` are minimal substitutes for standalone tests. They do not implement Flowise credential storage or decryption and must not replace Flowise's source files. The checked Flowise revision already depends on `@langchain/core` 1.1.20. Follow the build instructions for your Flowise checkout after copying the component.

Start Flowise with `SHOW_COMMUNITY_NODES=true`; the [checked loader configuration](https://github.com/FlowiseAI/Flowise/blob/9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb/packages/server/src/AppConfig.ts) hides community nodes by default.

Connect **Asqav Sign Action** to a compatible agent or chain's **Tool** input. It is a Tools node and cannot be the sole ending node of a Chatflow. An agent may choose whether to invoke it; connecting the node does not guarantee a signing request for each action.

Verification uses [Flowise commit `9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb`](https://github.com/FlowiseAI/Flowise/tree/9291856d1ea4a4ceea9f8fef8ce14f4f6c81e8eb): the copied imports resolve, and selected upstream loader, flow-initialization, and connection functions accept the node. Those checks use isolated plumbing and do not establish a complete Flowise server, browser, model, or credential-decryption workflow.

## Credential

The included **Asqav API** credential defines an **Asqav API Key** field. Associate that credential with the component in the Flowise environment where you install it. You can obtain a key from the [Asqav dashboard](https://asqav.com).

## Development

```bash
npm ci
npm run build
npm test
```

Tests invoke the real installed LangChain Tool, intercept HTTP requests, and resolve the copied imports against a small fixture of actual upstream paths. They make no Asqav or model-provider requests.

## License

[Elastic License 2.0](LICENSE).
