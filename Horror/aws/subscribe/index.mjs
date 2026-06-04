import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb    = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const ses    = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });
const TABLE  = process.env.SUBSCRIBERS_TABLE || "grisham-subscribers";
const SENDER = process.env.SENDER_EMAIL      || "contact@grishamhorror.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CORS = {
  "Access-Control-Allow-Origin":  "https://grishamhorror.com",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json"
};

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS")
    return { statusCode: 204, headers: CORS, body: "" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return r(400, { error: "INVALID_PAYLOAD" }); }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 320)
    return r(400, { error: "INVALID_EMAIL" });

  // Deduplicate
  try {
    const existing = await ddb.send(new GetItemCommand({
      TableName: TABLE,
      Key: { email: { S: email } }
    }));
    if (existing.Item) return r(200, { status: "SUBSCRIBED" });
  } catch (err) {
    console.error("DDB GetItem:", err);
    return r(500, { error: "SERVICE_ERROR" });
  }

  // Store
  try {
    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        email:        { S: email },
        subscribedAt: { S: new Date().toISOString() },
        source:       { S: "vault-signup" }
      },
      ConditionExpression: "attribute_not_exists(email)"
    }));
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException")
      return r(200, { status: "SUBSCRIBED" });
    console.error("DDB PutItem:", err);
    return r(500, { error: "SERVICE_ERROR" });
  }

  // Welcome email (non-fatal if SES is still in sandbox)
  try {
    await ses.send(new SendEmailCommand({
      Source: `Grisham Horror <${SENDER}>`,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "TRANSMISSION RECEIVED — Grisham Horror", Charset: "UTF-8" },
        Body: {
          Html: { Charset: "UTF-8", Data: WELCOME_HTML },
          Text: { Charset: "UTF-8", Data: WELCOME_TEXT }
        }
      }
    }));
  } catch (err) {
    console.error("SES SendEmail (non-fatal):", err);
  }

  return r(200, { status: "SUBSCRIBED" });
};

function r(code, payload) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(payload) };
}

const WELCOME_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="background:#111;color:#d4c9b0;font-family:'Courier New',monospace;padding:2rem;max-width:560px;margin:0 auto;">
  <p style="font-size:0.65rem;letter-spacing:0.3em;color:#555;text-transform:uppercase;">// Grisham Horror // Transmission Archive //</p>
  <h1 style="font-size:1.4rem;letter-spacing:0.1em;color:#d4c9b0;text-transform:uppercase;border-bottom:1px solid #8b0000;padding-bottom:1rem;">Signal Received</h1>
  <p style="font-size:0.9rem;line-height:1.8;margin-top:1.5rem;">
    Your address has been logged in the Transmission Archive.<br><br>
    You will receive a signal when new titles are released — new fiction,
    new non-fiction, new field intelligence.<br><br>
    Nothing else. No noise. Only the signal.
  </p>
  <p style="font-size:0.75rem;color:#8b0000;margin-top:2rem;letter-spacing:0.1em;text-transform:uppercase;">— Jonathan Grisham</p>
  <hr style="border:none;border-top:1px solid #1a1a1a;margin:2rem 0;">
  <p style="font-size:0.6rem;color:#333;line-height:1.7;">
    You subscribed at <a href="https://grishamhorror.com/vault.html" style="color:#555;">grishamhorror.com</a>.<br>
    To unsubscribe, reply to this message with REMOVE in the subject line.
  </p>
</body></html>`;

const WELCOME_TEXT = `TRANSMISSION RECEIVED — Grisham Horror

Your address has been logged in the Transmission Archive.

You will receive a signal when new titles are released — new fiction, new non-fiction, new field intelligence.

Nothing else. No noise. Only the signal.

— Jonathan Grisham

---
To unsubscribe, reply with REMOVE in the subject line.
grishamhorror.com`;
