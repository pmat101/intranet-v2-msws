const { graph } = require("./graph");
const { senderFor } = require("./mail-senders");

/**
 * Sends mail as the mailbox appropriate to the form family.
 *
 * SCOPE WARNING: the app holds Mail.Send as an application permission, which
 * permits sending as ANY mailbox in the tenant. It must be constrained by an
 * Exchange application access policy naming only the two service mailboxes.
 * Until that policy exists, this permission is far wider than the feature needs.
 *
 * Mail failure never fails the operation that triggered it. A record that was
 * saved has been saved; losing a notification is a smaller problem than telling
 * someone their submission failed and having them enter it twice. So this
 * reports rather than throws.
 */
async function send({ formCode, to, cc, subject, html }) {
  const sender = senderFor(formCode);
  if (!sender) {
    return {
      sent: false,
      reason: `No sending mailbox configured for ${formCode}`,
    };
  }

  const recipients = (list) =>
    (Array.isArray(list) ? list : [list])
      .filter(Boolean)
      .map((address) => ({ emailAddress: { address } }));

  try {
    await graph("POST", `/users/${encodeURIComponent(sender)}/sendMail`, {
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: recipients(to),
        ccRecipients: recipients(cc || []),
      },
      saveToSentItems: true,
    });
    return { sent: true, sender };
  } catch (err) {
    return { sent: false, sender, reason: err.message };
  }
}

module.exports = { send };
