export interface Sample {
  id: string;
  label: string;
  note: string;
  manifest: string;
}

const SUPPORT_TRIAGE: Sample = {
  id: "support",
  label: "Support triage",
  note: "Mail, notes and chat in one agent. The most common shape, and the one with the most open legs.",
  manifest: JSON.stringify(
    {
      agent: "support-triage",
      description: "Reads the support inbox, drafts replies and files notes.",
      logging: false,
      env: ["GMAIL_TOKEN", "NOTION_TOKEN", "SLACK_BOT_TOKEN"],
      servers: [
        {
          name: "gmail",
          transport: "stdio",
          tools: [
            {
              name: "search_messages",
              description: "Search the support mailbox for messages matching a query.",
              scopes: ["gmail.readonly"],
              approval: "auto",
            },
            {
              name: "get_message",
              description: "Read the full body and attachments of an email message.",
              scopes: ["gmail.readonly"],
              approval: "auto",
            },
            {
              name: "send_email",
              description: "Send a reply to a customer, including attachments.",
              scopes: ["gmail.send"],
              approval: "auto",
            },
          ],
        },
        {
          name: "notion",
          transport: "http",
          tools: [
            {
              name: "search_pages",
              description: "Search the internal knowledge base for policy pages.",
              scopes: ["read_content"],
              approval: "auto",
            },
            {
              name: "update_page",
              description: "Update or archive a page in the customer workspace.",
              scopes: ["write_content", "*"],
              approval: "auto",
            },
          ],
        },
        {
          name: "slack",
          transport: "http",
          tools: [
            {
              name: "post_message",
              description: "Post a message to a channel or DM a teammate.",
              scopes: ["chat:write"],
              approval: "auto",
            },
          ],
        },
        {
          name: "ops",
          transport: "stdio",
          tools: [
            {
              name: "run_command",
              description: "Run a shell command on the support host for diagnostics.",
              scopes: ["exec"],
              approval: "auto",
            },
            {
              name: "read_env",
              description: "Read an environment variable or secret from the host.",
              scopes: ["secrets:read"],
              approval: "auto",
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
};

const RESEARCH: Sample = {
  id: "research",
  label: "Research digest",
  note: "Fetches public pages and writes a summary. Narrow grants, still worth checking.",
  manifest: JSON.stringify(
    {
      agent: "research-digest",
      description: "Collects public pages on a topic and writes a weekly digest.",
      logging: { enabled: true, destination: "s3://agent-audit/research" },
      servers: [
        {
          name: "web",
          transport: "stdio",
          tools: [
            {
              name: "fetch_url",
              description: "Download a public web page or PDF for reading.",
              scopes: ["net:read"],
              approval: "auto",
            },
            {
              name: "web_search",
              description: "Search the web and return candidate results.",
              scopes: ["net:read"],
              approval: "auto",
            },
          ],
        },
        {
          name: "files",
          transport: "stdio",
          tools: [
            {
              name: "write_file",
              description: "Write the finished digest to the local reports folder.",
              scopes: ["fs:write:/reports"],
              approval: "required",
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
};

const PAYMENTS: Sample = {
  id: "payments",
  label: "Billing assistant",
  note: "Handles refunds and invoice queries, with credential access.",
  manifest: JSON.stringify(
    {
      agent: "billing-assistant",
      description: "Looks up invoices, answers billing questions and issues refunds.",
      logging: { enabled: true, destination: "stdout" },
      servers: [
        {
          name: "stripe",
          transport: "http",
          tools: [
            {
              name: "list_invoices",
              description: "List invoices and customer billing records.",
              scopes: ["invoices:read"],
              approval: "auto",
            },
            {
              name: "refund_charge",
              description: "Issue a refund against a charge, with a payment amount.",
              scopes: ["charges:write"],
              approval: "auto",
            },
          ],
        },
        {
          name: "secrets",
          transport: "stdio",
          tools: [
            {
              name: "get_api_key",
              description: "Read the live Stripe API key from the vault.",
              scopes: ["secrets:read"],
              approval: "auto",
            },
            {
              name: "http_post",
              description: "Send an outbound webhook request to an external endpoint.",
              scopes: ["net:egress"],
              approval: "auto",
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
};

export const SAMPLES: Sample[] = [SUPPORT_TRIAGE, RESEARCH, PAYMENTS];

export const DEFAULT_SAMPLE = SUPPORT_TRIAGE;
