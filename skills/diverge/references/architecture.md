# Architecture decisions

Write the invariant and its owner before naming a pattern. Trace the successful path and a partial failure. Identify latency constraints, consistency needs, ordering, durability, retries, concurrency, load, and operating budget. Mark unmeasured load as unknown.

For an event system, first try a direct call when one process needs a result now. Compare in-process fan-out when independent local reactions share lifetime. Consider a queue only when delivery must survive failure or consumers need independent throughput. Durable messaging adds replay, duplicate handling, observability, and operations.

Test the choice against a consumer failure and restart. Name the requirement that would justify the next architecture. Preserve existing contracts, migration safety, and proven security primitives. Demonstrate performance gains with a representative measurement when possible.
