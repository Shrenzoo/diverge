# Field notes

An offline desktop app stores notes in one process. A save transaction writes one SQLite row and must report success only after commit. Two local views refresh on successful saves. There are no other consumers and no availability target beyond the current process. Exports are user-triggered. No hosted services or telemetry.
