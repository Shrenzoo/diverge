# Illustrative decisions

These are illustrative task walkthroughs. Measured outputs from independent runs are in the [shift-desk pilot](../evals/pilot/README.md).

## A dashboard for a student

The required artifact is a dashboard. A student with 68 of 80 possible points and one 20-point assignment left needs 12 points on that assignment to reach 80% overall. A forecast inside the dashboard can answer a useful question immediately. A trend chart answers a different question. A standalone simulator would drop the dashboard requirement. Check an ungraded course and clearly label forecasts.

## A home-services landing page

A diagnosis-first flow helps visitors who do not know which service to request. A neighborhood lookup helps visitors who doubt eligibility. Choose the mechanism that addresses the best-supported barrier. Preserve the request destination, avoid invented availability, and verify that a keyboard user can proceed. If evidence is missing, ship a small reversible treatment and identify the uncertainty.

## A product trial

A startup wants to increase repeat bookings. Compare a reminder the customer requests, a saved booking draft, and a subscription proposal. The first tests timing. The second tests repeated effort. The third assumes willingness to pay and changes the purchase relationship. A trial can measure completed repeat requests with informed participation. Billing changes need explicit authorization.

## An event system

Two local views refresh after one SQLite save. Notify them after commit and reload from storage on restart. A transaction failure must leave both views unchanged. Add durable delivery only when an independently running consumer needs it. The simplest eligible mechanism can win.

## A bug, an exact edit, and a wildcard

A dead login button calls for tracing the existing action, fixing its owner, and exercising login. An exact visual reproduction preserves the reference. Both suppress redesign even under explicit invocation.

A Wildcard study brief admits a rehearsal model borrowed from musical practice: rehearse one difficult transition, observe an error, then repeat that transition. Test whether students can transfer the skill to a fresh problem. The benefit remains a hypothesis until measured.
