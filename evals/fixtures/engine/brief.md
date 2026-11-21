# Field notes

An offline desktop app stores notes in one process. A save transaction writes one SQLite row and must report success only after commit. Two local views refresh on successful saves. There are no other consumers and no availability target beyond the current process. Exports are user-triggered. No hosted services or telemetry.

On a representative 10,000-note dataset, loading metadata takes 12 ms, formatting the 20 visible rows takes 5 ms, and formatting all rows takes 1,900 ms. A filter toggle formats all rows. Repeated clicks can return an old filtered view after the latest result. The storage API and search semantics are public contracts.
