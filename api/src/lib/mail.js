const { graph } = require("./graph");
const { senderFor } = require("./mail-senders");

// TEST REDIRECT.
//
// While set, every message goes to this address instead of its real
// recipients, with the intended To and Cc listed at the top of the body so
// the routing can still be checked. Unset it and real delivery resumes with
// no code change.
//
// This exists because the alternative, editing addresses in five files and
// remembering to change them all back, is how a test message eventually
// reaches a client.
const REDIRECT = (process.env.MAIL_REDIRECT_ALL || "").trim();

/**
 * Sends mail as the mailbox appropriate to the form family.
 *
 * SCOPE: the app holds Mail.Send as an application permission, constrained by
 * an Exchange application access policy and an RBAC scope to the two service
 * mailboxes. See docs/ids.md.
 *
 * Mail failure never fails the operation that triggered it. A record that was
 * saved has been saved; losing a notification is a smaller problem than
 * telling someone their submission failed and having them enter it twice.
 */
async function send({ formCode, to, cc, subject, html }) {
  const sender = senderFor(formCode);
  if (!sender) {
    return { sent: false, reason: `No sending mailbox configured for ${formCode}` };
  }

  const asList = (v) => (Array.isArray(v) ? v : [v]).filter(Boolean);
  const realTo = asList(to);
  const realCc = asList(cc);

  let finalTo = realTo;
  let finalCc = realCc;
  let finalHtml = html;
  let finalSubject = subject;

  if (REDIRECT) {
    finalTo = [REDIRECT];
    finalCc = [];
    finalSubject = `[TEST] ${subject}`;
    finalHtml = `
      <div style="font-family:Arial,sans-serif;background:#fdebdc;border:1px solid #f27b21;
                  padding:12px 16px;margin-bottom:16px;font-size:13px;color:#222;">
        <strong>Test redirect.</strong> This message was not delivered to its real
        recipients. In production it would go to:<br>
        <strong>To:</strong> ${realTo.join(", ") || "nobody"}<br>
        <strong>Cc:</strong> ${realCc.join(", ") || "nobody"}<br>
        Unset MAIL_REDIRECT_ALL to deliver normally.
      </div>
      ${html}`;
  }

  const recipients = (list) =>
    list.map((address) => ({ emailAddress: { address } }));

  try {
    await graph("POST", `/users/${encodeURIComponent(sender)}/sendMail`, {
      message: {
        subject: finalSubject,
        body: { contentType: "HTML", content: finalHtml },
        toRecipients: recipients(finalTo),
        ccRecipients: recipients(finalCc),
      },
      saveToSentItems: true,
    });
    return { sent: true, sender, redirected: Boolean(REDIRECT), realTo, realCc };
  } catch (err) {
    return { sent: false, sender, reason: err.message };
  }
}

module.exports = { send };
