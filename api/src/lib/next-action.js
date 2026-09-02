// Works out the single next thing due on a project.
//
// Derived from the steps that exist, not from the stage. A stage is a coarse
// label covering several actions: "Won and Onboarded" covers both starting
// billing and filing the handover, so a lookup keyed on the stage alone will
// tell someone to do work they have already finished. The steps know better,
// because each one reflects whether a record exists.
//
// Returns one action, never a list. A work list with three things per project
// is a list of a hundred things, which nobody reads.

const ACTIONS = {
  qualification: {
    label: "Send for qualification review",
    href: null,
    note: "Handled offline at present, so this step is skipped.",
    skippable: true,
  },
  proposal: {
    label: "Record the proposal and quote ladder",
    href: "/proposal/new.html",
  },
  commercials: {
    label: "Record the final commercials",
    href: "/commercials/new.html",
  },
  billing: {
    label: "Start billing",
    href: "/billing/start.html",
  },
  handover: {
    label: "File the technical handover",
    href: "/handover/new.html",
  },
  closure: {
    label: "File closure and the after action review",
    href: "/closure/new.html",
  },
};

/**
 * Returns the next thing genuinely due.
 *
 * NOT simply the first incomplete step. Real projects skip steps: a lead won
 * without a formal quote ladder has billing and a handover but no PBL3, and
 * telling its owner to go back and record a proposal is noise. So we find the
 * furthest step that IS done, and return the first outstanding step after it.
 * Work already overtaken by events is not work.
 */
function nextAction(steps, projectStatus) {
  if (projectStatus === "Lost") {
    return { label: "Lost", href: null, note: "No further action.", terminal: true };
  }
  if (projectStatus === "Closed") {
    return { label: "Closed", href: null, note: "No further action.", terminal: true };
  }

  const list = steps || [];

  let furthestDone = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].done) furthestDone = i;
  }

  for (let i = furthestDone + 1; i < list.length; i++) {
    const action = ACTIONS[list[i].key];
    if (!action || action.skippable) continue;
    return { ...action, forStep: list[i].key };
  }
  return null;
}

module.exports = { nextAction, ACTIONS };
