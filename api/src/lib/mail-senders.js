// Which mailbox system mail is sent from, by form family.
//
// Policy set by Pranav, 25 August 2026:
//   support@perfactgroup.in  for BD, Accounts and HR
//   admin@perfactgroup.in    for everything else (TF, WPF, MPF, FQ, FR, ADM, SF, CF)
//
// The two addresses are environment variables so they can change without a
// code change. The mapping is here because it is a stated policy rather than a
// tunable value, and because a wrong sender is a visible mistake to a client.

const SUPPORT = process.env.MAIL_SENDER_SUPPORT || "";
const ADMIN = process.env.MAIL_SENDER_ADMIN || "";

// Families whose mail comes from support@. Everything else uses admin@.
const SUPPORT_FAMILIES = ["BD", "ACC", "HR"];

/**
 * Resolves the sending mailbox for a form code such as "BD01A" or "TF07".
 * Matching is on the leading letters, so BD00 through BD05 all resolve together.
 */
function senderFor(formCode) {
  const family = String(formCode || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const useSupport = SUPPORT_FAMILIES.some((f) => family.startsWith(f));
  return useSupport ? SUPPORT : ADMIN;
}

module.exports = { senderFor, SUPPORT_FAMILIES };
